#include "ThreadPool.h"
#include <iomanip>
#include <sstream>

namespace ThreadScan {

ThreadPool::ThreadPool(size_t threadCount) {
    if (threadCount == 0) threadCount = 1;

    m_workerStates.resize(threadCount);
    for (size_t i = 0; i < threadCount; ++i) {
        std::ostringstream ss;
        ss << "THREAD " << std::setfill('0') << std::setw(2) << (i + 1);
        m_workerStates[i].id = static_cast<int>(i + 1);
        m_workerStates[i].label = ss.str();
        m_workerStates[i].status = WorkerStatus::IDLE;
        m_workerStates[i].currentFile = "Awaiting task dispatch";
        m_workerStates[i].filesProcessed = 0;
        m_workerStates[i].bytesProcessed = 0;
        m_workerStates[i].elapsedTimeMs = 0;
    }

    m_threads.reserve(threadCount);
    for (size_t i = 0; i < threadCount; ++i) {
        m_threads.emplace_back([this, i]() {
            int workerId = static_cast<int>(i + 1);

            while (true) {
                std::function<void(int)> task;
                {
                    // Sleep on condition variable until tasks are available or stop requested
                    std::unique_lock<std::mutex> lock(m_queueMutex);
                    m_cvTaskAvailable.wait(lock, [this]() {
                        return m_stop.load() || !m_tasks.empty();
                    });

                    if (m_stop.load() && m_tasks.empty()) {
                        break;
                    }

                    task = std::move(m_tasks.front());
                    m_tasks.pop();
                    m_activeWorkers.fetch_add(1);
                }
                // Queue mutex is released here before executing task!

                // Execute the work unit without holding queue mutex
                try {
                    task(workerId);
                } catch (...) {
                    // Safety guard: ensure thread pool worker survives any user task exceptions
                }

                m_activeWorkers.fetch_sub(1);
                size_t remaining = m_totalTasksRemaining.fetch_sub(1);
                if (remaining == 1) {
                    m_cvTasksFinished.notify_all();
                }
            }
        });
    }
}

ThreadPool::~ThreadPool() {
    {
        std::unique_lock<std::mutex> lock(m_queueMutex);
        m_stop.store(true);
    }
    m_cvTaskAvailable.notify_all();

    for (std::thread& th : m_threads) {
        if (th.joinable()) {
            th.join();
        }
    }
}

void ThreadPool::enqueue(std::function<void(int workerId)> task) {
    {
        std::unique_lock<std::mutex> lock(m_queueMutex);
        m_tasks.push(std::move(task));
        m_totalTasksRemaining.fetch_add(1);
    }
    m_cvTaskAvailable.notify_one();
}

void ThreadPool::waitAll() {
    std::unique_lock<std::mutex> lock(m_queueMutex);
    m_cvTasksFinished.wait(lock, [this]() {
        return m_totalTasksRemaining.load() == 0;
    });
}

std::vector<WorkerThreadState> ThreadPool::getWorkerStates() {
    std::lock_guard<std::mutex> lock(m_statesMutex);
    return m_workerStates;
}

void ThreadPool::setWorkerState(int id, WorkerStatus status, const std::string& currentFile) {
    std::lock_guard<std::mutex> lock(m_statesMutex);
    size_t idx = static_cast<size_t>(id - 1);
    if (idx < m_workerStates.size()) {
        m_workerStates[idx].status = status;
        m_workerStates[idx].currentFile = currentFile;
    }
}

void ThreadPool::recordTaskStart(int id, const std::string& currentFile) {
    std::lock_guard<std::mutex> lock(m_statesMutex);
    size_t idx = static_cast<size_t>(id - 1);
    if (idx < m_workerStates.size()) {
        m_workerStates[idx].status = WorkerStatus::HASHING;
        m_workerStates[idx].currentFile = currentFile;
    }
}

void ThreadPool::recordTaskFinish(int id, uint64_t bytes, uint64_t elapsedMs, const std::string& lastFile) {
    std::lock_guard<std::mutex> lock(m_statesMutex);
    size_t idx = static_cast<size_t>(id - 1);
    if (idx < m_workerStates.size()) {
        m_workerStates[idx].filesProcessed += 1;
        m_workerStates[idx].bytesProcessed += bytes;
        m_workerStates[idx].elapsedTimeMs += elapsedMs;
        m_workerStates[idx].status = WorkerStatus::WAITING;
        if (!lastFile.empty()) {
            m_workerStates[idx].currentFile = lastFile;
        }
    }
}

void ThreadPool::finalizeScanStates() {
    std::lock_guard<std::mutex> lock(m_statesMutex);
    for (auto& w : m_workerStates) {
        if (w.filesProcessed > 0) {
            w.status = WorkerStatus::COMPLETED;
        } else {
            w.status = WorkerStatus::IDLE;
            w.currentFile = "Awaiting task dispatch";
        }
    }
}

} // namespace ThreadScan
