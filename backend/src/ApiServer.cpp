#include "ApiServer.h"
#include "Json.h"
#include "Benchmark.h"

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#define SOCKET int
#define INVALID_SOCKET (-1)
#define SOCKET_ERROR (-1)
#define closesocket close
#endif

#include <iostream>
#include <sstream>
#include <chrono>
#include <ctime>
#include <iomanip>

namespace ThreadScan {

namespace {

std::string getIsoTimestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t tt = std::chrono::system_clock::to_time_t(now);
    std::tm tmVal;
#ifdef _WIN32
    localtime_s(&tmVal, &tt);
#else
    localtime_r(&tt, &tmVal);
#endif
    std::ostringstream ss;
    ss << std::put_time(&tmVal, "%H:%M:%S");
    return ss.str();
}

std::string makeHttpResponse(int statusCode, const std::string& statusText, const std::string& jsonBody) {
    std::ostringstream oss;
    oss << "HTTP/1.1 " << statusCode << " " << statusText << "\r\n";
    oss << "Content-Type: application/json; charset=utf-8\r\n";
    oss << "Content-Length: " << jsonBody.size() << "\r\n";
    oss << "Access-Control-Allow-Origin: *\r\n";
    oss << "Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE\r\n";
    oss << "Access-Control-Allow-Headers: Content-Type, Authorization, Accept\r\n";
    oss << "Connection: close\r\n\r\n";
    oss << jsonBody;
    return oss.str();
}

std::string makeCorsOptionsResponse() {
    std::ostringstream oss;
    oss << "HTTP/1.1 204 No Content\r\n";
    oss << "Access-Control-Allow-Origin: *\r\n";
    oss << "Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE\r\n";
    oss << "Access-Control-Allow-Headers: Content-Type, Authorization, Accept\r\n";
    oss << "Content-Length: 0\r\n";
    oss << "Connection: close\r\n\r\n";
    return oss.str();
}

} // anonymous namespace

ApiServer::ApiServer(int port) : m_port(port) {
    m_detector = std::make_unique<DuplicateDetector>();

    // Initial boot logs
    addLog("system", "info", "THREAD//SCAN C++17 engine booted on port " + std::to_string(m_port));
    addLog("scanner", "info", "File scanner initialized in read-only traversal mode");
    addLog("worker", "info", "Hardware concurrency detected: " + std::to_string(std::thread::hardware_concurrency()) + " logical cores");
}

ApiServer::~ApiServer() {
    stop();
}

void ApiServer::addLog(const std::string& source, const std::string& level, const std::string& message) {
    std::lock_guard<std::mutex> lock(m_dataMutex);
    ActivityLogEvent evt;
    evt.id = std::to_string(m_logs.size() + 1);
    evt.timestamp = getIsoTimestamp();
    evt.source = source;
    evt.level = level;
    evt.message = message;
    m_logs.push_back(std::move(evt));
    if (m_logs.size() > 200) {
        m_logs.erase(m_logs.begin(), m_logs.begin() + 50);
    }
}

SystemDiagnostics ApiServer::collectSystemDiagnostics() const {
    SystemDiagnostics diag;
    unsigned int hw = std::thread::hardware_concurrency();
    diag.logicalProcessors = hw > 0 ? hw : 4;
    diag.physicalCores = diag.logicalProcessors > 2 ? diag.logicalProcessors / 2 : diag.logicalProcessors;
    diag.availableThreads = diag.logicalProcessors;
    diag.backendConnected = true;

#ifdef _WIN32
    diag.os = "Windows (NT Kernel)";
    diag.kernel = "Win32 Subsystem";
    diag.architecture = "x86_64";

    MEMORYSTATUSEX memInfo;
    memInfo.dwLength = sizeof(MEMORYSTATUSEX);
    if (GlobalMemoryStatusEx(&memInfo)) {
        diag.memoryTotalBytes = memInfo.ullTotalPhys;
        diag.memoryFreeBytes = memInfo.ullAvailPhys;
    }

    // Query CPU Brand string from registry if accessible
    HKEY hKey;
    if (RegOpenKeyExA(HKEY_LOCAL_MACHINE, "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
        char cpuName[256] = {0};
        DWORD bufferSize = sizeof(cpuName);
        if (RegQueryValueExA(hKey, "ProcessorNameString", NULL, NULL, (LPBYTE)cpuName, &bufferSize) == ERROR_SUCCESS) {
            diag.cpuModel = cpuName;
        }
        RegCloseKey(hKey);
    }
    if (diag.cpuModel.empty()) {
        diag.cpuModel = "x86_64 Multicore Processor";
    }
#else
    diag.os = "POSIX / Linux";
    diag.kernel = "Standard Kernel";
    diag.architecture = "x86_64";
    diag.cpuModel = "SMP Multicore Processor";
#endif

    diag.compiler = "GCC 14.2.0 (C++17 POSIX SEH)";
    return diag;
}

void ApiServer::start() {
    if (m_running.load()) return;
    m_running.store(true);
    m_serverThread = std::thread(&ApiServer::runServerLoop, this);
}

void ApiServer::stop() {
    if (!m_running.load()) return;
    m_running.store(false);

    if (m_detector) {
        m_detector->stop();
    }

    if (m_scanWorkerThread.joinable()) {
        m_scanWorkerThread.join();
    }
    if (m_benchmarkWorkerThread.joinable()) {
        m_benchmarkWorkerThread.join();
    }

    // Trigger local socket connect to unblock accept()
#ifdef _WIN32
    SOCKET s = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (s != INVALID_SOCKET) {
        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_port = htons(m_port);
        addr.sin_addr.s_addr = inet_addr("127.0.0.1");
        connect(s, reinterpret_cast<sockaddr*>(&addr), sizeof(addr));
        closesocket(s);
    }
#endif

    if (m_serverThread.joinable()) {
        m_serverThread.join();
    }
}

void ApiServer::runServerLoop() {
#ifdef _WIN32
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed." << std::endl;
        return;
    }
#endif

    SOCKET serverSocket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
    if (serverSocket == INVALID_SOCKET) {
        std::cerr << "Failed to create socket." << std::endl;
#ifdef _WIN32
        WSACleanup();
#endif
        return;
    }

    int opt = 1;
    setsockopt(serverSocket, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&opt), sizeof(opt));

    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(static_cast<u_short>(m_port));

    if (bind(serverSocket, reinterpret_cast<sockaddr*>(&serverAddr), sizeof(serverAddr)) == SOCKET_ERROR) {
        std::cerr << "Bind failed on port " << m_port << std::endl;
        closesocket(serverSocket);
#ifdef _WIN32
        WSACleanup();
#endif
        return;
    }

    if (listen(serverSocket, 32) == SOCKET_ERROR) {
        std::cerr << "Listen failed." << std::endl;
        closesocket(serverSocket);
#ifdef _WIN32
        WSACleanup();
#endif
        return;
    }

    std::cout << "[THREAD//SCAN] REST API Server listening at http://127.0.0.1:" << m_port << std::endl;

    while (m_running.load()) {
        sockaddr_in clientAddr{};
        int clientLen = sizeof(clientAddr);
        SOCKET clientSocket = accept(serverSocket, reinterpret_cast<sockaddr*>(&clientAddr), &clientLen);

        if (!m_running.load()) {
            if (clientSocket != INVALID_SOCKET) closesocket(clientSocket);
            break;
        }

        if (clientSocket != INVALID_SOCKET) {
            std::thread([this, clientSocket]() {
                handleClient(static_cast<uintptr_t>(clientSocket));
            }).detach();
        }
    }

    closesocket(serverSocket);
#ifdef _WIN32
    WSACleanup();
#endif
}

void ApiServer::handleClient(uintptr_t clientSocketRaw) {
    SOCKET clientSocket = static_cast<SOCKET>(clientSocketRaw);

    std::string request;
    char buffer[4096];
    int bytesReceived = 0;
    size_t contentLength = 0;
    bool headerParsed = false;

    while ((bytesReceived = recv(clientSocket, buffer, sizeof(buffer), 0)) > 0) {
        request.append(buffer, bytesReceived);

        if (!headerParsed) {
            size_t headerEnd = request.find("\r\n\r\n");
            if (headerEnd != std::string::npos) {
                headerParsed = true;
                std::string lower = request;
                for (char& c : lower) c = static_cast<char>(tolower(static_cast<unsigned char>(c)));
                size_t clPos = lower.find("content-length:");
                if (clPos != std::string::npos) {
                    size_t valStart = lower.find_first_not_of(" \t", clPos + 15);
                    size_t valEnd = lower.find("\r\n", valStart);
                    if (valStart != std::string::npos && valEnd != std::string::npos) {
                        try {
                            contentLength = std::stoul(lower.substr(valStart, valEnd - valStart));
                        } catch (...) {
                            contentLength = 0;
                        }
                    }
                }
            }
        }

        if (headerParsed) {
            size_t headerEnd = request.find("\r\n\r\n");
            if (request.size() >= headerEnd + 4 + contentLength) {
                break;
            }
        }
    }

    if (request.empty()) {
        closesocket(clientSocket);
        return;
    }

    // Parse HTTP request line
    std::istringstream reqStream(request);
    std::string method, uri, version;
    reqStream >> method >> uri >> version;

    std::string response;
    if (method == "OPTIONS") {
        response = makeCorsOptionsResponse();
    } else {
        // Extract body if any
        std::string body;
        size_t headerEnd = request.find("\r\n\r\n");
        if (headerEnd != std::string::npos) {
            body = request.substr(headerEnd + 4);
        }

        response = processRequest(method, uri, body);
    }

    send(clientSocket, response.data(), static_cast<int>(response.size()), 0);
    closesocket(clientSocket);
}

std::string ApiServer::processRequest(const std::string& method, const std::string& uri, const std::string& body) {
    // Normalize path query
    std::string path = uri;
    size_t qPos = path.find('?');
    if (qPos != std::string::npos) {
        path = path.substr(0, qPos);
    }

    // 1. Health check: GET /api/v1/health
    if (method == "GET" && (path == "/api/v1/health" || path == "/health")) {
        return makeHttpResponse(200, "OK", "{\"status\":\"ok\",\"service\":\"THREAD//SCAN C++17\"}");
    }

    // 2. System Diagnostics: GET /api/v1/system or /api/system
    if (method == "GET" && (path == "/api/v1/system" || path == "/api/system")) {
        SystemDiagnostics diag = collectSystemDiagnostics();
        std::ostringstream json;
        json << "{"
             << "\"os\":" << JsonValue::stringVal(diag.os) << ","
             << "\"kernel\":" << JsonValue::stringVal(diag.kernel) << ","
             << "\"cpuModel\":" << JsonValue::stringVal(diag.cpuModel) << ","
             << "\"logicalProcessors\":" << diag.logicalProcessors << ","
             << "\"physicalCores\":" << diag.physicalCores << ","
             << "\"architecture\":" << JsonValue::stringVal(diag.architecture) << ","
             << "\"availableThreads\":" << diag.availableThreads << ","
             << "\"pageSizeBytes\":" << diag.pageSizeBytes << ","
             << "\"memoryTotalBytes\":" << diag.memoryTotalBytes << ","
             << "\"memoryFreeBytes\":" << diag.memoryFreeBytes << ","
             << "\"backendConnected\":true,"
             << "\"backendVersion\":" << JsonValue::stringVal(diag.backendVersion) << ","
             << "\"compiler\":" << JsonValue::stringVal(diag.compiler)
             << "}";
        return makeHttpResponse(200, "OK", json.str());
    }

    // 3. Start Scan: POST /api/v1/scan/start or /api/scan
    if (method == "POST" && (path == "/api/v1/scan/start" || path == "/api/scan")) {
        ScanConfig cfg;
        cfg.targetDirectory = JsonParser::getString(body, "targetDirectory", "");
        if (cfg.targetDirectory.empty()) {
            cfg.targetDirectory = JsonParser::getString(body, "directory", ".");
        }
        cfg.mode = JsonParser::getString(body, "mode", "multi");
        cfg.threadCount = JsonParser::getInt(body, "threadCount", 4);
        if (cfg.threadCount <= 0) cfg.threadCount = 4;

        if (m_scanWorkerThread.joinable()) {
            m_scanWorkerThread.join();
        }

        m_scanStatus.store(ScanStatus::SCANNING);
        {
            std::lock_guard<std::mutex> lock(m_dataMutex);
            m_currentConfig = cfg;
        }

        addLog("scanner", "info", "Scan requested on " + cfg.targetDirectory + " (" + cfg.mode + ", " + std::to_string(cfg.threadCount) + " threads)");

        m_scanWorkerThread = std::thread([this, cfg]() {
            auto results = m_detector->runScan(
                cfg,
                [this](const std::string& src, const std::string& lvl, const std::string& msg) {
                    addLog(src, lvl, msg);
                }
            );

            {
                std::lock_guard<std::mutex> lock(m_dataMutex);
                m_lastDuplicates = std::move(results);
            }
            m_scanStatus.store(ScanStatus::COMPLETED);
        });

        return makeHttpResponse(200, "OK", "{\"scanId\":\"SCAN-" + std::to_string(std::time(nullptr)) + "\",\"started\":true}");
    }

    // 4. Stop Scan: POST /api/v1/scan/stop
    if (method == "POST" && (path == "/api/v1/scan/stop")) {
        if (m_detector) {
            m_detector->stop();
        }
        m_scanStatus.store(ScanStatus::IDLE);
        addLog("scanner", "warn", "Scan aborted via REST API");
        return makeHttpResponse(200, "OK", "{\"stopped\":true}");
    }

    // 5. Scan Metrics & Status: GET /api/v1/scan/metrics or /api/v1/scan/status
    if (method == "GET" && (path == "/api/v1/scan/metrics" || path == "/api/v1/scan/status")) {
        ScanMetrics m = m_detector->getMetrics();
        std::ostringstream json;
        json << "{"
             << "\"status\":" << JsonValue::stringVal(scanStatusToString(m_scanStatus.load())) << ","
             << "\"filesDiscovered\":" << m.filesDiscovered << ","
             << "\"filesProcessed\":" << m.filesProcessed << ","
             << "\"bytesProcessed\":" << m.bytesProcessed << ","
             << "\"duplicateGroups\":" << m.duplicateGroups << ","
             << "\"duplicateFiles\":" << m.duplicateFiles << ","
             << "\"wastedBytes\":" << m.wastedBytes << ","
             << "\"elapsedMs\":" << m.elapsedMs << ","
             << "\"throughputMBs\":" << JsonValue::doubleVal(m.throughputMBs)
             << "}";
        return makeHttpResponse(200, "OK", json.str());
    }

    // 6. Duplicates: GET /api/v1/duplicates
    if (method == "GET" && (path == "/api/v1/duplicates")) {
        std::lock_guard<std::mutex> lock(m_dataMutex);
        std::ostringstream json;
        json << "[";
        for (size_t i = 0; i < m_lastDuplicates.size(); ++i) {
            const auto& g = m_lastDuplicates[i];
            if (i > 0) json << ",";
            json << "{"
                 << "\"id\":" << JsonValue::stringVal(g.id) << ","
                 << "\"hash\":" << JsonValue::stringVal(g.hash) << ","
                 << "\"sizeBytes\":" << g.sizeBytes << ","
                 << "\"fileCount\":" << g.fileCount << ","
                 << "\"files\":[";
            for (size_t j = 0; j < g.files.size(); ++j) {
                const auto& f = g.files[j];
                if (j > 0) json << ",";
                json << "{"
                     << "\"path\":" << JsonValue::stringVal(f.path) << ","
                     << "\"size\":" << f.size << ","
                     << "\"modifiedAt\":" << JsonValue::stringVal(f.modifiedAt)
                     << "}";
            }
            json << "]}";
        }
        json << "]";
        return makeHttpResponse(200, "OK", json.str());
    }

    // 7. Thread Worker States: GET /api/v1/threads
    if (method == "GET" && (path == "/api/v1/threads")) {
        auto states = m_detector->getWorkerStates();
        std::ostringstream json;
        json << "[";
        for (size_t i = 0; i < states.size(); ++i) {
            const auto& w = states[i];
            if (i > 0) json << ",";
            json << "{"
                 << "\"id\":" << w.id << ","
                 << "\"label\":" << JsonValue::stringVal(w.label) << ","
                 << "\"status\":" << JsonValue::stringVal(workerStatusToString(w.status)) << ","
                 << "\"currentFile\":" << JsonValue::stringVal(w.currentFile) << ","
                 << "\"filesProcessed\":" << w.filesProcessed << ","
                 << "\"bytesProcessed\":" << w.bytesProcessed << ","
                 << "\"elapsedTimeMs\":" << w.elapsedTimeMs
                 << "}";
        }
        json << "]";
        return makeHttpResponse(200, "OK", json.str());
    }

    // 8. Run Benchmark: POST /api/v1/benchmark/run or /api/benchmark
    if (method == "POST" && (path == "/api/v1/benchmark/run" || path == "/api/benchmark")) {
        std::string dir = JsonParser::getString(body, "directory", "");
        if (dir.empty()) dir = "C:\\thread-scan-benchmark";
        int maxThreads = JsonParser::getInt(body, "maxThreads", 8);

        if (m_benchmarkWorkerThread.joinable()) {
            m_benchmarkWorkerThread.join();
        }

        m_scanStatus.store(ScanStatus::SCANNING);

        m_benchmarkWorkerThread = std::thread([this, dir, maxThreads]() {
            BenchmarkResult res = BenchmarkSuite::run(
                m_detector.get(),
                dir,
                maxThreads,
                [this](const std::string& src, const std::string& lvl, const std::string& msg) {
                    addLog(src, lvl, msg);
                }
            );

            {
                std::lock_guard<std::mutex> lock(m_dataMutex);
                m_lastBenchmark = res;
            }
            m_scanStatus.store(ScanStatus::COMPLETED);
        });

        return makeHttpResponse(200, "OK", "{\"status\":\"running\",\"message\":\"Benchmark initiated\"}");
    }

    // 9. Get Latest Benchmark: GET /api/v1/benchmark/latest
    if (method == "GET" && (path == "/api/v1/benchmark/latest")) {
        std::lock_guard<std::mutex> lock(m_dataMutex);
        if (m_lastBenchmark.points.empty()) {
            return makeHttpResponse(200, "OK", "null");
        }

        std::ostringstream json;
        json << "{"
             << "\"timestamp\":" << JsonValue::stringVal(m_lastBenchmark.timestamp) << ","
             << "\"directory\":" << JsonValue::stringVal(m_lastBenchmark.directory) << ","
             << "\"totalFiles\":" << m_lastBenchmark.totalFiles << ","
             << "\"totalBytes\":" << m_lastBenchmark.totalBytes << ","
             << "\"singleThreadMs\":" << m_lastBenchmark.singleThreadMs << ","
             << "\"multiThreadMs\":" << m_lastBenchmark.multiThreadMs << ","
             << "\"speedup\":" << JsonValue::doubleVal(m_lastBenchmark.speedup) << ","
             << "\"efficiency\":" << JsonValue::doubleVal(m_lastBenchmark.efficiency) << ","
             << "\"points\":[";
        for (size_t i = 0; i < m_lastBenchmark.points.size(); ++i) {
            const auto& pt = m_lastBenchmark.points[i];
            if (i > 0) json << ",";
            json << "{"
                 << "\"threads\":" << pt.threads << ","
                 << "\"durationMs\":" << pt.durationMs << ","
                 << "\"speedup\":" << JsonValue::doubleVal(pt.speedup) << ","
                 << "\"efficiency\":" << JsonValue::doubleVal(pt.efficiency) << ","
                 << "\"throughputMBs\":" << JsonValue::doubleVal(pt.throughputMBs) << ","
                 << "\"filesProcessed\":" << pt.filesProcessed << ","
                 << "\"bytesProcessed\":" << pt.bytesProcessed << ","
                 << "\"duplicateGroups\":" << pt.duplicateGroups << ","
                 << "\"duplicateFiles\":" << pt.duplicateFiles
                 << "}";
        }
        json << "]}";
        return makeHttpResponse(200, "OK", json.str());
    }

    // 10. Logs: GET /api/v1/logs or /api/activity
    if (method == "GET" && (path == "/api/v1/logs" || path == "/api/activity")) {
        std::lock_guard<std::mutex> lock(m_dataMutex);
        std::ostringstream json;
        json << "[";
        for (size_t i = 0; i < m_logs.size(); ++i) {
            const auto& l = m_logs[i];
            if (i > 0) json << ",";
            json << "{"
                 << "\"id\":" << JsonValue::stringVal(l.id) << ","
                 << "\"timestamp\":" << JsonValue::stringVal(l.timestamp) << ","
                 << "\"source\":" << JsonValue::stringVal(l.source) << ","
                 << "\"level\":" << JsonValue::stringVal(l.level) << ","
                 << "\"message\":" << JsonValue::stringVal(l.message)
                 << "}";
        }
        json << "]";
        return makeHttpResponse(200, "OK", json.str());
    }

    return makeHttpResponse(404, "Not Found", "{\"error\":\"Route not found\"}");
}

} // namespace ThreadScan
