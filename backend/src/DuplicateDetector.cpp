#include "DuplicateDetector.h"
#include <chrono>
#include <iomanip>
#include <sstream>

namespace ThreadScan {

DuplicateDetector::DuplicateDetector() {
    m_lastWorkerStates.resize(4);
    for (size_t i = 0; i < 4; ++i) {
        std::ostringstream ss;
        ss << "THREAD " << std::setfill('0') << std::setw(2) << (i + 1);
        m_lastWorkerStates[i].id = static_cast<int>(i + 1);
        m_lastWorkerStates[i].label = ss.str();
        m_lastWorkerStates[i].status = WorkerStatus::IDLE;
        m_lastWorkerStates[i].currentFile = "Awaiting task dispatch";
        m_lastWorkerStates[i].filesProcessed = 0;
        m_lastWorkerStates[i].bytesProcessed = 0;
        m_lastWorkerStates[i].elapsedTimeMs = 0;
    }
}

void DuplicateDetector::stop() {
    m_stopRequested.store(true);
}

ScanMetrics DuplicateDetector::getMetrics() const {
    ScanMetrics m;
    m.filesDiscovered = m_filesDiscovered.load();
    m.filesProcessed = m_filesProcessed.load();
    m.bytesProcessed = m_bytesProcessed.load();
    m.duplicateGroups = m_duplicateGroupsCount.load();
    m.duplicateFiles = m_duplicateFilesCount.load();
    m.wastedBytes = m_wastedBytes.load();
    m.elapsedMs = m_elapsedMs.load();

    if (m.elapsedMs > 0) {
        double seconds = static_cast<double>(m.elapsedMs) / 1000.0;
        double mb = static_cast<double>(m.bytesProcessed) / (1024.0 * 1024.0);
        m.throughputMBs = mb / seconds;
    }
    return m;
}

std::vector<WorkerThreadState> DuplicateDetector::getWorkerStates() const {
    std::lock_guard<std::mutex> lock(m_poolMutex);
    if (m_activePool) {
        return m_activePool->getWorkerStates();
    }
    return m_lastWorkerStates;
}

std::vector<DuplicateGroup> DuplicateDetector::runScan(
    const ScanConfig& config,
    std::function<void(const std::string&, const std::string&, const std::string&)> logCallback
) {
    m_stopRequested.store(false);
    m_filesDiscovered.store(0);
    m_filesProcessed.store(0);
    m_bytesProcessed.store(0);
    m_duplicateGroupsCount.store(0);
    m_duplicateFilesCount.store(0);
    m_wastedBytes.store(0);
    m_elapsedMs.store(0);

    auto startTime = std::chrono::high_resolution_clock::now();

    if (logCallback) {
        logCallback("scanner", "info", "Stage 1: Recursive directory scan initiated on " + config.targetDirectory);
    }

    // STAGE 1: Collect files and group by file size
    FileScanner scanner(m_filesDiscovered);
    auto sizeGroups = scanner.scanDirectory(config.targetDirectory, config.minFileSizeBytes);

    if (m_stopRequested.load()) {
        if (logCallback) logCallback("scanner", "warn", "Scan aborted by user.");
        return {};
    }

    if (logCallback) {
        logCallback("scanner", "info", "Stage 1 complete: Discovered " +
            std::to_string(m_filesDiscovered.load()) + " files. Filtering candidate size groups...");
    }

    // Filter candidate files: only sizes with >= 2 files could be duplicates!
    std::vector<FileEntry> candidates;
    for (const auto& [size, files] : sizeGroups) {
        if (files.size() > 1) {
            candidates.insert(candidates.end(), files.begin(), files.end());
        }
    }

    if (logCallback) {
        logCallback("scanner", "info", "Stage 2: Found " +
            std::to_string(candidates.size()) + " candidate files requiring cryptographic SHA-256 hashing.");
    }

    // Map: (file_size, sha256_hash) -> vector of FileEntry
    struct GroupKey {
        uint64_t size;
        std::string hash;
        bool operator==(const GroupKey& o) const {
            return size == o.size && hash == o.hash;
        }
    };

    struct KeyHasher {
        size_t operator()(const GroupKey& k) const {
            return std::hash<uint64_t>()(k.size) ^ (std::hash<std::string>()(k.hash) << 1);
        }
    };

    std::unordered_map<GroupKey, std::vector<FileEntry>, KeyHasher> hashGroups;
    std::mutex hashGroupsMutex;

    FileHasher hasher(m_bytesProcessed);

    bool isSingle = (config.mode == "single" || config.threadCount <= 1);
    size_t threadCount = isSingle ? 1 : static_cast<size_t>(config.threadCount);

    {
        std::lock_guard<std::mutex> lock(m_poolMutex);
        m_activePool = std::make_unique<ThreadPool>(threadCount);
    }

    if (isSingle) {
        // Genuine sequential execution mode
        if (logCallback) {
            logCallback("scanner", "info", "Executing in SINGLE THREAD sequential mode.");
        }

        for (const auto& file : candidates) {
            if (m_stopRequested.load()) break;

            auto tStart = std::chrono::high_resolution_clock::now();
            {
                std::lock_guard<std::mutex> lock(m_poolMutex);
                if (m_activePool) {
                    m_activePool->recordTaskStart(1, file.path);
                }
            }

            std::string hash = hasher.hashFileSha256(file.path);
            auto tEnd = std::chrono::high_resolution_clock::now();
            uint64_t elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(tEnd - tStart).count();

            if (!hash.empty()) {
                GroupKey key{file.sizeBytes, hash};
                hashGroups[key].push_back(file);
            }
            m_filesProcessed.fetch_add(1);

            {
                std::lock_guard<std::mutex> lock(m_poolMutex);
                if (m_activePool) {
                    m_activePool->recordTaskFinish(1, file.sizeBytes, elapsed, file.path);
                }
            }
        }
    } else {
        // Multi-threaded worker pool execution
        if (logCallback) {
            logCallback("pipeline", "info", "Dispatched " + std::to_string(candidates.size()) +
                " file hashing tasks across " + std::to_string(threadCount) + " worker threads.");
        }

        for (const auto& file : candidates) {
            if (m_stopRequested.load()) break;

            m_activePool->enqueue([&, file](int workerId) {
                if (m_stopRequested.load()) return;

                auto tStart = std::chrono::high_resolution_clock::now();
                m_activePool->recordTaskStart(workerId, file.path);

                std::string hash = hasher.hashFileSha256(file.path);

                auto tEnd = std::chrono::high_resolution_clock::now();
                uint64_t elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(tEnd - tStart).count();

                if (!hash.empty()) {
                    std::lock_guard<std::mutex> lock(hashGroupsMutex);
                    GroupKey key{file.sizeBytes, hash};
                    hashGroups[key].push_back(file);
                }

                m_filesProcessed.fetch_add(1);
                m_activePool->recordTaskFinish(workerId, file.sizeBytes, elapsed, file.path);
            });
        }

        m_activePool->waitAll();
    }

    // Finalize worker states & record final snapshot
    {
        std::lock_guard<std::mutex> lock(m_poolMutex);
        if (m_activePool) {
            m_activePool->finalizeScanStates();
            m_lastWorkerStates = m_activePool->getWorkerStates();
            m_activePool.reset();
        }
    }

    // Assemble final duplicate groups
    std::vector<DuplicateGroup> results;
    int groupIndex = 1;

    for (const auto& [key, files] : hashGroups) {
        if (files.size() > 1) {
            DuplicateGroup dg;
            std::ostringstream ss;
            ss << "GRP-" << std::setfill('0') << std::setw(3) << groupIndex++;
            dg.id = ss.str();
            dg.hash = key.hash;
            dg.sizeBytes = key.size;
            dg.fileCount = static_cast<uint32_t>(files.size());

            for (const auto& f : files) {
                DuplicateFileItem item;
                item.path = f.path;
                item.size = f.sizeBytes;
                item.modifiedAt = f.modifiedAt;
                dg.files.push_back(std::move(item));
            }

            m_duplicateGroupsCount.fetch_add(1);
            m_duplicateFilesCount.fetch_add(static_cast<uint32_t>(files.size()));
            m_wastedBytes.fetch_add(key.size * (files.size() - 1));

            results.push_back(std::move(dg));
        }
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    uint64_t elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime).count();
    m_elapsedMs.store(elapsed);

    if (logCallback) {
        logCallback("scanner", "info", "Scan completed in " + std::to_string(elapsed) + " ms. Found " +
            std::to_string(results.size()) + " duplicate groups.");
    }

    return results;
}

} // namespace ThreadScan
