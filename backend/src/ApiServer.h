#pragma once

#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <atomic>
#include <thread>
#include "Models.h"
#include "DuplicateDetector.h"

namespace ThreadScan {

class ApiServer {
public:
    explicit ApiServer(int port = 8080);
    ~ApiServer();

    // Start listening and serving HTTP REST requests
    void start();

    // Stop server
    void stop();

    // State & logging
    void addLog(const std::string& source, const std::string& level, const std::string& message);

private:
    int m_port;
    std::atomic<bool> m_running{false};
    std::thread m_serverThread;

    std::atomic<ScanStatus> m_scanStatus{ScanStatus::IDLE};
    std::unique_ptr<DuplicateDetector> m_detector;
    std::thread m_scanWorkerThread;
    std::thread m_benchmarkWorkerThread;

    mutable std::mutex m_dataMutex;
    std::vector<DuplicateGroup> m_lastDuplicates;
    BenchmarkResult m_lastBenchmark;
    std::vector<ActivityLogEvent> m_logs;
    ScanConfig m_currentConfig;

    void runServerLoop();
    void handleClient(uintptr_t clientSocket);
    std::string processRequest(const std::string& method, const std::string& uri, const std::string& body);

    SystemDiagnostics collectSystemDiagnostics() const;
};

} // namespace ThreadScan
