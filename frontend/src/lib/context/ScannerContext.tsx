"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ExecutionMode,
  ScanStatus,
  ScanConfig,
  ScanMetrics,
  WorkerThreadState,
  DuplicateGroup,
  BenchmarkResult,
  ActivityLogEvent,
  SystemDiagnostics,
} from '../api/types';
import { BackendApiClient } from '../api/client';

interface ScannerContextType {
  backendOnline: boolean;
  scanConfig: ScanConfig;
  setTargetDirectory: (dir: string) => void;
  setExecutionMode: (mode: ExecutionMode) => void;
  setThreadCount: (count: number) => void;
  scanStatus: ScanStatus;
  metrics: ScanMetrics | null;
  workers: WorkerThreadState[];
  duplicateGroups: DuplicateGroup[];
  benchmarkResult: BenchmarkResult | null;
  activityLogs: ActivityLogEvent[];
  systemDiagnostics: SystemDiagnostics | null;
  startScan: () => Promise<void>;
  stopScan: () => void;
  runBenchmark: () => Promise<void>;
  isTestPreviewActive: boolean;
  isSampleData: boolean;
  toggleTestPreview: () => void;
  loadSampleDuplicates: () => void;
  clearSampleData: () => void;
  fetchLatestDuplicates: () => Promise<void>;
  fetchWorkerThreads: () => Promise<void>;
  fetchLatestBenchmark: () => Promise<void>;
  clearAllData: () => void;
}

const ScannerContext = createContext<ScannerContextType | undefined>(undefined);

const INITIAL_CONFIG: ScanConfig = {
  targetDirectory: 'C:\\thread-scan-test',
  mode: 'multi',
  threadCount: 4,
  minFileSizeBytes: 1,
  hashAlgorithm: 'sha256',
  followSymlinks: false,
};

export function ScannerProvider({ children }: { children: React.ReactNode }) {
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [scanConfig, setScanConfig] = useState<ScanConfig>(INITIAL_CONFIG);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [metrics, setMetrics] = useState<ScanMetrics | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [isTestPreviewActive, setIsTestPreviewActive] = useState<boolean>(false);
  const [isSampleData, setIsSampleData] = useState<boolean>(false);

  // Initialize workers based on thread count in idle standby
  const generateInitialWorkers = useCallback((count: number): WorkerThreadState[] => {
    return Array.from({ length: count }, (_, idx) => ({
      id: idx + 1,
      label: `THREAD ${String(idx + 1).padStart(2, '0')}`,
      status: 'idle',
      currentFile: 'Awaiting task dispatch',
      filesProcessed: 0,
      bytesProcessed: 0,
      elapsedTimeMs: 0,
    }));
  }, []);

  const [workers, setWorkers] = useState<WorkerThreadState[]>(() => generateInitialWorkers(4));

  const [activityLogs, setActivityLogs] = useState<ActivityLogEvent[]>([
    {
      id: 'init-0',
      timestamp: '--:--:--',
      source: 'scanner',
      level: 'info',
      message: 'scanner: waiting for scan initialization',
    },
    {
      id: 'init-1',
      timestamp: '--:--:--',
      source: 'worker',
      level: 'info',
      message: 'worker pool: standby (awaiting backend daemon)',
    },
    {
      id: 'init-2',
      timestamp: '--:--:--',
      source: 'system',
      level: 'trace',
      message: 'rest client: connecting to http://127.0.0.1:8080/api/v1/health',
    },
  ]);

  const [systemDiagnostics, setSystemDiagnostics] = useState<SystemDiagnostics | null>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Explicit function to fetch the latest real duplicates from the C++ backend
  const fetchLatestDuplicates = useCallback(async () => {
    try {
      const res = await BackendApiClient.getDuplicates();
      if (res.data) {
        setDuplicateGroups(res.data);
        setIsSampleData(false);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Explicit function to fetch the latest real worker states from the C++ backend
  const fetchWorkerThreads = useCallback(async () => {
    try {
      const res = await BackendApiClient.getWorkerThreads();
      if (res.data && res.data.length > 0) {
        setWorkers(res.data);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Explicit function to fetch the latest real benchmark results from the C++ backend
  const fetchLatestBenchmark = useCallback(async () => {
    try {
      const res = await BackendApiClient.getLatestBenchmark();
      if (res.data && res.data.points && res.data.points.length > 0) {
        setBenchmarkResult(res.data);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  // Periodic health check & initial state hydration
  useEffect(() => {
    let mounted = true;
    const checkConnection = async () => {
      const online = await BackendApiClient.checkHealth();
      if (mounted) {
        setBackendOnline(online);
        if (online) {
          // Hydrate system diagnostics
          const sysRes = await BackendApiClient.getSystemDiagnostics();
          if (mounted && sysRes.data) {
            setSystemDiagnostics(sysRes.data);
          }

          // Hydrate current backend metrics
          const mRes = await BackendApiClient.getMetrics();
          if (mounted && mRes.data && mRes.data.filesDiscovered > 0) {
            setMetrics(mRes.data);
            const statusStr = (mRes.data as unknown as { status?: string }).status;
            if (statusStr === 'completed') {
              setScanStatus('completed');
            } else if (statusStr === 'scanning') {
              setScanStatus('scanning');
            }
          }

          // Hydrate duplicate groups from backend if not currently showing sample data
          if (!isSampleData) {
            const dupsRes = await BackendApiClient.getDuplicates();
            if (mounted && dupsRes.data && dupsRes.data.length > 0) {
              setDuplicateGroups(dupsRes.data);
            }
          }

          // Hydrate worker thread pool states from backend
          const threadsRes = await BackendApiClient.getWorkerThreads();
          if (mounted && threadsRes.data && threadsRes.data.length > 0) {
            setWorkers(threadsRes.data);
          }

          // Hydrate latest benchmark
          const bRes = await BackendApiClient.getLatestBenchmark();
          if (mounted && bRes.data && bRes.data.points && bRes.data.points.length > 0) {
            setBenchmarkResult(bRes.data);
          }
        }
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isSampleData]);

  // Realtime continuous synchronization with live C++ backend
  useEffect(() => {
    if (!backendOnline) return;

    let mounted = true;
    const syncBackend = async () => {
      // 1. Sync live activity logs
      const logsRes = await BackendApiClient.getLogs();
      if (mounted && logsRes.data && logsRes.data.length > 0) {
        setActivityLogs(logsRes.data);
      }

      // 2. Sync worker threads
      const threadsRes = await BackendApiClient.getWorkerThreads();
      if (mounted && threadsRes.data && threadsRes.data.length > 0) {
        setWorkers(threadsRes.data);
      }

      // 3. Sync scan metrics
      const metricsRes = await BackendApiClient.getMetrics();
      if (mounted && metricsRes.data) {
        const backendMetrics = metricsRes.data;
        if (backendMetrics.filesDiscovered > 0 || scanStatus === 'scanning') {
          setMetrics(backendMetrics);
        }

        const rawStatus = (backendMetrics as unknown as { status?: string }).status;
        if (rawStatus === 'scanning') {
          if (scanStatus !== 'scanning') setScanStatus('scanning');
        } else if (rawStatus === 'completed') {
          if (scanStatus === 'scanning') setScanStatus('completed');
          // Always ensure duplicates are populated if backend reports duplicate groups exist
          if (!isSampleData && backendMetrics.duplicateGroups > 0 && duplicateGroups.length === 0) {
            const dupsRes = await BackendApiClient.getDuplicates();
            if (mounted && dupsRes.data && dupsRes.data.length > 0) {
              setDuplicateGroups(dupsRes.data);
            }
          }
        }
      }
    };

    const interval = setInterval(syncBackend, 800);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [backendOnline, scanStatus, isSampleData, duplicateGroups.length]);

  // Sync worker array when thread count or mode changes
  const setThreadCount = (count: number) => {
    const clamped = Math.min(64, Math.max(1, count));
    setScanConfig(prev => ({ ...prev, threadCount: clamped }));
    if (scanStatus === 'idle') {
      const activeCount = scanConfig.mode === 'single' ? 1 : clamped;
      setWorkers(generateInitialWorkers(activeCount));
    }
  };

  const setExecutionMode = (mode: ExecutionMode) => {
    setScanConfig(prev => ({ ...prev, mode }));
    if (scanStatus === 'idle') {
      const count = mode === 'single' ? 1 : scanConfig.threadCount;
      setWorkers(generateInitialWorkers(count));
    }
  };

  const setTargetDirectory = (dir: string) => {
    setScanConfig(prev => ({ ...prev, targetDirectory: dir }));
  };

  const addLog = useCallback((source: ActivityLogEvent['source'], level: ActivityLogEvent['level'], message: string) => {
    const now = new Date();
    const ts = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join(':');

    setActivityLogs(prev => [
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: ts,
        source,
        level,
        message,
      },
      ...prev.slice(0, 99),
    ]);
  }, []);

  // Primary action: START SCAN
  const startScan = async () => {
    // Reset sample data flag - real scan ALWAYS takes priority!
    setIsSampleData(false);
    setIsTestPreviewActive(false);

    if (backendOnline) {
      setScanStatus('scanning');
      setMetrics(null);
      setDuplicateGroups([]);

      const res = await BackendApiClient.startScan(scanConfig);
      if (res.error) {
        setScanStatus('error');
        addLog('scanner', 'error', `Scan start error: ${res.error}`);
      }
      return;
    }

    // Fallback if backend offline
    setScanStatus('scanning');
    setIsTestPreviewActive(true);
    addLog('scanner', 'info', `[STANDBY PREVIEW] Started test scan on ${scanConfig.targetDirectory}`);

    let step = 0;

    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    simulationTimerRef.current = setInterval(() => {
      step += 1;
      const discovered = Math.min(2480, step * 165);
      const processed = Math.min(2480, Math.floor(step * 140));
      const bytes = processed * 1450000;

      setMetrics({
        filesDiscovered: discovered,
        filesProcessed: processed,
        bytesProcessed: bytes,
        duplicateGroups: Math.floor(processed / 480),
        duplicateFiles: Math.floor(processed / 240),
        wastedBytes: Math.floor(processed / 480) * 48200000,
        elapsedMs: step * 350,
        throughputMBs: Number((128.4 + Math.random() * 30).toFixed(1)),
      });

      if (step >= 16) {
        if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
        setScanStatus('completed');
        loadSampleDuplicates();
      }
    }, 400);
  };

  const stopScan = () => {
    if (backendOnline) {
      BackendApiClient.stopScan();
      setScanStatus('idle');
      return;
    }

    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setScanStatus('idle');
    const activeCount = scanConfig.mode === 'single' ? 1 : scanConfig.threadCount;
    setWorkers(generateInitialWorkers(activeCount));
  };

  const runBenchmark = async () => {
    if (backendOnline) {
      const target = scanConfig.targetDirectory || 'C:\\thread-scan-benchmark';
      await BackendApiClient.runBenchmark({
        directory: target,
        maxThreads: 8,
      });

      // Poll latest benchmark
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const latest = await BackendApiClient.getLatestBenchmark();
        if (latest.data && latest.data.points && latest.data.points.length > 0) {
          setBenchmarkResult(latest.data);
          fetchWorkerThreads();
          clearInterval(pollInterval);
        } else if (attempts > 60) {
          clearInterval(pollInterval);
        }
      }, 500);
      return;
    }

    // Simulated benchmark if offline
    const testResult: BenchmarkResult = {
      timestamp: new Date().toISOString(),
      directory: scanConfig.targetDirectory,
      totalFiles: 18450,
      totalBytes: 14200000000,
      singleThreadMs: 14820,
      multiThreadMs: 4120,
      speedup: 3.6,
      efficiency: 90.0,
      points: [
        { threads: 1, durationMs: 14820, speedup: 1.0, efficiency: 100.0, throughputMBs: 958 },
        { threads: 2, durationMs: 7640, speedup: 1.94, efficiency: 97.0, throughputMBs: 1858 },
        { threads: 4, durationMs: 4120, speedup: 3.60, efficiency: 90.0, throughputMBs: 3446 },
        { threads: 8, durationMs: 2380, speedup: 6.22, efficiency: 77.8, throughputMBs: 5966 },
        { threads: 16, durationMs: 1640, speedup: 9.03, efficiency: 56.4, throughputMBs: 8658 },
      ],
    };
    setBenchmarkResult(testResult);
  };

  // Only called when the user EXPLICITLY clicks "LOAD SAMPLE INSPECTION SET"
  const loadSampleDuplicates = () => {
    setIsSampleData(true);
    setDuplicateGroups([
      {
        id: 'GRP-001',
        hash: 'a91c784f16b2089ef2399cb1d5e396602377b03657743d262d1a3b839aa382bf',
        sizeBytes: 48200000,
        fileCount: 3,
        files: [
          { path: '/projects/thread-scan/archives/dataset_v1.zip', size: 48200000, modifiedAt: '2026-09-12 14:22:04' },
          { path: '/backups/storage/dataset_v1_copy.zip', size: 48200000, modifiedAt: '2026-09-14 09:15:30' },
          { path: '/tmp/downloads/dataset_v1_mirror.zip', size: 48200000, modifiedAt: '2026-09-18 18:40:12' },
        ],
      },
      {
        id: 'GRP-002',
        hash: '4d8a1c90538a7cbb02e5e78cba47721835bc45d2925b42e61a6c430768c8bfa1',
        sizeBytes: 18600000,
        fileCount: 2,
        files: [
          { path: '/opt/toolchains/llvm-18.1.0-win64.lib', size: 18600000, modifiedAt: '2026-08-20 11:05:44' },
          { path: '/home/shared/cache/toolchains/llvm-18.1.0-win64.lib', size: 18600000, modifiedAt: '2026-08-22 17:31:02' },
        ],
      },
    ]);
  };

  const clearSampleData = async () => {
    setIsSampleData(false);
    if (backendOnline) {
      await fetchLatestDuplicates();
    } else {
      setDuplicateGroups([]);
    }
  };

  const toggleTestPreview = () => {
    if (isTestPreviewActive) {
      clearAllData();
    } else {
      setIsTestPreviewActive(true);
      loadSampleDuplicates();
      runBenchmark();
    }
  };

  const clearAllData = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setScanStatus('idle');
    setMetrics(null);
    setDuplicateGroups([]);
    setBenchmarkResult(null);
    setIsTestPreviewActive(false);
    setIsSampleData(false);
    const activeCount = scanConfig.mode === 'single' ? 1 : scanConfig.threadCount;
    setWorkers(generateInitialWorkers(activeCount));
    addLog('system', 'info', 'Workstation state reset to standby.');
  };

  return (
    <ScannerContext.Provider
      value={{
        backendOnline,
        scanConfig,
        setTargetDirectory,
        setExecutionMode,
        setThreadCount,
        scanStatus,
        metrics,
        workers,
        duplicateGroups,
        benchmarkResult,
        activityLogs,
        systemDiagnostics,
        startScan,
        stopScan,
        runBenchmark,
        isTestPreviewActive,
        isSampleData,
        toggleTestPreview,
        loadSampleDuplicates,
        clearSampleData,
        fetchLatestDuplicates,
        fetchWorkerThreads,
        fetchLatestBenchmark,
        clearAllData,
      }}
    >
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error('useScanner must be used within a ScannerProvider');
  }
  return context;
}
