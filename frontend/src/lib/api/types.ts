// THREAD//SCAN - Core Domain Types & C++ REST Backend Interface Contract

export type ExecutionMode = 'single' | 'multi';

export type ScanStatus = 'idle' | 'scanning' | 'paused' | 'completed' | 'error';

export type WorkerStatus = 'idle' | 'reading' | 'hashing' | 'comparing' | 'complete' | 'completed' | 'waiting' | 'error';

export interface WorkerThreadState {
  id: number;
  label: string;
  status: WorkerStatus;
  currentFile: string;
  filesProcessed: number;
  bytesProcessed: number;
  elapsedTimeMs: number;
}

export interface ScanMetrics {
  filesDiscovered: number;
  filesProcessed: number;
  bytesProcessed: number;
  duplicateGroups: number;
  duplicateFiles: number;
  wastedBytes: number;
  elapsedMs: number;
  throughputMBs: number;
}

export interface DuplicateFileItem {
  path: string;
  size: number;
  modifiedAt: string;
  permissions?: string;
}

export interface DuplicateGroup {
  id: string;
  hash: string;
  sizeBytes: number;
  fileCount: number;
  files: DuplicateFileItem[];
}

export interface BenchmarkPoint {
  threads: number;
  durationMs: number;
  speedup: number;
  efficiency: number; // percentage (speedup / threads) * 100
  throughputMBs: number;
  filesProcessed?: number;
  bytesProcessed?: number;
  duplicateGroups?: number;
  duplicateFiles?: number;
}

export interface BenchmarkResult {
  timestamp: string;
  directory: string;
  totalFiles: number;
  totalBytes: number;
  singleThreadMs: number;
  multiThreadMs: number;
  speedup: number;
  efficiency: number;
  points: BenchmarkPoint[];
}

export interface ActivityLogEvent {
  id: string;
  timestamp: string;
  source: 'scanner' | 'worker' | 'pipeline' | 'system' | 'backend';
  level: 'info' | 'warn' | 'error' | 'trace';
  message: string;
}

export interface SystemDiagnostics {
  os: string;
  kernel: string;
  cpuModel: string;
  logicalProcessors: number;
  physicalCores: number;
  architecture: string;
  availableThreads: number;
  pageSizeBytes: number;
  memoryTotalBytes: number;
  memoryFreeBytes: number;
  backendConnected: boolean;
  backendVersion?: string;
  compiler?: string;
}

export interface ScanConfig {
  targetDirectory: string;
  mode: ExecutionMode;
  threadCount: number;
  minFileSizeBytes: number;
  hashAlgorithm: 'sha256' | 'xxhash' | 'md5';
  followSymlinks: boolean;
}
