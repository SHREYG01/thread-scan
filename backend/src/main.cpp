#include "ApiServer.h"
#include <iostream>
#include <csignal>
#include <thread>
#include <chrono>

static std::atomic<bool> g_shutdownRequested{false};

void signalHandler(int signum) {
    std::cout << "\n[THREAD//SCAN] Caught signal " << signum << ". Initiating shutdown..." << std::endl;
    g_shutdownRequested.store(true);
}

int main(int argc, char* argv[]) {
    int port = 8080;
    if (argc > 1) {
        try {
            port = std::stoi(argv[1]);
        } catch (...) {
            port = 8080;
        }
    }

    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    std::cout << "======================================================" << std::endl;
    std::cout << "  THREAD//SCAN - Concurrent Filesystem Analyzer" << std::endl;
    std::cout << "  Operating Systems Project | C++17 Multithreaded Core" << std::endl;
    std::cout << "======================================================" << std::endl;
    std::cout << "  * Standard: C++17" << std::endl;
    std::cout << "  * Threads: std::thread, std::mutex, std::condition_variable" << std::endl;
    std::cout << "  * Hardware Concurrency: " << std::thread::hardware_concurrency() << " logical processors" << std::endl;
    std::cout << "  * REST API: http://127.0.0.1:" << port << std::endl;
    std::cout << "======================================================" << std::endl;

    ThreadScan::ApiServer server(port);
    server.start();

    while (!g_shutdownRequested.load()) {
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
    }

    server.stop();
    std::cout << "[THREAD//SCAN] Server stopped cleanly." << std::endl;
    return 0;
}
