#pragma once

#include <string>
#include <vector>
#include <cstdint>
#include <chrono>

namespace ThreadScan {

enum class ScanStatus {
    IDLE,
    SCANNING,
    COMPLETED,
    ERROR
};

inline std::string scanStatusToString(ScanStatus s) {
    switch (s) {
        case ScanStatus::IDLE: return "idle";
        case ScanStatus::SCANNING: return "scanning";
        case ScanStatus::COMPLETED: return "completed";
        case ScanStatus::ERROR: return "error";
    }
    return "idle";
}

enum class WorkerStatus {
    IDLE,
    WAITING,
    READING,
    HASHING,
    COMPLETED,
    ERROR
};

inline std::string workerStatusToString(WorkerStatus s) {
    switch (s) {
        case WorkerStatus::IDLE: return "idle";
        case WorkerStatus::WAITING: return "waiting";
        case WorkerStatus::READING: return "reading";
        case WorkerStatus::HASHING: return "hashing";
        case WorkerStatus::COMPLETED: return "completed";
        case WorkerStatus::ERROR: return "error";
    }
    return "idle";
}

struct FileEntry {
    std::string path;
    std::string filename;
    std::string extension;
    uint64_t sizeBytes = 0;
    std::string modifiedAt;
};

struct DuplicateFileItem {
    std::string path;
    uint64_t size = 0;
    std::string modifiedAt;
};

struct DuplicateGroup {
    std::string id;
    std::string hash;
    uint64_t sizeBytes = 0;
    uint32_t fileCount = 0;
    std::vector<DuplicateFileItem> files;
};

struct WorkerThreadState {
    int id = 0;
    std::string label;
    WorkerStatus status = WorkerStatus::IDLE;
    std::string currentFile = "Awaiting task dispatch";
    uint64_t filesProcessed = 0;
    uint64_t bytesProcessed = 0;
    uint64_t elapsedTimeMs = 0;
};

struct ScanMetrics {
    uint64_t filesDiscovered = 0;
    uint64_t filesProcessed = 0;
    uint64_t bytesProcessed = 0;
    uint32_t duplicateGroups = 0;
    uint32_t duplicateFiles = 0;
    uint64_t wastedBytes = 0;
    uint64_t elapsedMs = 0;
    double throughputMBs = 0.0;
};

struct BenchmarkPoint {
    int threads = 1;
    uint64_t durationMs = 0;
    double speedup = 1.0;
    double efficiency = 100.0;
    double throughputMBs = 0.0;
    uint64_t filesProcessed = 0;
    uint64_t bytesProcessed = 0;
    uint32_t duplicateGroups = 0;
    uint32_t duplicateFiles = 0;
};

struct BenchmarkResult {
    std::string timestamp;
    std::string directory;
    uint64_t totalFiles = 0;
    uint64_t totalBytes = 0;
    uint64_t singleThreadMs = 0;
    uint64_t multiThreadMs = 0;
    double speedup = 1.0;
    double efficiency = 100.0;
    std::vector<BenchmarkPoint> points;
};

struct ActivityLogEvent {
    std::string id;
    std::string timestamp;
    std::string source; // scanner, worker, pipeline, system, backend
    std::string level;  // info, warn, error, trace
    std::string message;
};

struct SystemDiagnostics {
    std::string os;
    std::string kernel;
    std::string cpuModel;
    uint32_t logicalProcessors = 0;
    uint32_t physicalCores = 0;
    std::string architecture;
    uint32_t availableThreads = 0;
    uint64_t pageSizeBytes = 4096;
    uint64_t memoryTotalBytes = 0;
    uint64_t memoryFreeBytes = 0;
    bool backendConnected = true;
    std::string backendVersion = "1.0.0 (C++17 Engine)";
    std::string compiler = "GCC / MinGW-w64";
};

struct ScanConfig {
    std::string targetDirectory = "";
    std::string mode = "multi"; // "single" or "multi"
    int threadCount = 4;
    uint64_t minFileSizeBytes = 1;
    std::string hashAlgorithm = "sha256";
    bool followSymlinks = false;
};

} // namespace ThreadScan
