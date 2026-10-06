# THREAD//SCAN - C++17 Multithreaded Backend

## Operating Systems Project Core

High-performance, multithreaded duplicate file detection engine written in C++17 with a REST API interface.

---

## 1. Concurrency Architecture

The backend implements a producer-consumer thread pool pipeline:

```
  File Scanner (std::filesystem)
             ↓
  Candidate Filter (Stage 1: Size grouping)
             ↓
  Task Queue (std::queue + std::mutex)
             ↓
  ┌──────────┬──────────┬──────────┬──────────┐
  │ Worker 1 │ Worker 2 │ Worker 3 │ Worker 4 │ (std::thread pool)
  └──────────┴──────────┴──────────┴──────────┘
             ↓
  Chunked 64KB SHA-256 Hashing (Stage 2)
             ↓
  Collision Map (std::mutex protected)
             ↓
  Duplicate Groups Output
```

---

## 2. Key OS Synchronization Primitives

1. **`std::thread`**:
   Worker pool threads initialized at startup, avoiding the overhead of creating one thread per file.

2. **`std::mutex`**:
   - `m_queueMutex`: Protects work queue enqueue and dequeue operations. Mutex is released before hashing to avoid CPU starvation.
   - `m_statesMutex`: Protects telemetry state queries.
   - `hashGroupsMutex`: Synchronizes thread-safe insertion into the collision results map.

3. **`std::condition_variable`**:
   - `m_cvTaskAvailable`: Workers sleep in zero-CPU wait state until new files are enqueued.
   - `m_cvTasksFinished`: Main scan thread waits until all pending queue tasks complete.

4. **`std::atomic`**:
   - `filesDiscovered`: Total recursive inodes found.
   - `filesProcessed`: Candidate files hashed.
   - `bytesProcessed`: Total payload bytes read through 64KB chunk buffer.
   - `activeWorkers`: Count of currently executing worker threads.
   - `stopRequested`: Lock-free cancellation flag.

---

## 3. Two-Stage Duplicate Detection

- **Stage 1 (Size Partitioning)**: Files are grouped by exact byte length. Any file with a unique size is immediately discarded, saving massive I/O.
- **Stage 2 (Chunked Cryptographic Hashing)**: Files in collision candidate size groups are streamed through a 64KB buffer using SHA-256 without loading entire files into memory.

---

## 4. Compilation

Using GCC 14.2 (MinGW-W64) or CMake:

```powershell
# Direct compilation:
g++ -std=c++17 -O2 -Ibackend/src backend/src/*.cpp -o backend/thread_scan_server.exe -lws2_32 -pthread

# Or using CMake:
cd backend
cmake -B build -G "MinGW Makefiles"
cmake --build build --config Release
```

---

## 5. REST API Endpoints

- `GET /api/v1/health` - Server heartbeat probe
- `GET /api/v1/system` - Operating system & hardware concurrency diagnostics
- `POST /api/v1/scan/start` - Initiate directory scan
- `POST /api/v1/scan/stop` - Cancel ongoing scan
- `GET /api/v1/scan/metrics` - Realtime telemetry counters
- `GET /api/v1/duplicates` - Identified duplicate clusters
- `GET /api/v1/threads` - Worker thread states and active files
- `POST /api/v1/benchmark/run` - Amdahl's Law speedup test
- `GET /api/v1/benchmark/latest` - Latest benchmark metrics
- `GET /api/v1/logs` - Realtime activity event stream
