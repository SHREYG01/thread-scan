#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <cstdint>
#include <atomic>
#include <functional>
#include "Models.h"

namespace ThreadScan {

class FileScanner {
public:
    explicit FileScanner(std::atomic<uint64_t>& filesDiscoveredCounter);

    // Recursively scans the directory and groups all discovered regular files by size in bytes
    // Returns map: size_in_bytes -> vector of FileEntry
    std::unordered_map<uint64_t, std::vector<FileEntry>> scanDirectory(
        const std::string& path,
        uint64_t minSize = 1,
        const std::function<void(const std::string& currentPath)>& onProgress = nullptr
    );

private:
    std::atomic<uint64_t>& m_filesDiscovered;
};

} // namespace ThreadScan
