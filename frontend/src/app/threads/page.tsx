"use client";

import React, { useEffect } from 'react';
import {
  Cpu,
  Queue,
  Clock,
  FileCode,
  HardDrive,
} from '@phosphor-icons/react';
import { useScanner } from '@/lib/context/ScannerContext';

export default function ThreadMonitorPage() {
  const { workers, scanStatus, backendOnline, fetchWorkerThreads } = useScanner();

  // Explicitly hydrate worker threads whenever entering /threads page
  useEffect(() => {
    if (backendOnline) {
      fetchWorkerThreads();
    }
  }, [backendOnline, fetchWorkerThreads]);

  const isScanning = scanStatus === 'scanning';

  const formatElapsed = (ms: number): string => {
    if (ms === 0) return '00:00.000';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const millis = ms % 1000;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'hashing':
        return 'text-ts-orange bg-ts-orange/10 border-ts-orange/40';
      case 'reading':
        return 'text-ts-lime bg-ts-lime/10 border-ts-lime/40';
      case 'completed':
      case 'complete':
        return 'text-ts-lime bg-ts-lime/15 border-ts-lime';
      case 'waiting':
        return 'text-ts-muted bg-ts-panel border-ts-border-highlight';
      case 'error':
        return 'text-red-400 bg-red-400/10 border-red-400/40';
      case 'idle':
      default:
        return 'text-ts-muted bg-ts-surface border-ts-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-ts-border">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ts-lime mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-ts-lime rounded-xs" />
            <span>Process Concurrency</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-ts-text">
            THREAD MONITOR
          </h1>
          <p className="text-xs font-mono text-ts-muted mt-1">
            Visual Concurrency Pipeline &amp; Worker Pool Diagnostics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-ts-panel border border-ts-border font-mono text-xs flex items-center gap-2">
            <span className="text-ts-muted">ACTIVE SLOTS:</span>
            <span className="text-ts-text font-bold">{workers.length} WORKERS</span>
          </div>
          <div className="px-3 py-1 bg-ts-panel border border-ts-border font-mono text-xs flex items-center gap-2">
            <span className="text-ts-muted">PIPELINE:</span>
            <span className={isScanning ? 'text-ts-orange font-bold animate-pulse' : 'text-ts-muted'}>
              {isScanning ? 'ACTIVE DRAIN' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Representation of the Pipeline: MAIN PROCESS -> TASK QUEUE -> WORKER POOL */}
      <div className="bg-ts-panel border border-ts-border p-6 space-y-4">
        <div className="font-mono text-xs font-semibold tracking-wider text-ts-text uppercase flex items-center justify-between pb-3 border-b border-ts-border-subtle">
          <span>CONCURRENCY PIPELINE TOPOLOGY</span>
          <span className="text-[10px] text-ts-dim">C++17 Thread Scheduling</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Node 1: MAIN PROCESS */}
          <div className="p-4 bg-ts-surface border border-ts-border relative">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-ts-lime flex items-center gap-2">
                <Cpu size={16} />
                MAIN PROCESS
              </span>
              <span className="font-mono text-[10px] text-ts-dim">PID: Host</span>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-ts-muted">
              <div>Role: Filesystem Scanner &amp; Work Coordinator</div>
              <div>Dispatch: POSIX Directory Iterator</div>
              <div className="text-ts-dim">Sync: std::mutex + condition_variable</div>
            </div>
          </div>

          {/* Node 2: TASK QUEUE */}
          <div className="p-4 bg-ts-surface border border-ts-border relative">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-ts-orange flex items-center gap-2">
                <Queue size={16} />
                TASK QUEUE
              </span>
              <span className="font-mono text-[10px] text-ts-dim">FIFO Buffer</span>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-ts-muted">
              <div>Capacity: Unbounded Work Batcher</div>
              <div>
                Status: {isScanning ? 'Streaming file blocks' : 'Queue Empty (Standby)'}
              </div>
              <div className="text-ts-dim">Locking: std::unique_lock&lt;std::mutex&gt;</div>
            </div>
          </div>

          {/* Node 3: WORKER POOL */}
          <div className="p-4 bg-ts-surface border border-ts-border relative">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-bold text-ts-text flex items-center gap-2">
                <HardDrive size={16} />
                WORKER POOL
              </span>
              <span className="font-mono text-[10px] text-ts-lime font-semibold">
                {workers.length} Threads
              </span>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-ts-muted">
              <div>Task: Parallel SHA-256 Hashing</div>
              <div>Batch Size: 64 KB Block Chunks</div>
              <div className="text-ts-dim">Affinity: Symmetric Multi-Processing</div>
            </div>
          </div>
        </div>

        {/* Visual Flow Arrow */}
        <div className="hidden md:flex items-center justify-around font-mono text-[10px] text-ts-dim pt-2">
          <span>MAIN PROCESS (Directory Inodes)</span>
          <span>↓ &nbsp; enqueue tasks &nbsp; ↓</span>
          <span>TASK QUEUE (File Path Batches)</span>
          <span>↓ &nbsp; dequeue work &nbsp; ↓</span>
          <span>WORKER POOL (Hash Calculation)</span>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-ts-text flex items-center gap-2">
            <Cpu size={14} className="text-ts-lime" />
            WORKER THREAD STATE TABLE
          </span>
          <span className="font-mono text-[10px] text-ts-dim uppercase">
            {isScanning ? 'Telemetry Active' : 'Neutral Standby States'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="p-4 bg-ts-panel border border-ts-border space-y-3 transition-colors hover:border-ts-border-highlight"
            >
              {/* Card Header: THREAD ID + STATUS */}
              <div className="flex items-center justify-between pb-2 border-b border-ts-border-subtle">
                <div className="font-mono text-xs font-bold text-ts-text flex items-center gap-2">
                  <span className="w-2 h-2 rounded-xs bg-ts-dim" />
                  {worker.label}
                </div>
                <span
                  className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 border ${getStatusColor(
                    worker.status
                  )}`}
                >
                  {worker.status}
                </span>
              </div>

              {/* CURRENT FILE */}
              <div className="space-y-1">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ts-muted flex items-center gap-1.5">
                  <FileCode size={12} />
                  CURRENT FILE
                </div>
                <div
                  className="font-mono text-xs text-ts-text bg-ts-surface p-2 border border-ts-border truncate"
                  title={worker.currentFile}
                >
                  {worker.currentFile}
                </div>
              </div>

              {/* ELAPSED TIME & PROCESSED STATS */}
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 bg-ts-surface border border-ts-border">
                  <div className="text-[9px] uppercase tracking-wider text-ts-muted flex items-center gap-1">
                    <Clock size={10} />
                    ELAPSED TIME
                  </div>
                  <div className="text-xs font-bold text-ts-text mt-0.5">
                    {formatElapsed(worker.elapsedTimeMs)}
                  </div>
                </div>

                <div className="p-2 bg-ts-surface border border-ts-border">
                  <div className="text-[9px] uppercase tracking-wider text-ts-muted">
                    PROCESSED
                  </div>
                  <div className="text-xs font-bold text-ts-text mt-0.5">
                    {worker.filesProcessed} files
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engineering Note / Blueprint Details */}
      <div className="p-4 bg-ts-panel/60 border border-ts-border text-ts-muted font-mono text-xs space-y-1">
        <div className="text-ts-text font-semibold flex items-center gap-2">
          <span>OPERATING SYSTEMS ARCHITECTURE NOTE:</span>
        </div>
        <p className="text-[11px] text-ts-dim leading-relaxed">
          The C++17 backend utilizes standard POSIX thread primitives (`std::thread`, `std::mutex`, `std::condition_variable`).
          Workers sleep on the condition variable until directory traversal yields new file chunks, preventing CPU spin-waits and ensuring optimal core distribution.
        </p>
      </div>
    </div>
  );
}
