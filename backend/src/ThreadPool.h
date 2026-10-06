#pragma once

#include <vector>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <functional>
#include <atomic>
#include <chrono>
#include "Models.h"

namespace ThreadScan {

class ThreadPool {
public:
    explicit ThreadPool(size_t threadCount);
    ~ThreadPool();

    // Enqueue a task to be processed by a worker
    void enqueue(std::function<void(int workerId)> task);

    // Block until all queued tasks have been completed
    void waitAll();

    // Query active workers count
    size_t getActiveWorkerCount() const { return m_activeWorkers.load(); }
    size_t getThreadCount() const { return m_threads.size(); }

    // Inspect individual worker thread states
    std::vector<WorkerThreadState> getWorkerStates();
    void setWorkerState(int id, WorkerStatus status, const std::string& currentFile);
    void recordTaskStart(int id, const std::string& currentFile);
    void recordTaskFinish(int id, uint64_t bytes, uint64_t elapsedMs, const std::string& lastFile = "");
    void finalizeScanStates();

private:
    std::vector<std::thread> m_threads;
    std::queue<std::function<void(int workerId)>> m_tasks;

    mutable std::mutex m_queueMutex;
    std::condition_variable m_cvTaskAvailable;
    std::condition_variable m_cvTasksFinished;

    std::atomic<bool> m_stop{false};
    std::atomic<size_t> m_activeWorkers{0};
    std::atomic<size_t> m_totalTasksRemaining{0};

    std::mutex m_statesMutex;
    std::vector<WorkerThreadState> m_workerStates;
};

} // namespace ThreadScan
