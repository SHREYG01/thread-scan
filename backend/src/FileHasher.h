#pragma once

#include <string>
#include <cstdint>
#include <atomic>

namespace ThreadScan {

class FileHasher {
public:
    explicit FileHasher(std::atomic<uint64_t>& bytesProcessedCounter);

    // Hashes a file chunk by chunk (64KB blocks) using SHA-256
    // Returns hex digest, or empty string on read failure
    std::string hashFileSha256(const std::string& filePath);

private:
    std::atomic<uint64_t>& m_bytesProcessed;
    static constexpr size_t BUFFER_SIZE = 64 * 1024; // 64 KB chunks
};

} // namespace ThreadScan
