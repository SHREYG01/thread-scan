#include "Benchmark.h"
#include "DuplicateDetector.h"
#include <thread>
#include <chrono>
#include <algorithm>
#include <ctime>

namespace ThreadScan {

BenchmarkResult BenchmarkSuite::run(
    DuplicateDetector* detector,
    const std::string& directory,
    int maxThreads,
    std::function<void(const std::string&, const std::string&, const std::string&)> logCallback
) {
    BenchmarkResult result;

    // ISO timestamp
    auto now = std::chrono::system_clock::now();
    std::time_t tt = std::chrono::system_clock::to_time_t(now);
    char buf[64];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", std::gmtime(&tt));
    result.timestamp = buf;
    result.directory = directory;

    std::vector<int> threadCounts = {1, 2, 4, 8};

    if (logCallback) {
        logCallback("system", "info", "Starting benchmark suite on " + directory +
            " across thread counts: 1, 2, 4, 8.");
    }

    uint64_t singleTimeMs = 0;
    std::unique_ptr<DuplicateDetector> fallbackDetector;
    DuplicateDetector* actualDetector = detector;
    if (!actualDetector) {
        fallbackDetector = std::make_unique<DuplicateDetector>();
        actualDetector = fallbackDetector.get();
    }

    for (int tCount : threadCounts) {
        if (logCallback) {
            logCallback("worker", "info", "Benchmarking concurrency: " + std::to_string(tCount) +
                (tCount == 1 ? " thread (baseline sequential)" : " threads"));
        }

        ScanConfig cfg;
        cfg.targetDirectory = directory;
        cfg.mode = (tCount == 1) ? "single" : "multi";
        cfg.threadCount = tCount;
        cfg.minFileSizeBytes = 1;

        auto tStart = std::chrono::high_resolution_clock::now();
        actualDetector->runScan(cfg, nullptr);
        auto tEnd = std::chrono::high_resolution_clock::now();

        uint64_t duration = std::chrono::duration_cast<std::chrono::milliseconds>(tEnd - tStart).count();
        if (duration == 0) duration = 1; // avoid divide-by-zero for tiny datasets

        ScanMetrics metrics = actualDetector->getMetrics();
        if (tCount == 1) {
            singleTimeMs = duration;
            result.totalFiles = metrics.filesDiscovered;
            result.totalBytes = metrics.bytesProcessed;
            result.singleThreadMs = duration;
        }

        double speedup = static_cast<double>(singleTimeMs) / static_cast<double>(duration);
        double efficiency = (speedup / static_cast<double>(tCount)) * 100.0;

        BenchmarkPoint pt;
        pt.threads = tCount;
        pt.durationMs = duration;
        pt.speedup = speedup;
        pt.efficiency = efficiency;
        pt.throughputMBs = metrics.throughputMBs;
        pt.filesProcessed = metrics.filesProcessed;
        pt.bytesProcessed = metrics.bytesProcessed;
        pt.duplicateGroups = metrics.duplicateGroups;
        pt.duplicateFiles = metrics.duplicateFiles;

        result.points.push_back(pt);

        if (tCount == 4) {
            result.multiThreadMs = duration;
            result.speedup = speedup;
            result.efficiency = efficiency;
        }

        if (logCallback) {
            logCallback("pipeline", "info", "Completed " + std::to_string(tCount) +
                "T benchmark: " + std::to_string(duration) + " ms, speedup=" +
                std::to_string(speedup).substr(0, 4) + "x, efficiency=" +
                std::to_string(efficiency).substr(0, 4) + "%");
        }
    }

    if (result.multiThreadMs == 0 && !result.points.empty()) {
        result.multiThreadMs = result.points.back().durationMs;
        result.speedup = result.points.back().speedup;
        result.efficiency = result.points.back().efficiency;
    }

    if (logCallback) {
        logCallback("system", "info", "Benchmark suite complete. Baseline 1T: " +
            std::to_string(result.singleThreadMs) + " ms, 4T: " +
            std::to_string(result.multiThreadMs) + " ms (" +
            std::to_string(result.speedup).substr(0, 4) + "x speedup)");
    }

    return result;
}

} // namespace ThreadScan
