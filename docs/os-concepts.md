# THREAD//SCAN — Operating Systems Core Concepts & Viva Guide

This document maps the core academic **Operating Systems concepts** demonstrated by **THREAD//SCAN** directly to their concrete C++17 implementations. It provides theoretical definitions, code references, design justifications, viva explanations, and explicit notes on theoretical topics not directly implemented.

---

## 1. Concept Reference Matrix

| Concept | Primary C++ Primitive / Class | Source File Location |
| :--- | :--- | :--- |
| **Threads vs. Processes** | `std::thread`, Host Process Boundary | [`main.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/main.cpp#L14-L47), [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L23-L62) |
| **Thread Pools** | `ThreadScan::ThreadPool` | [`ThreadPool.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.h), [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp) |
| **Concurrency vs. Parallelism** | Worker Pool vs. Multi-core Scheduling | [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L48-L53), [`Benchmark.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Benchmark.cpp#L43-L90) |
| **Mutex & Critical Sections** | `std::mutex`, `std::unique_lock`, `std::lock_guard` | [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L32-L44), [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L183-L186) |
| **Condition Variables** | `std::condition_variable` (`wait`, `notify_one`, `notify_all`) | [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L33-L35), [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L84), [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L89-L91) |
| **Atomic Operations** | `std::atomic<T>` (`fetch_add`, `fetch_sub`, `load`, `store`) | [`Models.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Models.h), [`DuplicateDetector.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.h#L34-L41), [`ThreadPool.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.h#L45-L48) |
| **Shared State & Synchronization** | Hash Map Insertion, State Snapshotting | [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L183-L190), [`ApiServer.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ApiServer.cpp#L85-L96) |
| **Filesystem I/O & Buffering** | `std::filesystem`, `std::ifstream` 64 KB Binary Streaming | [`FileScanner.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/FileScanner.cpp#L40-L87), [`FileHasher.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/FileHasher.cpp#L11-L33) |
| **Thread Lifecycle & State Machine** | `WorkerStatus` (`IDLE` $\rightarrow$ `HASHING` $\rightarrow$ `WAITING` $\rightarrow$ `COMPLETED`) | [`Models.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Models.h#L27-L46), [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L108-L141) |
| **Scheduling & Task Distribution** | Dynamic FIFO Task Queue Dispatch | [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L78-L85), [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L168-L194) |
| **Race Conditions & Mitigation** | Mutex Isolation, Lock Decoupling | [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L171-L191) |
| **Speedup & Efficiency** | Amdahl's Law Scaling ($S = T_1 / T_n$, $E = S / n$) | [`Benchmark.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Benchmark.cpp#L73-L74) |

---

## 2. Detailed Concept Breakdown

### 2.1 Threads vs. Processes

#### Theoretical Definition
- **Process**: An independent instance of an executing program with its own dedicated virtual address space, memory pages, file descriptors, and OS security context. Inter-process communication (IPC) requires OS intermediaries (sockets, pipes, shared memory).
- **Thread (Lightweight Process)**: The fundamental unit of CPU execution within a process. Threads belonging to the same process share code, global data, heap memory, and open file tables, but retain private thread IDs, program counters, CPU registers, and stack frames.

#### Where It Appears in Code
- **Process Boundary**: The application boots as a single native process (`thread_scan_server.exe` in [`main.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/main.cpp#L14)).
- **Thread Spawning**: In [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L23-L61), $N$ worker threads are spawned using `std::thread`, all running in the shared address space of `thread_scan_server.exe`.

#### Why the Project Uses It
Creating a new process per file or per scan would incur immense OS fork/exec latency and memory duplication. Using threads allows worker routines to share the candidate list, memory buffers, and collision maps in heap memory with near-zero inter-thread communication cost.

#### Viva Explanation
> *"A process is a resource isolation container possessing its own virtual memory space, whereas a thread is an execution context inside a process sharing the heap and global data. In THREAD//SCAN, our backend runs as one native process and spawns a thread pool of worker threads (`std::thread`). This avoids process allocation overhead while allowing all workers to access shared task queues and hash maps directly."*

---

### 2.2 Thread Pools

#### Theoretical Definition
A software design pattern where a fixed or bounded pool of pre-allocated threads waits for incoming tasks in an idle state. When work is submitted, an available thread is dispatched, executes the work unit, and returns to the pool without being terminated.

#### Where It Appears in Code
- Defined in [`ThreadPool.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.h) and implemented in [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L7-L62).
- Constructor allocates $N$ worker threads:
  ```cpp
  m_threads.reserve(threadCount);
  for (size_t i = 0; i < threadCount; ++i) {
      m_threads.emplace_back([this, i]() { /* Worker loop */ });
  }
  ```
- Destruction joins all threads cleanly in [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L64-L76).

#### Why the Project Uses It
In a filesystem with 50,000 files, spawning 50,000 individual `std::thread` instances would crash the operating system due to thread stack memory exhaustion (1 MB stack per thread on Windows = 50 GB RAM) and kernel scheduling thrashing. A thread pool caps concurrency to physical hardware limits (e.g., 4, 8, 16 workers), reusing the same threads continuously.

#### Viva Explanation
> *"Spawning one thread per file degrades system performance because the OS kernel spends more time context-switching and allocating stack memory than executing work. A thread pool creates a fixed set of persistent worker threads that sleep on a condition variable when idle and wake up only to drain tasks from a shared queue."*

---

### 2.3 Concurrency vs. Parallelism

#### Theoretical Definition
- **Concurrency**: Managing multiple computations at the same time by interleaving execution (e.g., time-slicing on a single CPU core). It is an architectural property of program design.
- **Parallelism**: Physically executing multiple computations simultaneously at the exact same instant on distinct physical CPU cores. It is a hardware capability.

#### Where It Appears in Code
- **Concurrency**: Supported in single-threaded mode or when thread count exceeds core count. Task interleaving is coordinated via `ApiServer` request processing and the work queue.
- **Parallelism**: In multi-threaded mode on a multicore CPU, up to $N$ worker threads execute cryptographic SHA-256 compression loops simultaneously across separate CPU execution units ([`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L171-L191)).

#### Why the Project Uses It
Filesystem analysis is computationally bound during cryptographic SHA-256 calculation. True physical parallelism allows 4 or 8 CPU cores to compute hashes at 300+ MB/s, slashing execution time compared to a sequential single-core loop.

#### Viva Explanation
> *"Concurrency is about dealing with lots of things at once; parallelism is about doing lots of things at once. In our project, concurrency is the architecture where the main thread traverses directories while workers dequeue tasks. Parallelism is the physical hardware reality where 8 distinct CPU cores execute SHA-256 block hashing simultaneously."*

---

### 2.4 Mutexes & Critical Sections

#### Theoretical Definition
- **Critical Section**: A block of code that accesses shared mutable state and must not be concurrently executed by more than one thread to prevent data corruption.
- **Mutex (Mutual Exclusion Object)**: A synchronization locking primitive that grants exclusive access to a single thread at a time. Other attempting threads are blocked until the owning thread releases the lock.
- **RAII Locking (`std::lock_guard`, `std::unique_lock`)**: C++ idioms where mutex acquisition occurs during object construction and guaranteed release occurs during object destruction (even on exceptions).

#### Where It Appears in Code
- **Queue Protection** in [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L32):
  ```cpp
  std::unique_lock<std::mutex> lock(m_queueMutex);
  m_cvTaskAvailable.wait(lock, [this]() { ... });
  task = std::move(m_tasks.front());
  m_tasks.pop();
  ```
- **Hash Results Protection** in [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L183-L186):
  ```cpp
  std::lock_guard<std::mutex> lock(hashGroupsMutex);
  GroupKey key{file.sizeBytes, hash};
  hashGroups[key].push_back(file);
  ```

#### Why the Project Uses It
Without mutex protection on `m_tasks` or `hashGroups`, two threads popping a queue or modifying an `std::unordered_map` simultaneously would cause memory corruption, dangling node pointers, and application crashes.

#### Viva Explanation
> *"A critical section is a region of code modifying shared memory. A mutex enforces mutual exclusion so only one thread enters at a time. We use RAII wrappers like `std::lock_guard` and `std::unique_lock` to guarantee the mutex is released automatically when leaving scope, preventing deadlocks if exceptions occur."*

---

### 2.5 Condition Variables & Worker Coordination

#### Theoretical Definition
A synchronization primitive that allows threads to suspend execution (sleep without consuming CPU cycles) until another thread modifies shared state and issues a signal/notification (`notify_one` or `notify_all`).

#### Where It Appears in Code
- In [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L33-L35):
  ```cpp
  std::unique_lock<std::mutex> lock(m_queueMutex);
  m_cvTaskAvailable.wait(lock, [this]() {
      return m_stop.load() || !m_tasks.empty();
  });
  ```
- In [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L84):
  `m_cvTaskAvailable.notify_one();` (Wakes up an idle worker thread when a new task is pushed).
- In [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L89-L91):
  `m_cvTasksFinished.wait(lock, [this]() { return m_totalTasksRemaining.load() == 0; });` (Main thread barrier waiting for all tasks to complete).

#### Why the Project Uses It
Without condition variables, worker threads would have to use a `while(tasks.empty()) {}` spin-loop, which burns 100% of CPU capacity on all cores doing zero useful work. A condition variable puts the worker to sleep in the operating system kernel until signaled.

#### Viva Explanation
> *"A condition variable avoids busy-waiting. In `ThreadPool.cpp`, workers call `m_cvTaskAvailable.wait()`, which atomically unlocks the queue mutex and puts the thread to sleep in kernel space. When the producer pushes a task, it calls `notify_one()`, waking up one worker. This keeps CPU usage at 0% when the queue is empty."*

---

### 2.6 Atomic Operations

#### Theoretical Definition
Low-level CPU memory operations that complete as a single indivisible unit relative to all other threads, guaranteed at the hardware bus level without requiring heavyweight OS mutex locking.

#### Where It Appears in Code
- Counters in [`DuplicateDetector.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.h#L34-L41):
  ```cpp
  std::atomic<uint64_t> m_filesDiscovered{0};
  std::atomic<uint64_t> m_filesProcessed{0};
  std::atomic<uint64_t> m_bytesProcessed{0};
  std::atomic<bool>     m_stopRequested{false};
  ```
- Lock-free counter increments in [`FileHasher.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/FileHasher.cpp#L25):
  `m_bytesProcessed.fetch_add(static_cast<uint64_t>(bytesRead));`

#### Why the Project Uses It
Acquiring a mutex for every 64 KB block read or every file discovered would introduce massive lock contention and cache-line invalidation. Atomic `fetch_add` compiles to a single hardware instruction (e.g., `LOCK XADD` on x86_64), providing fast, thread-safe counter tracking.

#### Viva Explanation
> *"Atomics provide lock-free synchronization for primitive types using hardware-supported CPU instructions like Compare-And-Swap or Fetch-And-Add. In THREAD//SCAN, telemetry metrics like `bytesProcessed` and `filesProcessed` use `std::atomic<uint64_t>` so multiple threads can increment them concurrently without acquiring a mutex."*

---

### 2.7 Filesystem I/O & Buffering

#### Theoretical Definition
The operating system mechanism for interacting with secondary persistent storage devices. Disks read and write data in fixed-size blocks (typically 4 KB sectors or clusters). File reading transfers blocks into kernel page caches before copying into user-space buffers.

#### Where It Appears in Code
- Inode Directory Walk: [`FileScanner.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/FileScanner.cpp#L55-L84) using `std::filesystem::recursive_directory_iterator`.
- Chunked Payload Streaming: [`FileHasher.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/FileHasher.cpp#L19-L30) using a 64 KB user-space buffer:
  ```cpp
  std::vector<char> buffer(64 * 1024);
  while (file.read(buffer.data(), buffer.size()) || file.gcount() > 0) {
      sha.update(reinterpret_cast<const uint8_t*>(buffer.data()), file.gcount());
  }
  ```

#### Why the Project Uses It
Reading entire large files into RAM (e.g., a 4 GB ISO or video file) would exhaust system memory and trigger thrashing or OOM errors. A 64 KB chunk size aligns efficiently with filesystem allocation clusters and CPU L1/L2 cache boundaries, streaming multi-gigabyte files with a constant, tiny memory footprint.

#### Viva Explanation
> *"We do not load whole files into memory. `FileHasher` streams files in 64 KB chunks directly through the SHA-256 compression function. This allows the system to process files of arbitrary size with constant $O(1)$ memory usage per worker while benefiting from OS disk read-ahead caching."*

---

### 2.8 Thread Lifecycle & Worker State Transitions

#### Theoretical Definition
The discrete operational states through which an operating system thread transitions during its execution: Created $\rightarrow$ Ready $\rightarrow$ Running $\rightarrow$ Blocked/Waiting $\rightarrow$ Terminated.

#### Where It Appears in Code
- State Enum in [`Models.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Models.h#L27-L34):
  ```cpp
  enum class WorkerStatus { IDLE, WAITING, READING, HASHING, COMPLETED, ERROR };
  ```
- State transitions in [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L108-L140):
  1. Worker initialized: Set to `IDLE`.
  2. Worker receives task: Transitions to `HASHING` via `recordTaskStart()`.
  3. Worker finishes file: Transitions to `WAITING` via `recordTaskFinish()`.
  4. Workload completes: Active workers transition to `COMPLETED` via `finalizeScanStates()`, unassigned workers remain `IDLE`.

#### Why the Project Uses It
Realtime telemetry exposed via `GET /api/v1/threads` provides transparent visibility into internal thread states on the Thread Monitor UI, proving genuine multithreaded execution.

#### Viva Explanation
> *"Our worker threads follow an explicit state machine: they start in `IDLE`, switch to `HASHING` when processing a file chunk, enter `WAITING` when completing a task, and finalize in `COMPLETED` after the entire queue drains. This is tracked in `ThreadPool::m_workerStates` and streamed to the frontend."*

---

### 2.9 Scheduling & Task Distribution

#### Theoretical Definition
The policy used by the operating system or runtime to allocate CPU execution resources to pending work items.

#### Where It Appears in Code
- **Dynamic Task Queue (Producer-Consumer)** in [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L32-L44) and [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L171-L191).
- The main scan thread acts as the **producer**, pushing file tasks into an `std::queue`.
- Worker threads act as **consumers**, dynamically popping the next available task from the queue as soon as they finish their previous task.

#### Why the Project Uses It
Files in a filesystem vary radically in size (e.g., 5 KB vs. 500 MB). If tasks were statically divided upfront (e.g., giving 50 files to each of 4 threads), a worker assigned one large file would still be hashing long after the other 3 threads sat idle. A dynamic queue achieves **automatic load balancing**: faster threads naturally dequeue more tasks.

#### Viva Explanation
> *"We use dynamic task scheduling rather than static partitioning. All candidate files are placed in a FIFO queue. Whichever worker finishes its file first immediately grabs the next file from the queue. This prevents idle cores when file sizes are heterogeneous."*

---

### 2.10 Race Conditions & How the Implementation Addresses Them

#### Theoretical Definition
A concurrency defect occurring when two or more threads access shared data concurrently and at least one access is a write, leading to non-deterministic, timing-dependent bugs.

#### How THREAD//SCAN Prevents Race Conditions
1. **Task Queue Dequeue**: Protected by `std::unique_lock<std::mutex> lock(m_queueMutex)`. Only one worker can pop a task at a time.
2. **Lock Decoupling (Critical Section Minimization)**: The mutex is unlocked *before* hashing begins:
   ```cpp
   task = std::move(m_tasks.front());
   m_tasks.pop();
   // Lock is released here!
   task(workerId); // SHA-256 runs concurrently without holding queue lock
   ```
3. **Collision Map Writes**: In [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L183), inserting into `hashGroups` is isolated using `std::lock_guard<std::mutex> lock(hashGroupsMutex)`.
4. **Counters**: Every progress counter is an `std::atomic` type, preventing torn reads/writes.

#### Viva Explanation
> *"We prevent race conditions through strict mutual exclusion and lock decoupling. The queue mutex is held only for microsecond task dequeue operations and is released before the file is read or hashed. When workers finish hashing, they acquire a dedicated `hashGroupsMutex` only to record their result in the duplicate map."*

---

### 2.11 Speedup & Parallel Efficiency (Amdahl's Law)

#### Theoretical Definition
- **Speedup ($S$)**: The ratio of sequential execution time ($T_1$) to parallel execution time ($T_n$):
  $$S = \frac{T_1}{T_n}$$
- **Efficiency ($E$)**: The speedup per allocated processor core, expressed as a percentage:
  $$E = \left(\frac{S}{n}\right) \times 100\%$$
- **Amdahl's Law**: States that the maximum theoretical speedup is constrained by the strictly sequential fraction of the program ($s$):
  $$S_{\text{max}} = \frac{1}{s + \frac{1-s}{n}}$$

#### Where It Appears in Code
Implemented in [`Benchmark.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Benchmark.cpp#L73-L84):
```cpp
double speedup = static_cast<double>(singleTimeMs) / static_cast<double>(duration);
double efficiency = (speedup / static_cast<double>(tCount)) * 100.0;
```

#### Why the Project Uses It
Evaluating the detector across 1, 2, 4, and 8 threads allows students and evaluators to observe Amdahl's law in practice, illustrating the diminishing returns of parallelism when disk I/O and mutex synchronization form sequential bottlenecks.

#### Viva Explanation
> *"Speedup measures how many times faster parallel execution is compared to single-threaded baseline execution ($T_1 / T_n$). Efficiency measures how effectively additional CPU cores are utilized ($S / n$). Amdahl's Law explains why 8 threads do not achieve an 8x speedup: serial tasks like directory traversal, queue synchronization, and disk I/O cannot be parallelized."*

---

## 3. Operating Systems Concepts Not Directly Implemented

To maintain strict academic integrity during examination, be aware of related OS concepts that are **not** implemented in this project:

1. **Lock-Free Work Queues**:
   - The queue uses standard `std::mutex` locking rather than atomic lock-free ring buffers (e.g., Michael-Scott queues).
2. **Work-Stealing Scheduling**:
   - The engine uses a single shared queue rather than per-thread deques with work-stealing (e.g., Cilk or Intel TBB).
3. **Thread Affinity / Core Pinning**:
   - Threads are scheduled dynamically by the Windows/POSIX kernel scheduler; the project does not call `SetThreadAffinityMask()` or `pthread_setaffinity_np()`.
4. **Process-Level Shared Memory**:
   - Communication between the Next.js frontend and C++ backend uses loopback TCP sockets (`127.0.0.1:8080`), not OS shared memory (`shmget` / `CreateFileMapping`).
5. **Direct / Asynchronous Disk I/O**:
   - Files are read using standard synchronous `std::ifstream`, not Windows IOCP (`ReadFileEx`) or Linux `io_uring` / `aio`.
