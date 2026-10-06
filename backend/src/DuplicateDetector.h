#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <atomic>
#include <mutex>
#include <memory>
#include "Models.h"
#include "ThreadPool.h"
#include "FileScanner.h"
#include "FileHasher.h"

namespace ThreadScan {

class DuplicateDetector {
public:
    DuplicateDetector();

    // Runs a full scan based on configuration
    std::vector<DuplicateGroup> runScan(
        const ScanConfig& config,
        std::function<void(const std::string& source, const std::string& level, const std::string& msg)> logCallback = nullptr
    );

    // Stop requested scan
    void stop();

    // Telemetry getters
    ScanMetrics getMetrics() const;
    std::vector<WorkerThreadState> getWorkerStates() const;

private:
    std::atomic<bool> m_stopRequested{false};
    std::atomic<uint64_t> m_filesDiscovered{0};
    std::atomic<uint64_t> m_filesProcessed{0};
    std::atomic<uint64_t> m_bytesProcessed{0};
    std::atomic<uint32_t> m_duplicateGroupsCount{0};
    std::atomic<uint32_t> m_duplicateFilesCount{0};
    std::atomic<uint64_t> m_wastedBytes{0};
    std::atomic<uint64_t> m_elapsedMs{0};

    std::unique_ptr<ThreadPool> m_activePool;
    mutable std::mutex m_poolMutex;
    std::vector<WorkerThreadState> m_lastWorkerStates;
};

} // namespace ThreadScan
