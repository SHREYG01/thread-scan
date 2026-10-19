# THREAD//SCAN — Comprehensive Verification & Testing Plan

This document establishes the test specification, test cases, automated validation suites, and execution logs for **THREAD//SCAN**.

---

## 1. Test Methodology & Status Taxonomy

To maintain scientific integrity and avoid unfounded claims, test cases are categorized strictly by execution outcome:
- **PASS**: The test case was physically executed against the live C++ backend and Next.js frontend, and the actual result matched the expected result.
- **FAIL**: The test case was physically executed, and the result failed to meet specifications or triggered an unhandled exception.
- **NOT RUN**: The test case is specified as part of the test matrix for future expansion or qualification, but was not executed in the current session due to stated safety/time boundaries.
- **BLOCKED**: Execution was prevented by an external prerequisite failure.

---

## 2. Test Execution Matrix

| Test ID | Category | Description | Preconditions | Status | Evidence Reference |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-BLD-01** | Build | C++ Backend Compilation | GCC 14.2.0, Winsock2 | **PASS** | [`thread_scan_server.exe`](file:///c:/Users/OMEN/Downloads/osproject/backend/thread_scan_server.exe) |
| **TC-BLD-02** | Build | Frontend Lint & Production Build | Node.js v24, Next.js 16 Turbopack | **PASS** | `npm run lint` / `npm run build` |
| **TC-DIR-01** | Functional | Normal Directory Scan | Target directory exists with readable files | **PASS** | [`api_scan_metrics_multi4.json`](./evidence/api_scan_metrics_multi4.json) |
| **TC-DUP-01** | Functional | True Duplicate Detection | 2 identical files exist with different names | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-COL-01** | Algorithmic | Same-Size Different-Content Handling | 2 files of identical size but distinct content | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-DUP-02** | Functional | Multi-Way Duplicate Group (Triplet) | 3 identical files exist in target | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-DIR-02** | Boundary | Empty Directory Handling | Target directory contains 0 files | **PASS** | [`api_scan_metrics_empty.json`](./evidence/api_scan_metrics_empty.json) |
| **TC-DIR-03** | Structural | Deeply Nested Directories | Files organized across 4+ nested folder levels | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-CHK-01** | Algorithmic | Chunked Stream Hashing (Large File) | 12 MB binary file exceeding 64 KB buffer | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-MOD-01** | Concurrency | Single-Thread Sequential Execution | Engine configured with `mode: "single"`, 1 thread | **PASS** | [`api_scan_metrics_single.json`](./evidence/api_scan_metrics_single.json) |
| **TC-MOD-02** | Concurrency | Multi-Thread Worker Pool Execution | Engine configured with `mode: "multi"`, 4 threads | **PASS** | [`api_scan_metrics_multi4.json`](./evidence/api_scan_metrics_multi4.json) |
| **TC-TEL-01** | Telemetry | Real Worker State Transitions | Active multi-threaded scan running | **PASS** | [`api_threads_multi4.json`](./evidence/api_threads_multi4.json) |
| **TC-TEL-02** | Telemetry | Post-Scan Worker State Retention | Completed scan with 4 worker slots | **PASS** | [`screenshot_threads.png`](./evidence/screenshot_threads.png) |
| **TC-BEN-01** | Performance | Benchmark Consistency Across 1, 2, 4, 8 Threads | Deterministic benchmark dataset present | **PASS** | [`api_benchmark_trial2.json`](./evidence/api_benchmark_trial2.json) |
| **TC-ERR-01** | Robustness | Invalid Target Path Handling | Target directory path does not exist on disk | **PASS** | [`api_scan_metrics_invalid.json`](./evidence/api_scan_metrics_invalid.json) |
| **TC-NET-01** | Resilience | Frontend Offline / Backend Disconnection | C++ daemon stopped while UI is active | **PASS** | [`screenshot_disconnected.png`](./evidence/screenshot_disconnected.png) |
| **TC-LGC-01** | Stress | Large Dataset Scalability ($\ge 10,000$ files) | High-density directory tree ($\ge 5\text{ GB}$) | **NOT RUN** | Not run to protect disk write wear |
| **TC-CON-01** | Stress | Concurrent File Mutation During Scan | In-flight write to candidate file | **NOT RUN** | Requires race condition injector |

---

## 3. Detailed Test Case Specifications & Results

### TC-BLD-01: C++ Backend Compilation
- **Objective**: Verify that the C++17 engine compiles cleanly with static runtime linking on Windows MinGW-W64.
- **Command**:
  ```powershell
  & "C:\Program Files\CodeBlocks\MinGW\bin\g++.exe" -std=c++17 -O2 -static -static-libgcc -static-libstdc++ -Ibackend/src backend/src/main.cpp backend/src/Sha256.cpp backend/src/ThreadPool.cpp backend/src/FileScanner.cpp backend/src/FileHasher.cpp backend/src/DuplicateDetector.cpp backend/src/Benchmark.cpp backend/src/ApiServer.cpp -o backend/thread_scan_server.exe -lws2_32
  ```
- **Expected Result**: Exit code 0, binary created, no missing symbol errors.
- **Actual Result**: Exit code 0, `thread_scan_server.exe` created (3,342,496 bytes).
- **Status**: **PASS**

---

### TC-BLD-02: Frontend Lint & Production Build
- **Objective**: Verify zero lint warnings and successful production build generation with Turbopack.
- **Commands**:
  ```powershell
  npm --prefix frontend run lint
  npm --prefix frontend run build
  ```
- **Expected Result**: 0 ESLint errors; all 10 Next.js routes prerendered statically.
- **Actual Result**: ESLint completed with 0 errors. Turbopack generated 10 static routes (`/`, `/_not-found`, `/activity`, `/benchmark`, `/duplicates`, `/overview`, `/system`, `/threads`).
- **Status**: **PASS**

---

### TC-DIR-01: Normal Directory Scan
- **Objective**: Verify recursive directory traversal and accurate file discovery.
- **Preconditions**: `C:\thread-scan-test-dataset` created with 11 files (24.0 MB total).
- **Execution**: `POST /api/v1/scan/start` on target directory with 4 threads.
- **Expected Result**: `filesDiscovered: 11`, `filesProcessed: 11`.
- **Actual Result**: `filesDiscovered: 11`, `filesProcessed: 11`, `status: "completed"`.
- **Status**: **PASS**

---

### TC-DUP-01: True Duplicate Detection
- **Objective**: Verify that byte-identical files with distinct filenames are clustered into a duplicate group.
- **Preconditions**: `pair_exact\alpha_original.txt` and `pair_exact\alpha_copy.txt` (55 bytes).
- **Execution**: Query `GET /api/v1/duplicates`.
- **Expected Result**: Duplicate group formed with SHA-256 `7333c157fb017af412524cc45c3de5885f00b5ff010384a9694b0218e46eaf6a`, `fileCount: 2`.
- **Actual Result**: Identified in `GRP-003` with exact matching SHA-256 and both file paths listed.
- **Status**: **PASS**

---

### TC-COL-01: Same-Size Different-Content Handling (Collision Resistance)
- **Objective**: Verify that files sharing identical sizes but differing contents are hashed in Stage 2 but excluded from duplicate groups.
- **Preconditions**: `collision_file_A.dat` and `collision_file_B.dat` both have size 1024 bytes, but different payload bytes.
- **Execution**: Query `GET /api/v1/duplicates`.
- **Expected Result**: Neither file appears in any duplicate group.
- **Actual Result**: 0 duplicate groups formed for size 1024 bytes. Both files were safely discarded after cryptographic comparison.
- **Status**: **PASS**

---

### TC-DUP-02: Multi-Way Duplicate Detection (Triplet)
- **Objective**: Verify grouping when more than two copies of a file exist.
- **Preconditions**: `triplet_1.bin`, `triplet_2.bin`, `triplet_3.bin` (730 bytes).
- **Execution**: Query `GET /api/v1/duplicates`.
- **Expected Result**: Single group with `fileCount: 3`, `wastedBytes: 1460`.
- **Actual Result**: Group `GRP-004` formed containing all 3 paths, hash `a32693c6e...`, `wastedBytes: 1460`.
- **Status**: **PASS**

---

### TC-DIR-02: Empty Directory Handling
- **Objective**: Verify engine response on an empty directory containing 0 files.
- **Preconditions**: Folder `C:\thread-scan-test-dataset\empty_dir` contains 0 items.
- **Execution**: `POST /api/v1/scan/start` on empty directory.
- **Expected Result**: `filesDiscovered: 0`, `duplicateGroups: 0`, HTTP 200 OK without crash or division by zero.
- **Actual Result**: Traversal completed in 0 ms, returned `filesDiscovered: 0`, `duplicateGroups: 0`, duplicate array `[]`.
- **Status**: **PASS**

---

### TC-DIR-03: Deeply Nested Directory Structure
- **Objective**: Verify recursive traversal traverses nested subfolder structures.
- **Preconditions**: `nested\root_level.txt` and `nested\level1\level2\level3\deep_copy.txt` (43 bytes).
- **Execution**: Query `GET /api/v1/duplicates`.
- **Expected Result**: Group `GRP-002` connects both files despite depth difference.
- **Actual Result**: Group `GRP-002` formed with both paths and matching SHA-256 `49189c85...`.
- **Status**: **PASS**

---

### TC-CHK-01: Chunked Stream Hashing (Large File)
- **Objective**: Verify that files larger than the 64 KB read buffer are correctly hashed across multiple read cycles.
- **Preconditions**: Two 12 MB files (`chunked_large_12mb.bin` and `chunked_large_12mb_replica.bin`, each 12,582,912 bytes).
- **Execution**: Query `GET /api/v1/duplicates`.
- **Expected Result**: Group `GRP-001` formed with SHA-256 `2e49fbbe6718641b509e58e7259fec21c3758f317471ce5ec9ef14afdba649c7`.
- **Actual Result**: Group `GRP-001` formed with exact SHA-256 computed across 192 successive 64 KB chunks per file.
- **Status**: **PASS**

---

### TC-MOD-01 & TC-MOD-02: Single-Thread vs. Multithread Parity
- **Objective**: Verify that multithreaded worker execution produces identical duplicate groupings to sequential single-threaded execution.
- **Single-Thread**: 181 ms, 132.62 MB/s, 4 duplicate groups (`GRP-001` – `GRP-004`).
- **Multi-Thread (4 Workers)**: 101 ms, 237.67 MB/s, identical 4 duplicate groups (`GRP-001` – `GRP-004`).
- **Speedup**: 1.79x faster with 0 algorithmic variance.
- **Status**: **PASS**

---

### TC-ERR-01: Invalid Target Path Handling
- **Objective**: Ensure the backend does not crash when an invalid or non-existent path is submitted.
- **Execution**: `POST /api/v1/scan/start` with `{"targetDirectory": "C:\\non_existent_folder_thread_scan_999"}`.
- **Expected Result**: Graceful empty scan completion without exception.
- **Actual Result**: Handled safely with `filesDiscovered: 0`, HTTP 200 OK.
- **Status**: **PASS**

---

### TC-NET-01: Frontend Disconnection Resilience
- **Objective**: Verify frontend UI gracefully communicates disconnection when C++ daemon is stopped.
- **Execution**: Terminate backend daemon; request `http://localhost:3000/overview`.
- **Expected Result**: UI renders disconnected banner; does not throw unhandled React runtime error.
- **Actual Result**: Rendered disconnected state banner with reconnecting polling indicator.
- **Status**: **PASS**
