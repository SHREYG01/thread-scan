#pragma once

#include <string>
#include <vector>
#include <functional>
#include "Models.h"

namespace ThreadScan {

class DuplicateDetector;

class BenchmarkSuite {
public:
    static BenchmarkResult run(
        DuplicateDetector* detector,
        const std::string& directory,
        int maxThreads = 8,
        std::function<void(const std::string& source, const std::string& level, const std::string& msg)> logCallback = nullptr
    );
};

} // namespace ThreadScan
