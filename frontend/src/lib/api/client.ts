import {
  ScanConfig,
  ScanMetrics,
  DuplicateGroup,
  WorkerThreadState,
  BenchmarkResult,
  ActivityLogEvent,
  SystemDiagnostics,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export class BackendApiClient {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<{ data: T | null; error: string | null; online: boolean }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { data: null, error: `HTTP ${res.status}: ${res.statusText}`, online: true };
      }

      const data = await res.json();
      return { data, error: null, online: true };
    } catch {
      // Backend is offline or network unreachable
      return { data: null, error: 'Connection refused: Backend offline', online: false };
    }
  }

  static async checkHealth(): Promise<boolean> {
    const res = await this.request<{ status: string }>('/api/v1/health');
    return res.online && res.data?.status === 'ok';
  }

  static async startScan(config: ScanConfig) {
    return this.request<{ scanId: string; started: boolean }>('/api/v1/scan/start', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  static async stopScan() {
    return this.request<{ stopped: boolean }>('/api/v1/scan/stop', {
      method: 'POST',
    });
  }

  static async getMetrics() {
    return this.request<ScanMetrics>('/api/v1/scan/metrics');
  }

  static async getDuplicates() {
    return this.request<DuplicateGroup[]>('/api/v1/duplicates');
  }

  static async getWorkerThreads() {
    return this.request<WorkerThreadState[]>('/api/v1/threads');
  }

  static async runBenchmark(config: { directory: string; maxThreads: number }) {
    return this.request<BenchmarkResult>('/api/v1/benchmark/run', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  static async getLatestBenchmark() {
    return this.request<BenchmarkResult>('/api/v1/benchmark/latest');
  }

  static async getLogs(sinceTimestamp?: string) {
    const url = sinceTimestamp ? `/api/v1/logs?since=${encodeURIComponent(sinceTimestamp)}` : '/api/v1/logs';
    return this.request<ActivityLogEvent[]>(url);
  }

  static async getSystemDiagnostics() {
    return this.request<SystemDiagnostics>('/api/v1/system');
  }
}
