#include "FileScanner.h"
#include <filesystem>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace fs = std::filesystem;

namespace ThreadScan {

namespace {

std::string formatFileTime(fs::file_time_type fileTime) {
    try {
        // Convert to system clock
        auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
            fileTime - fs::file_time_type::clock::now() + std::chrono::system_clock::now()
        );
        std::time_t tt = std::chrono::system_clock::to_time_t(sctp);
        std::tm tmVal;
#ifdef _WIN32
        localtime_s(&tmVal, &tt);
#else
        localtime_r(&tt, &tmVal);
#endif
        std::ostringstream ss;
        ss << std::put_time(&tmVal, "%Y-%m-%d %H:%M:%S");
        return ss.str();
    } catch (...) {
        return "Unknown";
    }
}

} // anonymous namespace

FileScanner::FileScanner(std::atomic<uint64_t>& filesDiscoveredCounter)
    : m_filesDiscovered(filesDiscoveredCounter) {}

std::unordered_map<uint64_t, std::vector<FileEntry>> FileScanner::scanDirectory(
    const std::string& rootPath,
    uint64_t minSize,
    const std::function<void(const std::string&)>& onProgress
) {
    std::unordered_map<uint64_t, std::vector<FileEntry>> sizeGroups;
    std::error_code ec;

    fs::path target(rootPath);
    if (!fs::exists(target, ec) || !fs::is_directory(target, ec)) {
        return sizeGroups;
    }

    // Skip permission denied and symlinks safely
    fs::directory_options opts = fs::directory_options::skip_permission_denied;
    fs::recursive_directory_iterator it(target, opts, ec);
    fs::recursive_directory_iterator end;

    while (it != end && !ec) {
        try {
            const fs::directory_entry& entry = *it;
            if (entry.is_regular_file(ec) && !entry.is_symlink(ec)) {
                uint64_t fileSize = entry.file_size(ec);
                if (!ec && fileSize >= minSize) {
                    FileEntry fe;
                    fe.path = entry.path().lexically_normal().string();
                    fe.filename = entry.path().filename().string();
                    fe.extension = entry.path().extension().string();
                    fe.sizeBytes = fileSize;
                    fe.modifiedAt = formatFileTime(entry.last_write_time(ec));

                    sizeGroups[fileSize].push_back(std::move(fe));
                    m_filesDiscovered.fetch_add(1);

                    if (onProgress && (m_filesDiscovered.load() % 25 == 0)) {
                        onProgress(fe.path);
                    }
                }
            }
        } catch (...) {
            // Gracefully ignore unreadable individual files
        }

        it.increment(ec);
    }

    return sizeGroups;
}

} // namespace ThreadScan
