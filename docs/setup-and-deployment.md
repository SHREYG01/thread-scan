# THREAD//SCAN — Setup, Compilation & Deployment Guide

This guide provides end-to-end instructions for building, running, and configuring **THREAD//SCAN** on Windows systems.

---

## 1. System Requirements & Prerequisites

### 1.1 Verified Toolchain Versions
| Component | Minimum Version | Recommended / Verified Version | Role |
| :--- | :--- | :--- | :--- |
| **Operating System** | Windows 10 (64-bit) | Windows 11 (64-bit, Build 22621+) | Host Execution Environment |
| **C++ Compiler** | C++17 compliant | GCC 14.2.0 (MinGW-W64 / CodeBlocks) or MSVC 2019+ | Native Backend Compilation |
| **Build System** | CMake 3.15+ | CMake 3.28+ (Optional for direct GCC) | Build Automation |
| **Node.js Runtime** | Node.js v18.17+ | Node.js v20.x or v22.x LTS | Frontend Runtime |
| **Package Manager** | npm 9+ | npm 10+ | Frontend Dependencies |
| **Shell** | Windows PowerShell 5.1+ | PowerShell 7+ (Core) | Script Execution & Automation |

### 1.2 Path & Tool Verification
Verify your toolchain from Windows PowerShell:
```powershell
# 1. Verify C++ Compiler
g++ --version
# Expected: g++ (MinGW-W64 ...) 14.2.0 (or compatible)

# 2. Verify CMake (if using CMake build)
cmake --version

# 3. Verify Node.js and npm
node -v
npm -v
```

---

## 2. Backend Compilation & Execution

The backend can be built either via **CMake** or directly using **GCC / MinGW-W64**.

### Option A: Direct Compilation with MinGW-W64 (Fastest & Verified)
From the project root (`C:\Users\OMEN\Downloads\osproject`):
```powershell
# Compile with static standard libraries and Winsock2 link:
& "C:\Program Files\CodeBlocks\MinGW\bin\g++.exe" -std=c++17 -O2 -static -static-libgcc -static-libstdc++ -Ibackend/src backend/src/main.cpp backend/src/Sha256.cpp backend/src/ThreadPool.cpp backend/src/FileScanner.cpp backend/src/FileHasher.cpp backend/src/DuplicateDetector.cpp backend/src/Benchmark.cpp backend/src/ApiServer.cpp -o backend/thread_scan_server.exe -lws2_32
```

> [!TIP]
> **Static Linking Flag Rationale**:
> Passing `-static -static-libgcc -static-libstdc++` ensures the compiled `.exe` runs on any Windows machine without requiring external `libgcc_s_seh-1.dll` or `libstdc++-6.dll` runtime dependencies.

### Option B: Build via CMake
```powershell
cd backend
cmake -B build -G "MinGW Makefiles"
cmake --build build --config Release
cd ..
```
The resulting executable will be placed in `backend/build/thread_scan_server.exe`.

### Running the Backend Daemon
```powershell
# Run on default port 8080:
.\backend\thread_scan_server.exe

# Or specify custom port:
.\backend\thread_scan_server.exe 8085
```

The daemon prints the following banner upon successful startup:
```text
======================================================
  THREAD//SCAN - Concurrent Filesystem Analyzer
  Operating Systems Project | C++17 Multithreaded Core
======================================================
  * Standard: C++17
  * Threads: std::thread, std::mutex, std::condition_variable
  * Hardware Concurrency: 16 logical processors
  * REST API: http://127.0.0.1:8080
======================================================
```

---

## 3. Frontend Installation & Execution

### 3.1 Install Dependencies
From the project root:
```powershell
npm --prefix frontend install
```

### 3.2 Environment Configuration
Create or edit `frontend/.env.local` to configure the backend API endpoint:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```
If omitted, `frontend/src/lib/api/client.ts` defaults to `http://localhost:8080`.

### 3.3 Run Next.js Development Server
```powershell
# Start dev server on http://localhost:3000:
npm --prefix frontend run dev
```
Open your browser to:
```text
http://localhost:3000
```

### 3.4 Production Build & Run
```powershell
# Compile optimized production bundle:
npm --prefix frontend run build

# Start production server:
npm --prefix frontend run start
```

---

## 4. Local Troubleshooting & FAQ

### Issue 1: `Connection refused: Backend offline`
- **Symptom**: Frontend displays `BACKEND OFFLINE` status pill.
- **Root Cause**: `thread_scan_server.exe` is not running or is blocked by Windows Defender Firewall.
- **Fix**:
  1. Verify the process is running in PowerShell: `Get-Process thread_scan_server`.
  2. Verify HTTP health probe: `Invoke-RestMethod http://127.0.0.1:8080/api/v1/health`.
  3. Ensure Windows Defender Firewall allows loopback TCP traffic on port 8080.

### Issue 2: `Port 8080 already in use`
- **Symptom**: Backend crashes or fails to bind socket.
- **Fix**:
  ```powershell
  # Identify process using port 8080:
  Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess
  # Terminate previous lingering instance:
  Stop-Process -Name thread_scan_server -Force
  ```

### Issue 3: Windows File Path Backslash Formatting
- **Symptom**: Submitting paths with unescaped backslashes fails in JSON requests.
- **Fix**: When submitting paths through curl or PowerShell, escape backslashes (e.g., `C:\\thread-scan-test`) or use forward slashes (e.g., `C:/thread-scan-test`). The C++ backend automatically normalizes paths using `std::filesystem::path::lexically_normal()`.

---

## 5. Deployment Architecture: Current Reality vs. Future Architecture

### 5.1 Current Working Architecture (Local Dual-Tier Model)
In the current implementation:
- Both the **Next.js frontend** and **C++ backend daemon** execute locally on the user's workstation.
- The web browser communicates with the backend via loopback networking (`http://127.0.0.1:8080`).
- Because the C++ daemon runs natively on the host OS, it has direct, full-speed access to physical local storage (`C:\`, `D:\`, NVMe/SATA drives).

```
┌────────────────────────────────────────────────────────┐
│ USER WORKSTATION (Local Environment)                   │
│                                                        │
│  ┌──────────────────────┐     ┌─────────────────────┐  │
│  │ Browser UI           │     │ Native C++ Backend  │  │
│  │ http://localhost:3000│────▶│ http://127.0.0.1:8080│  │
│  └──────────────────────┘     └──────────┬──────────┘  │
│                                          │             │
│                                          ▼             │
│                               ┌─────────────────────┐  │
│                               │ Local Filesystem    │  │
│                               │ (C:\, D:\ SSD/HDD)  │  │
│                               └─────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### 5.2 Future Architecture & Web Browser Sandboxing Constraints
A frequent architectural question in college evaluations is: *"Can we deploy the Next.js frontend to Vercel/AWS so anyone can scan their local computer?"*

#### The Browser Security Constraint
Due to strict **browser sandbox security policies**, web applications hosted on cloud domains (`https://thread-scan.vercel.app`) **cannot directly access local files or paths on a client's machine**. Web APIs like the File System Access API (`showDirectoryPicker`) require manual, interactive permission prompts and do not provide synchronous low-level inode traversal or direct POSIX path access.

#### Proposed Hybrid Architecture (Client Daemon + Cloud UI)
To support a cloud-hosted frontend while preserving local filesystem scanning:
1. The web interface is hosted publicly on Vercel/AWS.
2. The user downloads and executes a lightweight, standalone `thread_scan_daemon.exe` on their local machine.
3. The cloud UI connects to `http://127.0.0.1:8080` on the user's machine (via local agent communication).
4. The local C++ engine scans local storage and streams JSON telemetry back to the cloud UI.

> [!IMPORTANT]
> **Implementation Clarification**:
> Cross-computer cloud deployment is **not** currently implemented. The system operates strictly as a **local dual-tier developer utility** running both tiers on the same host machine.
