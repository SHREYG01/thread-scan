#include "FileHasher.h"
#include "Sha256.h"
#include <fstream>
#include <vector>

namespace ThreadScan {

FileHasher::FileHasher(std::atomic<uint64_t>& bytesProcessedCounter)
    : m_bytesProcessed(bytesProcessedCounter) {}

std::string FileHasher::hashFileSha256(const std::string& filePath) {
    // Open in read-only binary mode
    std::ifstream file(filePath, std::ios::binary | std::ios::in);
    if (!file.is_open()) {
        return "";
    }

    SHA256 sha;
    std::vector<char> buffer(BUFFER_SIZE);

    while (file.read(buffer.data(), buffer.size()) || file.gcount() > 0) {
        std::streamsize bytesRead = file.gcount();
        if (bytesRead > 0) {
            sha.update(reinterpret_cast<const uint8_t*>(buffer.data()), static_cast<size_t>(bytesRead));
            m_bytesProcessed.fetch_add(static_cast<uint64_t>(bytesRead));
        }
        if (file.eof()) {
            break;
        }
    }

    return sha.finalize();
}

} // namespace ThreadScan
