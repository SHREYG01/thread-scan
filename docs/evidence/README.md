# THREAD//SCAN — Empirical Verification Evidence Register

This directory contains verified execution artifacts, raw REST API JSON responses, and headless browser UI screenshots captured from live runs of the **THREAD//SCAN** engine and workstation interface.

---

## 1. Directory Inventory

### 1.1 Live Workstation UI Screenshots
Screenshots were captured using Microsoft Edge headless rendering (`msedge.exe --headless --window-size=1400,900`) against the production Next.js interface (`http://localhost:3000`).

| Screenshot File | Target Route | Description & Validated State |
| :--- | :--- | :--- |
| [`screenshot_overview.png`](./screenshot_overview.png) | `/overview` | Main control console displaying live metric stat counters, scan mode selection, and quick action launch triggers. |
| [`screenshot_duplicates.png`](./screenshot_duplicates.png) | `/duplicates` | Tabular and grouped view of identified duplicate clusters, SHA-256 hashes, file counts, and reclaimable storage. |
| [`screenshot_threads.png`](./screenshot_threads.png) | `/threads` | Multithreaded telemetry console displaying per-worker status (`active`, `idle`, `completed`), current file, files processed, and processing duration. |
| [`screenshot_benchmark.png`](./screenshot_benchmark.png) | `/benchmark` | Benchmark evaluation panel displaying scalability curves, speedup metrics, and Amdahl efficiency across 1, 2, 4, and 8 worker threads. |
| [`screenshot_system.png`](./screenshot_system.png) | `/system` | Diagnostic hardware inspector querying NT kernel CPU topology (16 logical cores), page size (4096 B), physical RAM, and GCC 14.2.0 runtime. |
| [`screenshot_activity.png`](./screenshot_activity.png) | `/activity` | Monospace audit log displaying chronological pipeline event streams and task lifecycle events. |
| [`screenshot_not_found.png`](./screenshot_not_found.png) | `/_not-found` | Graceful 404 error routing handling invalid paths without client runtime disruption. |
| [`screenshot_disconnected.png`](./screenshot_disconnected.png) | `/overview` (Offline) | Client resilience verification showing disconnected status banner and error handling when the C++ backend daemon is unreachable. |

---

### 1.2 Raw API Telemetry Evidence (JSON)

| Evidence File | Associated Test ID | Endpoint Queried | Payload / Summary |
| :--- | :--- | :--- | :--- |
| [`api_system_diagnostics.json`](./api_system_diagnostics.json) | **TC-SYS-01** | `GET /api/v1/system` | System hardware parameters, AMD Ryzen 7 7840HS, 16 logical cores, memory statistics. |
| [`api_scan_metrics_single.json`](./api_scan_metrics_single.json) | **TC-MOD-01** | `GET /api/v1/scan/metrics` | Single-threaded sequential scan metrics (181 ms, 132.62 MB/s). |
| [`api_threads_single.json`](./api_threads_single.json) | **TC-MOD-01** | `GET /api/v1/threads` | Single worker slot telemetry verifying Thread 1 processed all 11 candidate files. |
| [`api_duplicates_single.json`](./api_duplicates_single.json) | **TC-DUP-01** | `GET /api/v1/duplicates` | 4 duplicate clusters identified under single-threaded mode. |
| [`api_scan_metrics_multi4.json`](./api_scan_metrics_multi4.json) | **TC-MOD-02** | `GET /api/v1/scan/metrics` | 4-thread worker pool scan metrics (101 ms, 237.67 MB/s, 1.79x speedup). |
| [`api_threads_multi4.json`](./api_threads_multi4.json) | **TC-TEL-01**, **TC-TEL-02** | `GET /api/v1/threads` | 4 worker threads telemetry confirming balanced workload partition (3, 3, 3, 2 files). |
| [`api_duplicates_multi4.json`](./api_duplicates_multi4.json) | **TC-DUP-01**, **TC-COL-01** | `GET /api/v1/duplicates` | 4 duplicate clusters under multithreading, identical to single-threaded output. |
| [`api_scan_metrics_empty.json`](./api_scan_metrics_empty.json) | **TC-DIR-02** | `GET /api/v1/scan/metrics` | Empty directory response (`filesDiscovered: 0`, 0 ms, 0 duplicates). |
| [`api_duplicates_empty.json`](./api_duplicates_empty.json) | **TC-DIR-02** | `GET /api/v1/duplicates` | Empty array `[]` confirmed with no memory faults. |
| [`api_scan_metrics_invalid.json`](./api_scan_metrics_invalid.json) | **TC-ERR-01** | `GET /api/v1/scan/metrics` | Non-existent path response handled cleanly (`filesDiscovered: 0`). |
| [`api_activity_logs.json`](./api_activity_logs.json) | **TC-LOG-01** | `GET /api/v1/logs` | Real-time structured log buffer capturing scanner and pipeline event dispatch. |
| [`api_benchmark_trial1.json`](./api_benchmark_trial1.json) | **TC-BEN-01** | `GET /api/v1/benchmark/latest` | Cold cache trial (1T: 4757 ms $\to$ 8T: 297 ms). |
| [`api_benchmark_trial2.json`](./api_benchmark_trial2.json) | **TC-BEN-01** | `GET /api/v1/benchmark/latest` | Warm cache trial (1T: 1074 ms $\to$ 8T: 285 ms). |
| [`api_benchmark_trial3.json`](./api_benchmark_trial3.json) | **TC-BEN-01** | `GET /api/v1/benchmark/latest` | Steady-state verification trial (1T: 1124 ms $\to$ 8T: 312 ms). |

---

## 2. Test Execution Environment

- **Operating System**: Windows 11 Enterprise (NT Kernel, x86_64)
- **Processor**: AMD Ryzen 7 7840HS w/ Radeon 780M Graphics (8 Physical Cores, 16 Logical Processors)
- **Compiler**: MinGW-W64 GCC 14.2.0 (`-std=c++17 -O2 -static -static-libgcc -static-libstdc++`)
- **Runtime Environment**: Node.js v24.13.1, Next.js 16.3.8 (Turbopack production build)
- **Controlled Dataset**: `C:\thread-scan-test-dataset` (11 files, 24.0 MB total)
- **Benchmark Dataset**: `C:\thread-scan-benchmark` (500 files, 133.3 MB total, 100 duplicate groups)
