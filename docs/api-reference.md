# THREAD//SCAN — REST API Specification & Endpoint Reference

The **THREAD//SCAN** native C++ backend serves an embedded, non-blocking HTTP REST API on `http://127.0.0.1:8080` (or a custom port specified via CLI argument). All responses include standard CORS headers allowing direct browser consumption.

---

## 1. Global Server Information & Headers

### Base URL
```text
http://127.0.0.1:8080
```

### Standard Response Headers
All HTTP responses return the following headers:
```http
Content-Type: application/json; charset=utf-8
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization, Accept
Connection: close
```

### CORS Preflight (`OPTIONS *`)
Any HTTP request using method `OPTIONS` immediately returns `204 No Content` with appropriate CORS approval headers.

---

## 2. Endpoint Catalog Summary

| Method | Endpoint Route | Alternative Route | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | `/health` | Lightweight service health probe |
| `GET` | `/api/v1/system` | `/api/system` | Host CPU topology, RAM limits, and compiler telemetry |
| `POST` | `/api/v1/scan/start` | `/api/scan` | Initiate asynchronous recursive duplicate scan |
| `POST` | `/api/v1/scan/stop` | — | Signal cooperative abort to active scan |
| `GET` | `/api/v1/scan/metrics` | `/api/v1/scan/status` | Real-time atomic counters and throughput |
| `GET` | `/api/v1/duplicates` | — | Retrieve duplicate clusters from latest completed scan |
| `GET` | `/api/v1/threads` | — | Query worker thread telemetry and active file states |
| `POST` | `/api/v1/benchmark/run` | `/api/benchmark` | Launch Amdahl's Law benchmark across 1, 2, 4, 8 threads |
| `GET` | `/api/v1/benchmark/latest`| — | Retrieve latest completed benchmark data |
| `GET` | `/api/v1/logs` | `/api/activity` | Stream system, worker, and scanner event logs |

---

## 3. Endpoint Reference

### 3.1 Health Check Probe

Returns a heartbeat confirming the native C++ engine is active and accepting connections.

- **Method**: `GET`
- **Path**: `/api/v1/health` (or `/health`)
- **Headers**: None required
- **Body**: None
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "service": "THREAD//SCAN C++17"
  }
  ```

#### Example Usage
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/health" -Method Get
```
```bash
curl -X GET http://127.0.0.1:8080/api/v1/health
```

---

### 3.2 System Diagnostics

Collects native host operating system details, memory statistics, processor core topology, and compiler specifications.

- **Method**: `GET`
- **Path**: `/api/v1/system` (or `/api/system`)
- **Headers**: None required
- **Body**: None
- **Response**: `200 OK`
  ```json
  {
    "os": "Windows (NT Kernel)",
    "kernel": "Win32 Subsystem",
    "cpuModel": "AMD Ryzen 7 5800H with Radeon Graphics",
    "logicalProcessors": 16,
    "physicalCores": 8,
    "architecture": "x86_64",
    "availableThreads": 16,
    "pageSizeBytes": 4096,
    "memoryTotalBytes": 16488349696,
    "memoryFreeBytes": 6928420864,
    "backendConnected": true,
    "backendVersion": "1.0.0 (C++17 Engine)",
    "compiler": "GCC 14.2.0 (C++17 POSIX SEH)"
  }
  ```

#### Example Usage
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/system" -Method Get
```

---

### 3.3 Start Directory Scan

Initiates a background directory traversal and duplicate detection job.

- **Method**: `POST`
- **Path**: `/api/v1/scan/start` (or `/api/scan`)
- **Headers**: `Content-Type: application/json`
- **Body Schema**:
  | Field | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `targetDirectory` | string | Yes (or `directory`) | `"."` | Absolute or relative root directory to scan |
  | `mode` | string | No | `"multi"` | `"single"` (sequential baseline) or `"multi"` (thread pool) |
  | `threadCount` | integer | No | `4` | Worker threads to spawn (clamped to $\ge 1$) |
- **Example Request Body**:
  ```json
  {
    "targetDirectory": "C:\\thread-scan-test",
    "mode": "multi",
    "threadCount": 4
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "scanId": "SCAN-1791225508",
    "started": true
  }
  ```

#### Example Usage
```powershell
$body = @{
    targetDirectory = "C:\thread-scan-test"
    mode = "multi"
    threadCount = 4
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/scan/start" -Method Post -Body $body -ContentType "application/json"
```

---

### 3.4 Stop Directory Scan

Signals cooperative cancellation to the active scanning and hashing threads.

- **Method**: `POST`
- **Path**: `/api/v1/scan/stop`
- **Headers**: None required
- **Body**: None
- **Response**: `200 OK`
  ```json
  {
    "stopped": true
  }
  ```

#### Example Usage
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/scan/stop" -Method Post
```

---

### 3.5 Realtime Scan Metrics

Queries atomic counters representing the live or final state of a directory scan.

- **Method**: `GET`
- **Path**: `/api/v1/scan/metrics` (or `/api/v1/scan/status`)
- **Headers**: None required
- **Body**: None
- **Response**: `200 OK`
  ```json
  {
    "status": "completed",
    "filesDiscovered": 3,
    "filesProcessed": 2,
    "bytesProcessed": 130,
    "duplicateGroups": 1,
    "duplicateFiles": 2,
    "wastedBytes": 65,
    "elapsedMs": 11,
    "throughputMBs": 0.01
  }
  ```

#### Field Explanations
- `status`: `"idle"`, `"scanning"`, `"completed"`, or `"error"`.
- `filesDiscovered`: Total recursive file entries discovered during Stage 1 traversal.
- `filesProcessed`: Candidate files whose contents were streamed through SHA-256 in Stage 2.
- `bytesProcessed`: Total bytes read from disk during file hashing.
- `duplicateGroups`: Distinct groups containing $\ge 2$ identical files.
- `duplicateFiles`: Total count of files belonging to duplicate groups.
- `wastedBytes`: Total redundant disk space that can be reclaimed ($S \times (k-1)$ per group).
- `elapsedMs`: Total wall-clock time elapsed in milliseconds.
- `throughputMBs`: Hashing throughput ($\text{Megabytes Read} / \text{Seconds}$).

---

### 3.6 Retrieve Duplicate Groups

Returns all identified duplicate file clusters from the most recent scan.

- **Method**: `GET`
- **Path**: `/api/v1/duplicates`
- **Headers**: None required
- **Body**: None
- **Response**: `200 OK` (Array of Duplicate Groups)
  ```json
  [
    {
      "id": "GRP-001",
      "hash": "79e9c1c5533b66785fb0026c6abc917189cb02e793545ed8f5fdd7b4c0418390",
      "sizeBytes": 65,
      "fileCount": 2,
      "files": [
        {
          "path": "C:\\thread-scan-test\\report.txt - Copy.txt",
          "size": 65,
          "modifiedAt": "2026-10-04 23:19:19"
        },
        {
          "path": "C:\\thread-scan-test\\report.txt.txt",
          "size": 65,
          "modifiedAt": "2026-10-04 23:19:19"
        }
      ]
    }
  ]
  ```

---

### 3.7 Worker Thread Telemetry

Returns the operational state of each worker slot in the thread pool. During active scans, returns real-time states; after a scan completes, preserves final statistics.

- **Method**: `GET`
- **Path**: `/api/v1/threads`
- **Headers**: None required
- **Body**: None
- **Response**: `200 OK` (Array of Worker States)
  ```json
  [
    {
      "id": 1,
      "label": "THREAD 01",
      "status": "completed",
      "currentFile": "C:\\thread-scan-test\\report.txt.txt",
      "filesProcessed": 1,
      "bytesProcessed": 65,
      "elapsedTimeMs": 1
    },
    {
      "id": 2,
      "label": "THREAD 02",
      "status": "completed",
      "currentFile": "C:\\thread-scan-test\\report.txt - Copy.txt",
      "filesProcessed": 1,
      "bytesProcessed": 65,
      "elapsedTimeMs": 1
    },
    {
      "id": 3,
      "label": "THREAD 03",
      "status": "idle",
      "currentFile": "Awaiting task dispatch",
      "filesProcessed": 0,
      "bytesProcessed": 0,
      "elapsedTimeMs": 0
    },
    {
      "id": 4,
      "label": "THREAD 04",
      "status": "idle",
      "currentFile": "Awaiting task dispatch",
      "filesProcessed": 0,
      "bytesProcessed": 0,
      "elapsedTimeMs": 0
    }
  ]
  ```

#### Worker Status Values
- `"idle"`: Worker spawned in thread pool; awaiting tasks.
- `"waiting"`: Worker has completed a task unit; waiting on condition variable for next task.
- `"reading"` / `"hashing"`: Worker is currently streaming 64 KB blocks through SHA-256.
- `"completed"`: Scan completed; worker successfully processed $\ge 1$ task.

---

### 3.8 Run Benchmark Suite

Executes an automated performance profiling suite running identical duplicate detection workloads across **1, 2, 4, and 8 threads**.

- **Method**: `POST`
- **Path**: `/api/v1/benchmark/run` (or `/api/benchmark`)
- **Headers**: `Content-Type: application/json`
- **Body Schema**:
  | Field | Type | Required | Default | Description |
  | :--- | :--- | :--- | :--- | :--- |
  | `directory` | string | No | `"C:\\thread-scan-benchmark"` | Directory path to benchmark |
  | `maxThreads` | integer | No | `8` | Upper thread limit |
- **Example Request Body**:
  ```json
  {
    "directory": "C:\\thread-scan-benchmark",
    "maxThreads": 8
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "status": "running",
    "message": "Benchmark initiated"
  }
  ```

---

### 3.9 Get Latest Benchmark Results

Retrieves the results of the most recent benchmark run, including Amdahl speedup and efficiency ratios.

- **Method**: `GET`
- **Path**: `/api/v1/benchmark/latest`
- **Headers**: None required
- **Body**: None
- **Response**: `200 OK`
  ```json
  {
    "timestamp": "2026-10-05T18:51:10Z",
    "directory": "C:\\thread-scan-benchmark",
    "totalFiles": 500,
    "totalBytes": 128272037,
    "singleThreadMs": 1326,
    "multiThreadMs": 436,
    "speedup": 3.04,
    "efficiency": 76.03,
    "points": [
      {
        "threads": 1,
        "durationMs": 1326,
        "speedup": 1.0,
        "efficiency": 100.0,
        "throughputMBs": 92.32,
        "filesProcessed": 302,
        "bytesProcessed": 128272037,
        "duplicateGroups": 100,
        "duplicateFiles": 301
      },
      {
        "threads": 2,
        "durationMs": 641,
        "speedup": 2.07,
        "efficiency": 103.43,
        "throughputMBs": 191.14,
        "filesProcessed": 302,
        "bytesProcessed": 128272037,
        "duplicateGroups": 100,
        "duplicateFiles": 301
      },
      {
        "threads": 4,
        "durationMs": 436,
        "speedup": 3.04,
        "efficiency": 76.03,
        "throughputMBs": 280.57,
        "filesProcessed": 302,
        "bytesProcessed": 128272037,
        "duplicateGroups": 100,
        "duplicateFiles": 301
      },
      {
        "threads": 8,
        "durationMs": 319,
        "speedup": 4.16,
        "efficiency": 51.96,
        "throughputMBs": 383.48,
        "filesProcessed": 302,
        "bytesProcessed": 128272037,
        "duplicateGroups": 100,
        "duplicateFiles": 301
      }
    ]
  }
  ```

---

### 3.10 Activity Event Logs

Returns chronological operational logs generated by the scanner, worker threads, and system orchestrator.

- **Method**: `GET`
- **Path**: `/api/v1/logs` (or `/api/activity`)
- **Query Parameters**:
  - `since` (optional, string): Filters events after a given ISO timestamp.
- **Headers**: None required
- **Body**: None
- **Response**: `200 OK` (Array of Log Events)
  ```json
  [
    {
      "id": "1",
      "timestamp": "17:20:46",
      "source": "system",
      "level": "info",
      "message": "THREAD//SCAN C++17 engine booted on port 8080"
    },
    {
      "id": "2",
      "timestamp": "17:20:46",
      "source": "scanner",
      "level": "info",
      "message": "File scanner initialized in read-only traversal mode"
    },
    {
      "id": "3",
      "timestamp": "17:20:46",
      "source": "worker",
      "level": "info",
      "message": "Hardware concurrency detected: 16 logical cores"
    }
  ]
  ```

---

## 4. Error Responses

If an invalid route or unhandled URI is requested, the server returns standard HTTP status codes:

### Route Not Found (`404 Not Found`)
```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
Content-Length: 27
Connection: close

{"error":"Route not found"}
```
