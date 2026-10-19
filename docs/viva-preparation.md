# THREAD//SCAN — Academic Viva Voce & Technical Defense Guide

This document compiles **25 essential Operating Systems viva questions and answers** tailored to defend the architecture, implementation, and theoretical principles of **THREAD//SCAN**.

---

## Question Index

1. [Why was THREAD//SCAN built?](#q1-why-was-threadscan-built)
2. [Why was C++17 chosen for the backend instead of Python or Node.js?](#q2-why-was-c17-chosen-for-the-backend-instead-of-python-or-nodejs)
3. [Why is SHA-256 used instead of MD5 or CRC32?](#q3-why-is-sha-256-used-instead-of-md5-or-crc32)
4. [How does the two-stage duplicate detection algorithm work?](#q4-how-does-the-two-stage-duplicate-detection-algorithm-work)
5. [Why is file size checked before hashing?](#q5-why-is-file-size-checked-before-hashing)
6. [Why is multithreading beneficial for duplicate detection?](#q6-why-is-multithreading-beneficial-for-duplicate-detection)
7. [Why use a thread pool instead of spawning a new thread for each file?](#q7-why-use-a-thread-pool-instead-of-spawning-a-new-thread-for-each-file)
8. [What is the difference between `std::mutex` and `std::atomic` in your code?](#q8-what-is-the-difference-between-stdmutex-and-stdatomic-in-your-code)
9. [What is the purpose of `std::condition_variable` in `ThreadPool.cpp`?](#q9-what-is-the-purpose-of-stdcondition_variable-in-threadpoolcpp)
10. [How is real-time worker telemetry collected without slowing down execution?](#q10-how-is-real-time-worker-telemetry-collected-without-slowing-down-execution)
11. [How are speedup and parallel efficiency calculated?](#q11-how-are-speedup-and-parallel-efficiency-calculated)
12. [Why did your 2-thread benchmark run show efficiency over 100% (super-linear speedup)?](#q12-why-did-your-2-thread-benchmark-run-show-efficiency-over-100-super-linear-speedup)
13. [What are the project's known limitations?](#q13-what-are-the-projects-known-limitations)
14. [How does your code prevent deadlocks and race conditions?](#q14-how-does-your-code-prevent-deadlocks-and-race-conditions)
15. [Why does `FileHasher` stream files in 64 KB chunks instead of loading them whole?](#q15-why-does-filehasher-stream-files-in-64-kb-chunks-instead-of-loading-them-whole)
16. [How does recursive directory traversal handle symbolic links and permission errors?](#q16-how-does-recursive-directory-traversal-handle-symbolic-links-and-permission-errors)
17. [How did you implement HTTP REST without external web frameworks like Boost.Beast?](#q17-how-did-you-implement-http-rest-without-external-web-frameworks-like-boostbeast)
18. [What is Amdahl's Law and how does it apply to your benchmark results?](#q18-what-is-amdahls-law-and-how-does-it-apply-to-your-benchmark-results)
19. [How does dynamic queue scheduling prevent worker thread starvation?](#q19-how-does-dynamic-queue-scheduling-prevent-worker-thread-starvation)
20. [What is the difference between concurrency and parallelism in your architecture?](#q20-what-is-the-difference-between-concurrency-and-parallelism-in-your-architecture)
21. [How are hash collisions handled if two distinct files produce the same SHA-256 digest?](#q21-how-are-hash-collisions-handled-if-two-distinct-files-produce-the-same-sha-256-digest)
22. [How does cooperative scan cancellation work?](#q22-how-does-cooperative-scan-cancellation-work)
23. [What happens if a file is modified or deleted while a scan is running?](#q23-what-is-the-behavior-if-a-file-is-modified-or-locked-during-a-scan)
24. [Why can't the Next.js frontend scan local drives directly from a web browser?](#q24-why-cant-the-nextjs-frontend-scan-local-drives-directly-from-a-web-browser)
25. [What future improvements would you implement in Phase 2?](#q25-what-future-improvements-would-you-implement-in-phase-2)

---

## Comprehensive Viva Questions & Answers

### Q1: Why was THREAD//SCAN built?
**Answer**: Redundant duplicate files consume massive storage space across developer workstations and backup drives. Existing utilities either use naive single-threaded hashing (which is very slow) or load entire files into memory. THREAD//SCAN was built as an Operating Systems demonstration of **two-stage filtering**, **bounded thread pool concurrency**, and **64 KB block streaming** to maximize throughput while minimizing I/O and memory overhead.
- **Reference**: [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L72-L194)

---

### Q2: Why was C++17 chosen for the backend instead of Python or Node.js?
**Answer**: 
1. **Direct Hardware Control**: C++ compiles to native machine code with zero runtime garbage collection pauses.
2. **True Multithreading**: Unlike Python (which has a Global Interpreter Lock / GIL) or Node.js (which runs a single-threaded event loop), C++ `std::thread` executes true parallel machine instructions simultaneously across distinct physical CPU cores.
3. **Standardized Filesystem**: C++17 provides `std::filesystem`, offering cross-platform, high-performance recursive inode traversal.
- **Reference**: [`CMakeLists.txt`](file:///C:/Users/OMEN/Downloads/osproject/backend/CMakeLists.txt#L4-L6)

---

### Q3: Why is SHA-256 used instead of MD5 or CRC32?
**Answer**: CRC32 is an error-detecting cyclic redundancy code, not a cryptographic hash; it has a very high collision probability. MD5 is cryptographically broken and vulnerable to collision attacks where different contents yield the same hash. SHA-256 (NIST FIPS 180-4) provides a 256-bit digest with virtually zero collision probability ($2^{-256}$), ensuring that two files with matching size and SHA-256 hash are guaranteed to be byte-identical.
- **Reference**: [`Sha256.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Sha256.h), [`Sha256.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Sha256.cpp)

---

### Q4: How does the two-stage duplicate detection algorithm work?
**Answer**:
- **Stage 1 (Size Partitioning)**: Recursively walk directory inodes and record each file's size in bytes into a hash map (`sizeGroups`). Discard any file whose size is unique across the entire directory tree without reading its contents from disk.
- **Stage 2 (Cryptographic Hashing)**: For files in size buckets containing $\ge 2$ files, stream their contents in 64 KB chunks through SHA-256. Group files matching both `(size, hash)` into duplicate clusters.
- **Reference**: [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L72-L125)

---

### Q5: Why is file size checked before hashing?
**Answer**: File size is metadata stored directly in directory inodes/file tables. Querying file size takes microseconds and requires zero physical payload disk reads. In contrast, calculating SHA-256 requires reading every byte from storage into CPU registers. In typical filesystems, over 80–90% of files have unique byte lengths; filtering by size first eliminates 80–90% of disk I/O.
- **Reference**: [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L86-L92)

---

### Q6: Why is multithreading beneficial for duplicate detection?
**Answer**: Hashing files requires two operations: storage I/O (reading data from disk) and CPU computation (running SHA-256 compression loops). Multithreading allows computation to overlap with I/O across separate cores. While Thread 1 is waiting on disk blocks, Thread 2 computes SHA-256 transforms in CPU registers, keeping hardware utilization high and reducing total wall-clock duration.
- **Reference**: [`Benchmark.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Benchmark.cpp#L43-L90)

---

### Q7: Why use a thread pool instead of spawning a new thread for each file?
**Answer**: Creating an OS thread incurs significant overhead: allocating 1 MB of stack space, calling kernel APIs, creating kernel thread control blocks, and tearing them down. If a folder contains 50,000 files, spawning 50,000 threads would exhaust RAM and cause severe CPU context-switching thrashing. A thread pool allocates a fixed number of worker threads (e.g., 4 or 8) once, reusing them to process unbounded queues of tasks.
- **Reference**: [`ThreadPool.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.h), [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L7-L62)

---

### Q8: What is the difference between `std::mutex` and `std::atomic` in your code?
**Answer**:
- `std::mutex`: Used when a critical section involves multiple instructions or complex data structures (e.g., popping from `std::queue` or inserting into `std::unordered_map`). Threads trying to acquire an already-locked mutex are blocked by the OS kernel.
- `std::atomic`: Used for single primitive scalar variables (e.g., `m_bytesProcessed`, `m_filesProcessed`). Atomics use lock-free CPU hardware instructions (e.g., `LOCK XADD` on x86_64) without kernel involvement or context-switching overhead.
- **Reference**: [`ThreadPool.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.h#L41-L50), [`DuplicateDetector.h`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.h#L34-L44)

---

### Q9: What is the purpose of `std::condition_variable` in `ThreadPool.cpp`?
**Answer**: Condition variables eliminate busy-waiting (CPU spinning). In `ThreadPool.cpp`:
- `m_cvTaskAvailable`: Worker threads call `m_cvTaskAvailable.wait(lock)`, putting them to sleep in the kernel at 0% CPU until the main thread pushes a task and calls `notify_one()`.
- `m_cvTasksFinished`: The main thread calls `m_cvTasksFinished.wait(lock)` to block until all pending queue tasks have finished (`m_totalTasksRemaining == 0`).
- **Reference**: [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L33-L35), [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L89-L91)

---

### Q10: How is real-time worker telemetry collected without slowing down execution?
**Answer**:
1. Worker state updates occur only at task boundaries: `recordTaskStart` (when dequeuing) and `recordTaskFinish` (when completing a file).
2. During the multi-megabyte 64 KB chunk reading loop, no telemetry locks are acquired; only an atomic counter (`m_bytesProcessed.fetch_add()`) is incremented.
3. The HTTP server queries `getWorkerStates()` concurrently under a lightweight mutex guard, preventing polling from blocking the active hashing pipeline.
- **Reference**: [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L108-L130)

---

### Q11: How are speedup and parallel efficiency calculated?
**Answer**:
- **Speedup ($S$)**: Sequential baseline execution time divided by parallel execution time:
  $$S = \frac{T_1}{T_n}$$
- **Efficiency ($E$)**: Speedup divided by thread count ($n$), expressed as a percentage:
  $$E = \left(\frac{S}{n}\right) \times 100\%$$
- **Reference**: [`Benchmark.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/Benchmark.cpp#L73-L74)

---

### Q12: Why did your 2-thread benchmark run show efficiency over 100% (super-linear speedup)?
**Answer**: In our 2-thread test ($T_1 = 1326\text{ ms}$, $T_2 = 641\text{ ms}$), efficiency was $103.4\%$. This is caused by:
1. **OS Page Cache Warming**: The 1-thread baseline ran first as a cold run, incurring physical disk latency. The 2-thread run executed immediately afterward when directory inodes and file blocks were already cached in Windows RAM.
2. **Cache Memory Doubling**: Two threads running on separate physical cores utilize twice the dedicated L1/L2 hardware CPU cache (512 KB $\times$ 2), reducing L3 cache misses for chunk buffers.
3. **I/O Interleaving**: While one thread computes SHA-256 in CPU registers, the other thread reads from the OS buffer, eliminating CPU idle stalls.
- **Reference**: [`docs/benchmark-analysis.md`](file:///C:/Users/OMEN/Downloads/osproject/docs/benchmark-analysis.md#5-analysis-of-observed-super-linear-efficiency-at-2-threads)

---

### Q13: What are the project's known limitations?
**Answer**:
1. Filesystem page caching causes subsequent runs to execute faster than initial cold runs.
2. The current custom HTTP server handles standard HTTP/1.1 requests sequentially per connection rather than through an asynchronous epoll/kqueue event loop.
3. Extremely large single files (e.g., 50 GB) are processed sequentially by one worker thread rather than using block-level parallel hashing (e.g., Merkle trees).
- **Reference**: [`README.md`](file:///C:/Users/OMEN/Downloads/osproject/README.md#known-limitations)

---

### Q14: How does your code prevent deadlocks and race conditions?
**Answer**:
- **No Circular Locking**: Mutexes are never acquired hierarchically; threads acquire at most one mutex at a time (`m_queueMutex` or `hashGroupsMutex`), completely eliminating the possibility of circular wait deadlocks.
- **Lock Decoupling**: In `ThreadPool.cpp`, `m_queueMutex` is unlocked *before* invoking `task(workerId)`. The lock is held for microseconds, minimizing lock contention.
- **RAII Locks**: All critical sections use `std::lock_guard` or `std::unique_lock`, guaranteeing that locks are automatically released even if exceptions occur.
- **Reference**: [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L45-L53)

---

### Q15: Why does `FileHasher` stream files in 64 KB chunks instead of loading them whole?
**Answer**: Reading an entire file into memory with `std::ifstream::seekg` and `read` requires memory equal to file size. Processing ten 2 GB files simultaneously would require 20 GB of RAM, causing memory allocation failures or swapping. A 64 KB buffer maintains a constant $O(1)$ memory footprint per worker regardless of file size, streaming gigabytes of data through the SHA-256 state structure smoothly.
- **Reference**: [`FileHasher.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/FileHasher.cpp#L19-L33)

---

### Q16: How does recursive directory traversal handle symbolic links and permission errors?
**Answer**:
1. `std::filesystem::directory_options::skip_permission_denied` instructs the directory iterator to bypass access-denied folders without throwing unhandled exceptions.
2. `entry.is_symlink(ec)` checks ensure symbolic links and directory junctions are skipped, preventing infinite loops caused by circular directory links.
3. Every directory entry evaluation is wrapped in a `try ... catch` block to isolate individual unreadable files.
- **Reference**: [`FileScanner.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/FileScanner.cpp#L54-L84)

---

### Q17: How did you implement HTTP REST without external web frameworks like Boost.Beast?
**Answer**: We implemented a lightweight HTTP/1.1 server using native Windows Sockets (`Winsock2` on Windows, POSIX sockets on Linux). The server binds a TCP socket on port 8080, listens for client connections, reads the HTTP request line and headers, parses query paths and JSON bodies, dispatches to matching endpoints, and transmits formatted HTTP/1.1 JSON responses with CORS headers before closing the client socket.
- **Reference**: [`ApiServer.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ApiServer.cpp#L280-L325)

---

### Q18: What is Amdahl's Law and how does it apply to your benchmark results?
**Answer**: Amdahl's Law states that maximum speedup is limited by the sequential fraction of the program:
$$S(n) = \frac{1}{(1-p) + \frac{p}{n}}$$
In our benchmark, 8 threads achieved a 4.16× speedup (not 8×) because sequential tasks (directory traversal, task queue synchronization, and collision map insertion) account for ~13.2% of total runtime, placing a theoretical speedup ceiling of ~7.58× on this dataset.
- **Reference**: [`docs/benchmark-analysis.md`](file:///C:/Users/OMEN/Downloads/osproject/docs/benchmark-analysis.md#4-mathematical-modeling--amdahls-law)

---

### Q19: How does dynamic queue scheduling prevent worker thread starvation?
**Answer**: Files vary radically in size (e.g., 4 KB vs. 400 MB). If tasks were statically divided upfront (e.g., assigning 50 files to each worker), a thread assigned one large file would still be hashing long after the others sat idle. With our dynamic FIFO queue, threads dequeue a new file immediately upon completing their previous file. Workers assigned smaller files automatically process more tasks, balancing the load dynamically.
- **Reference**: [`ThreadPool.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/ThreadPool.cpp#L32-L44)

---

### Q20: What is the difference between concurrency and parallelism in your architecture?
**Answer**:
- **Concurrency**: An architectural property where multiple tasks are in progress at the same time (e.g., the main scan thread orchestrating directory traversal while worker threads consume tasks from the queue).
- **Parallelism**: A hardware property where multiple worker threads physically execute SHA-256 compression loops simultaneously on distinct CPU cores at the exact same clock cycle.
- **Reference**: [`docs/os-concepts.md`](file:///C:/Users/OMEN/Downloads/osproject/docs/os-concepts.md#23-concurrency-vs-parallelism)

---

### Q21: How are hash collisions handled if two distinct files produce the same SHA-256 digest?
**Answer**: In `DuplicateDetector.cpp`, duplicate grouping uses a composite key:
```cpp
struct GroupKey { uint64_t size; std::string hash; };
```
Files must match **both identical byte size AND identical SHA-256 hash**. Because SHA-256 has a $2^{256}$ keyspace with zero known practical collisions, this composite key guarantees that files grouped together are genuine duplicates.
- **Reference**: [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L100-L112)

---

### Q22: How does cooperative scan cancellation work?
**Answer**: We avoid calling dangerous OS primitives like `TerminateThread()`, which cause memory leaks and leave mutexes locked. Instead, cancellation is cooperative: `POST /api/v1/scan/stop` sets `m_stopRequested.store(true)`. The recursive directory iterator and worker task lambdas check `if (m_stopRequested.load()) break;` at every loop iteration, exiting gracefully and joining threads cleanly.
- **Reference**: [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L134), [`DuplicateDetector.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/DuplicateDetector.cpp#L172)

---

### Q23: What is the behavior if a file is modified or locked during a scan?
**Answer**: If a file is opened exclusively by another process (e.g., a database or Word document), `std::ifstream::is_open()` evaluates to `false`. `FileHasher` returns an empty string `""`. `DuplicateDetector` checks `if (!hash.empty())` before inserting into collision maps. Unreadable files are skipped safely without crashing the worker thread or corrupting the results.
- **Reference**: [`FileHasher.cpp`](file:///C:/Users/OMEN/Downloads/osproject/backend/src/FileHasher.cpp#L13-L16)

---

### Q24: Why can't the Next.js frontend scan local drives directly from a web browser?
**Answer**: Web browsers enforce strict security sandboxing to prevent malicious websites from reading arbitrary local hard drive files (e.g., stealing passwords or SSH keys). Browser JavaScript has no direct POSIX or Win32 filesystem API access. Therefore, THREAD//SCAN uses a native C++ backend daemon that runs with host OS permissions, exposing an HTTP API that the browser UI queries.
- **Reference**: [`docs/setup-and-deployment.md`](file:///C:/Users/OMEN/Downloads/osproject/docs/setup-and-deployment.md#5-deployment-architecture-current-reality-vs-future-architecture)

---

### Q25: What future improvements would you implement in Phase 2?
**Answer**:
1. **Partial-Hashing Pre-Filter**: For files $>10\text{ MB}$, compute a fast hash (e.g., xxHash3) on the first and last 64 KB before computing full SHA-256, further reducing disk I/O.
2. **Automated File Actions**: Provide safe symlinking, hardlinking, or deletion options directly from the Duplicates UI.
3. **Cross-Platform Packaging**: Package the C++ daemon as a system tray service for Windows, macOS, and Linux.
- **Reference**: [`README.md`](file:///C:/Users/OMEN/Downloads/osproject/README.md#future-enhancements)
