# THREAD//SCAN — Test Results & Execution Register

This document records the empirical results of all functional, concurrency, boundary, and stress tests executed against **THREAD//SCAN**.

**Last Updated:** 2026-10-19  
**Execution Environment:** Windows 11 Enterprise (NT Kernel), AMD Ryzen 7 7840HS (16 Logical Processors, 8 Cores), 16 GB RAM  
**Compiler / Toolchain:** MinGW-W64 GCC 14.2.0 (`-std=c++17 -O2`), Node.js v24.13.1, Next.js 16.3.8

---

## 1. Status Taxonomy

- **PASS**: Executed directly against the live environment; actual output matches the specified expectation; corroborated by evidence.
- **FAIL**: Executed directly against the live environment; output diverged from expectation or encountered an unhandled exception.
- **NOT RUN**: Deliberately omitted during the test run due to stated environmental or resource safety constraints.
- **BLOCKED**: Execution could not proceed due to an environmental dependency failure or missing system prerequisite.

---

## 2. Test Execution Summary

| Total Test Cases | PASS | FAIL | NOT RUN | BLOCKED |
| :---: | :---: | :---: | :---: | :---: |
| **14** | **13** | **0** | **1** | **0** |

---

## 3. Comprehensive Test Register

| Test ID | Category | Target / Feature | Expected Result | Actual Measured Result | Status | Corroborating Evidence |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-BLD-01** | Build | C++ Backend Compilation | GCC 14.2.0 compiles `thread_scan_server.exe` with static runtime without errors. | Exit code `0`, output binary `3,342,496 bytes`. | **PASS** | [`backend/thread_scan_server.exe`](file:///c:/Users/OMEN/Downloads/osproject/backend/thread_scan_server.exe) |
| **TC-BLD-02** | Build | Frontend Lint & Next.js Build | ESLint passes with 0 warnings/errors; Turbopack creates production static pages. | Exit code `0` on `npm run lint` and `npm run build` (10 static pages). | **PASS** | Turbopack build log |
| **TC-DIR-01** | Functional | Normal Directory Scanning | Recursively traverse `C:\thread-scan-test-dataset`, identify all 11 files. | `filesDiscovered: 11`, `filesProcessed: 11`. | **PASS** | [`api_scan_metrics_multi4.json`](./evidence/api_scan_metrics_multi4.json) |
| **TC-DUP-01** | Functional | Exact Duplicate Detection | Identify 2 identical files with different names (`alpha_original.txt` & `alpha_copy.txt`). | Group `GRP-003` formed with matching SHA-256 `7333c157fb01...`. | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-COL-01** | Algorithmic | Collision Handling (Same Size, Diff Content) | Hash both 1024-byte files (`collision_file_A.dat` & `collision_file_B.dat`), verify neither forms a duplicate. | Both processed during Stage 2; 0 duplicate groups formed for size 1024. | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-DUP-02** | Functional | Multi-Way Duplicate (Triplet) | Group 3 identical files (`triplet_1.bin`, `triplet_2.bin`, `triplet_3.bin`) into one cluster. | Group `GRP-004` formed with `fileCount: 3`, SHA-256 `a32693c6e...`. | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-DIR-02** | Boundary | Empty Directory Handling | Handle empty folder `C:\thread-scan-test-dataset\empty_dir` without crashing. | Returns `filesDiscovered: 0`, `duplicateGroups: 0`, HTTP 200 OK. | **PASS** | [`api_scan_metrics_empty.json`](./evidence/api_scan_metrics_empty.json) |
| **TC-DIR-03** | Structural | Nested Directory Traversal | Discover duplicate across depth-4 nested directory (`root_level.txt` and `deep_copy.txt`). | Group `GRP-002` formed linking files across directory hierarchies. | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-CHK-01** | Algorithmic | Chunked Stream Hashing (Large File) | Process 12 MB files across multiple 64 KB chunks, compute exact SHA-256. | Group `GRP-001` formed for `chunked_large_12mb.bin` matching SHA-256 `2e49fbbe...`. | **PASS** | [`api_duplicates_multi4.json`](./evidence/api_duplicates_multi4.json) |
| **TC-MOD-01** | Concurrency | Single-Thread Sequential Execution | Process all files sequentially on Thread 01 with `mode: "single"`. | Completed in 181 ms; Thread 01 handled 11/11 files. | **PASS** | [`api_threads_single.json`](./evidence/api_threads_single.json) |
| **TC-MOD-02** | Concurrency | Multithreaded Worker Pool Execution | Distribute hashing tasks across 4 worker threads; match single-thread results. | Completed in 101 ms (1.79x faster); identical 4 duplicate groups found. | **PASS** | [`api_threads_multi4.json`](./evidence/api_threads_multi4.json) |
| **TC-ERR-01** | Robustness | Invalid Target Path | Handle non-existent path without unhandled filesystem exception (returns HTTP 200 OK with `filesDiscovered: 0` as designed). | Handled cleanly in `FileScanner::scanDirectory` (`fs::exists` check); returns `filesDiscovered: 0`, HTTP 200 OK, no server panic. | **PASS** | [`api_scan_metrics_invalid.json`](./evidence/api_scan_metrics_invalid.json) |
| **TC-NET-01** | Resilience | Frontend Offline / Backend Disconnection | Frontend displays graceful error indicator when C++ server is halted. | UI displays disconnected banner and offline status without crashing. | **PASS** | [`screenshot_disconnected.png`](./evidence/screenshot_disconnected.png) |
| **TC-LGC-01** | Stress | Large-Scale Dataset ($\ge 10,000$ files) | 10,000 files in dedicated tree (`C:\thread-scan-stress-10k`); verify recursion, pool distribution, duplicate identification. | Completed in 2,916 ms; 10,000 discovered, 8,000 processed; all 500 pairs and 200 triplets verified; 0 collisions. | **PASS** | [`api_scan_metrics_stress_10k.json`](./evidence/api_scan_metrics_stress_10k.json) |
| **TC-CON-01** | Stress | Concurrent File Deletion / Modification During Scan | Modify file contents while hashing pipeline is active. | **NOT RUN** — Requires non-deterministic timing injection not supported in current CLI harness. | **NOT RUN** | N/A |

---

## 4. In-Depth Analysis of Critical Test Executions

### 4.1 Exact vs. Collision Differentiation (TC-DUP-01 vs. TC-COL-01)
In `C:\thread-scan-test-dataset`:
- Two files of size 55 bytes (`alpha_original.txt` and `alpha_copy.txt`) had matching content. The engine placed them in `GRP-003`.
- Two files of size 1024 bytes (`collision_file_A.dat` and `collision_file_B.dat`) had distinct content. Both passed Stage 1 (file size grouping) and were queued for cryptographic hashing in Stage 2. Their SHA-256 hashes differed:
  - `collision_file_A.dat`: `6ab72eeb9e77b07540897e0c8d6d23ec8eef0f8c3a47e1b3f4e93443d9536bed`
  - `collision_file_B.dat`: `9b6ce55f379e9771551de6939556a7e6b949814ae27c2f5cfd5dbeb378ce7c2a`
  Because no other file shared either hash, both were discarded from duplicate clustering, confirming that **file size alone never triggers false positive duplicate detections**.

### 4.2 Single-Thread vs. Multithread Parity (TC-MOD-01 vs. TC-MOD-02)
- **Single-Thread Execution**:
  - Duration: 181 ms
  - Throughput: 132.62 MB/s
  - Workers Active: Thread 01 (11 files, 25,170,258 bytes processed)
  - Duplicate Groups: 4 groups (`GRP-001` through `GRP-004`)
- **Multi-Thread Execution (4 Workers)**:
  - Duration: 101 ms
  - Throughput: 237.67 MB/s
  - Workers Active: 4 threads (Thread 01: 3 files, Thread 02: 2 files, Thread 03: 3 files, Thread 04: 3 files)
  - Duplicate Groups: 4 groups (identical file sets, hashes, and wasted bytes)
- **Conclusion**: Multithreaded execution achieves a **1.79x speedup** on a 24 MB dataset without introducing race conditions, hash corruptions, or missing duplicates.

### 4.3 10,000-File Stress Test Execution (TC-LGC-01)
- **Workload**: 10,000 files created across nested folders in `C:\thread-scan-stress-10k` (18.3 MB total):
  - 8,000 files in unique batches (with distinct and patterned byte sizes).
  - 500 exact duplicate pairs (1,000 files).
  - 200 exact duplicate triplets (600 files).
  - 200 collision pairs sharing 512 bytes with differing ASCII payloads (400 files).
- **Execution & Telemetry**:
  - Scan completed in **2,916 ms** across 8 worker threads.
  - Stage 1 discovered all 10,000 files and filtered down to 8,000 candidate files sharing sizes.
  - Stage 2 hashed 8,000 files (10,124,650 bytes) across the 8 worker threads with perfectly balanced task distribution (~1,000 tasks/worker).
  - Duplicate detection verified: 100% of the 500 duplicate pairs and 100% of the 200 duplicate triplets were correctly identified without omission.
  - Collision verification: Confirmed 0 cross-pair collisions occurred between distinct collision files.
  - **Memory & Resource Stability**: Process remained stable with no handle leakage or memory crashes. Temporary dataset was completely cleaned up following verification.
