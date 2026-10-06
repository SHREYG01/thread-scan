"use client";

import React, { useSyncExternalStore } from 'react';
import {
  Gear,
  Cpu,
  HardDrive,
  Desktop,
  WarningCircle,
  Terminal,
} from '@phosphor-icons/react';
import { useScanner } from '@/lib/context/ScannerContext';

function getHardwareConcurrencySnapshot() {
  if (typeof window !== 'undefined') {
    return navigator.hardwareConcurrency || 4;
  }
  return 4;
}

function getUserAgentSnapshot() {
  if (typeof window !== 'undefined') {
    return navigator.userAgent || 'Host Environment';
  }
  return 'Host Environment';
}

function subscribe() {
  return () => {};
}

export default function SystemPage() {
  const { backendOnline, systemDiagnostics } = useScanner();

  const clientThreads = useSyncExternalStore(
    subscribe,
    getHardwareConcurrencySnapshot,
    () => 4
  );

  const clientPlatform = useSyncExternalStore(
    subscribe,
    getUserAgentSnapshot,
    () => 'Host Environment'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-ts-border">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ts-lime mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-ts-lime rounded-xs" />
            <span>Host Diagnostics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-ts-text">
            SYSTEM
          </h1>
          <p className="text-xs font-mono text-ts-muted mt-1">
            Kernel Diagnostics, Processor Topology &amp; Architecture Telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-ts-panel border border-ts-border font-mono text-xs flex items-center gap-2">
            <span className="text-ts-muted">BACKEND DAEMON:</span>
            <span className={backendOnline ? 'text-ts-lime font-bold' : 'text-ts-orange font-bold'}>
              {backendOnline ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Backend Status Notice */}
      {!backendOnline && (
        <div className="p-4 bg-ts-panel border border-ts-border-highlight flex items-start gap-3">
          <WarningCircle size={20} className="text-ts-orange shrink-0 mt-0.5" />
          <div className="space-y-1 font-mono text-xs">
            <div className="font-bold text-ts-text">
              HOST KERNEL TELEMETRY OFFLINE
            </div>
            <p className="text-ts-muted text-[11px] leading-relaxed">
              Operating system and hardware registers are queried via POSIX/Win32 APIs exposed by the C++ backend daemon on port 8080. Since the daemon is not running, host hardware metrics remain in standby state.
            </p>
          </div>
        </div>
      )}

      {/* 5 Core Required Sections: OS | CPU | LOGICAL PROCESSORS | ARCHITECTURE | AVAILABLE THREADS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. OPERATING SYSTEM */}
        <div className="p-5 bg-ts-panel border border-ts-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-ts-border-subtle">
            <span className="font-mono text-xs font-bold text-ts-text uppercase flex items-center gap-2">
              <Desktop size={16} className="text-ts-lime" />
              OPERATING SYSTEM
            </span>
            <span className="font-mono text-[10px] text-ts-dim uppercase">OS Platform</span>
          </div>
          <div className="font-mono space-y-2">
            <div className="text-lg font-bold text-ts-text">
              {systemDiagnostics ? systemDiagnostics.os : 'STANDBY (Awaiting Daemon)'}
            </div>
            <div className="text-xs text-ts-muted">
              Kernel: <span className="text-ts-text">{systemDiagnostics ? systemDiagnostics.kernel : '---'}</span>
            </div>
            <div className="text-[10px] text-ts-dim">
              POSIX uname / Win32 GetVersionEx
            </div>
          </div>
        </div>

        {/* 2. CPU */}
        <div className="p-5 bg-ts-panel border border-ts-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-ts-border-subtle">
            <span className="font-mono text-xs font-bold text-ts-text uppercase flex items-center gap-2">
              <Cpu size={16} className="text-ts-lime" />
              CPU
            </span>
            <span className="font-mono text-[10px] text-ts-dim uppercase">Silicon Model</span>
          </div>
          <div className="font-mono space-y-2">
            <div className="text-lg font-bold text-ts-text truncate" title={systemDiagnostics?.cpuModel || ''}>
              {systemDiagnostics ? systemDiagnostics.cpuModel : 'STANDBY (Awaiting Daemon)'}
            </div>
            <div className="text-xs text-ts-muted">
              Physical Cores: <span className="text-ts-text">{systemDiagnostics ? systemDiagnostics.physicalCores : '---'}</span>
            </div>
            <div className="text-[10px] text-ts-dim">
              CPUID Instruction / /proc/cpuinfo
            </div>
          </div>
        </div>

        {/* 3. LOGICAL PROCESSORS */}
        <div className="p-5 bg-ts-panel border border-ts-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-ts-border-subtle">
            <span className="font-mono text-xs font-bold text-ts-text uppercase flex items-center gap-2">
              <HardDrive size={16} className="text-ts-lime" />
              LOGICAL PROCESSORS
            </span>
            <span className="font-mono text-[10px] text-ts-dim uppercase">Execution SMT</span>
          </div>
          <div className="font-mono space-y-2">
            <div className="text-lg font-bold text-ts-lime">
              {systemDiagnostics
                ? `${systemDiagnostics.logicalProcessors} Logical Cores`
                : `${clientThreads} Cores (Client Detected)`}
            </div>
            <div className="text-xs text-ts-muted">
              SMT / Hyperthreading: <span className="text-ts-text">{systemDiagnostics ? 'Enabled' : 'Unknown'}</span>
            </div>
            <div className="text-[10px] text-ts-dim">
              std::thread::hardware_concurrency()
            </div>
          </div>
        </div>

        {/* 4. ARCHITECTURE */}
        <div className="p-5 bg-ts-panel border border-ts-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-ts-border-subtle">
            <span className="font-mono text-xs font-bold text-ts-text uppercase flex items-center gap-2">
              <Gear size={16} className="text-ts-lime" />
              ARCHITECTURE
            </span>
            <span className="font-mono text-[10px] text-ts-dim uppercase">Instruction Set</span>
          </div>
          <div className="font-mono space-y-2">
            <div className="text-lg font-bold text-ts-text">
              {systemDiagnostics ? systemDiagnostics.architecture : 'x86_64 / ARM64'}
            </div>
            <div className="text-xs text-ts-muted">
              Target Word Size: <span className="text-ts-text">64-bit Native</span>
            </div>
            <div className="text-[10px] text-ts-dim">
              Instruction Extensions: AVX2, SSE4.2
            </div>
          </div>
        </div>

        {/* 5. AVAILABLE THREADS */}
        <div className="p-5 bg-ts-panel border border-ts-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-ts-border-subtle">
            <span className="font-mono text-xs font-bold text-ts-text uppercase flex items-center gap-2">
              <Cpu size={16} className="text-ts-lime" />
              AVAILABLE THREADS
            </span>
            <span className="font-mono text-[10px] text-ts-dim uppercase">Thread Pool Max</span>
          </div>
          <div className="font-mono space-y-2">
            <div className="text-lg font-bold text-ts-lime">
              {systemDiagnostics
                ? `${systemDiagnostics.availableThreads} Threads Available`
                : `${clientThreads} Available Schedulable`}
            </div>
            <div className="text-xs text-ts-muted">
              Recommended Workload: <span className="text-ts-text">N or N-1 Cores</span>
            </div>
            <div className="text-[10px] text-ts-dim">
              Max Thread Limit: 64 Workers
            </div>
          </div>
        </div>

        {/* Client Runtime Environment Card */}
        <div className="p-5 bg-ts-panel border border-ts-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-ts-border-subtle">
            <span className="font-mono text-xs font-bold text-ts-text uppercase flex items-center gap-2">
              <Terminal size={16} className="text-ts-muted" />
              CLIENT ENVIRONMENT
            </span>
            <span className="font-mono text-[10px] text-ts-dim uppercase">Browser Host</span>
          </div>
          <div className="font-mono space-y-2 text-xs">
            <div className="text-ts-muted">
              Concurrency: <span className="text-ts-text font-bold">{clientThreads} threads</span>
            </div>
            <div className="text-ts-dim text-[11px] truncate" title={clientPlatform}>
              Agent: {clientPlatform}
            </div>
            <div className="text-[10px] text-ts-dim">
              Client runtime detected via Web API
            </div>
          </div>
        </div>
      </div>

      {/* Backend Integration Blueprint */}
      <div className="p-5 bg-ts-panel border border-ts-border space-y-3 font-mono">
        <div className="text-xs font-bold text-ts-text uppercase tracking-wider pb-2 border-b border-ts-border-subtle">
          C++17 SYSTEM INTEGRATION SPECIFICATION
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-ts-muted">
          <div className="space-y-1">
            <div className="text-ts-text font-semibold">Daemon Endpoints:</div>
            <div>• <code className="text-ts-lime">GET /api/v1/system</code>: Full hardware &amp; kernel diagnostics</div>
            <div>• <code className="text-ts-lime">GET /api/v1/health</code>: Daemon heartbeat &amp; socket probe</div>
            <div>• <code className="text-ts-lime">GET /api/v1/scan/metrics</code>: Realtime inode counter stream</div>
          </div>
          <div className="space-y-1">
            <div className="text-ts-text font-semibold">Native Libraries:</div>
            <div>• <code className="text-ts-orange">std::filesystem</code>: Recursive directory iterators</div>
            <div>• <code className="text-ts-orange">std::thread / mutex</code>: Concurrent worker pooling</div>
            <div>• <code className="text-ts-orange">OpenSSL / SHA256</code>: Hardware accelerated block hashing</div>
          </div>
        </div>
      </div>
    </div>
  );
}
