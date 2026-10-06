#pragma once

#include <string>
#include <vector>
#include <cstdint>
#include <cstddef>

namespace ThreadScan {

class SHA256 {
public:
    SHA256();
    void update(const uint8_t* data, size_t length);
    void update(const std::string& data);
    std::string finalize();

    static std::string hashString(const std::string& input);

private:
    void transform(const uint8_t* chunk);

    uint8_t m_data[64];
    uint32_t m_blockLen = 0;
    uint64_t m_bitLen = 0;
    uint32_t m_state[8];
};

} // namespace ThreadScan
