"use client";

import React, { useState } from 'react';
import {
  FolderOpen,
  Play,
  Stop,
  Cpu,
  Database,
} from '@phosphor-icons/react';
import { useScanner } from '@/lib/context/ScannerContext';

export default function OverviewPage() {
  const {
    scanConfig,
    setTargetDirectory,
    setExecutionMode,
    setThreadCount,
    scanStatus,
    metrics,
    startScan,
    stopScan,
    isTestPreviewActive,
  } = useScanner();

  const [dirInput, setDirInput] = useState(scanConfig.targetDirectory);
  const [isEditingDir, setIsEditingDir] = useState(false);

  const isScanning = scanStatus === 'scanning';

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleDirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dirInput.trim()) {
      setTargetDirectory(dirInput.trim());
      setIsEditingDir(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-ts-border">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ts-lime mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-ts-lime rounded-xs" />
            <span>Filesystem Scanner</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-ts-text">
            THREAD//SCAN
          </h1>
          <p className="text-xs font-mono text-ts-muted mt-1">
            Concurrent Filesystem Analysis
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isTestPreviewActive && (
            <span className="px-2.5 py-1 bg-ts-lime/10 border border-ts-lime/30 text-ts-lime font-mono text-[10px] uppercase tracking-wider">
              Preview Mode Active
            </span>
          )}
          <span className="px-2.5 py-1 bg-ts-panel border border-ts-border text-ts-muted font-mono text-[10px] uppercase tracking-wider">
            Engine: C++17 Multithreaded
          </span>
        </div>
      </div>

      {/* Main Asymmetric Layout: Control Console (Left) + Telemetry Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Scan Target & Execution Parameters (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Target Selection Panel */}
          <div className="bg-ts-panel border border-ts-border p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-ts-border-subtle">
              <span className="font-mono text-xs font-semibold tracking-wider text-ts-text uppercase flex items-center gap-2">
                <FolderOpen size={16} className="text-ts-lime" />
                SCAN TARGET
              </span>
              <span className="font-mono text-[10px] text-ts-dim uppercase">
                Filesystem Mount
              </span>
            </div>

            {isEditingDir ? (
              <form onSubmit={handleDirSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={dirInput}
                  onChange={(e) => setDirInput(e.target.value)}
                  className="flex-1 bg-ts-surface border border-ts-lime text-ts-text font-mono text-xs px-3 py-2 focus:outline-none"
                  placeholder="/enter/absolute/path"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-ts-lime text-ts-bg font-mono text-xs font-bold active:scale-[0.98]"
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDir(false)}
                  className="px-3 py-2 bg-ts-surface border border-ts-border text-ts-muted font-mono text-xs hover:text-ts-text"
                >
                  CANCEL
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3 p-3 bg-ts-surface border border-ts-border">
                <div className="font-mono text-xs text-ts-text truncate">
                  {scanConfig.targetDirectory}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingDir(true)}
                  className="shrink-0 px-3 py-1.5 bg-ts-panel border border-ts-border hover:border-ts-lime/50 text-ts-lime font-mono text-xs tracking-wider transition-colors active:scale-[0.98]"
                >
                  [ SELECT DIRECTORY ]
                </button>
              </div>
            )}

            {/* Quick Directory Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono text-[10px] text-ts-dim uppercase">
                Presets:
              </span>
              {['/var/log', '/home/workspace', 'C:/Users/Downloads', '/mnt/datasets'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setTargetDirectory(preset);
                    setDirInput(preset);
                  }}
                  className="px-2 py-0.5 bg-ts-surface border border-ts-border hover:border-ts-border-highlight font-mono text-[10px] text-ts-muted hover:text-ts-text transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Execution Mode & Concurrency Stepper */}
          <div className="bg-ts-panel border border-ts-border p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-ts-border-subtle">
              <span className="font-mono text-xs font-semibold tracking-wider text-ts-text uppercase flex items-center gap-2">
                <Cpu size={16} className="text-ts-lime" />
                EXECUTION PARAMETERS
              </span>
              <span className="font-mono text-[10px] text-ts-dim uppercase">
                Hardware Allocation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Execution Mode */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-ts-muted">
                  Execution Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExecutionMode('single')}
                    className={`py-2 px-3 text-xs font-mono text-center border transition-all active:scale-[0.98] ${
                      scanConfig.mode === 'single'
                        ? 'bg-ts-surface border-ts-lime text-ts-lime font-bold'
                        : 'bg-ts-surface border-ts-border text-ts-muted hover:text-ts-text'
                    }`}
                  >
                    SINGLE THREAD
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecutionMode('multi')}
                    className={`py-2 px-3 text-xs font-mono text-center border transition-all active:scale-[0.98] ${
                      scanConfig.mode === 'multi'
                        ? 'bg-ts-surface border-ts-lime text-ts-lime font-bold'
                        : 'bg-ts-surface border-ts-border text-ts-muted hover:text-ts-text'
                    }`}
                  >
                    MULTI THREAD
                  </button>
                </div>
              </div>

              {/* Thread count stepper */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-ts-muted">
                  Thread Count
                </label>
                <div className="flex items-center border border-ts-border bg-ts-surface">
                  <button
                    type="button"
                    disabled={scanConfig.mode === 'single' || scanConfig.threadCount <= 1}
                    onClick={() => setThreadCount(scanConfig.threadCount - 1)}
                    className="w-10 h-9 flex items-center justify-center font-mono text-base font-bold text-ts-muted hover:text-ts-lime disabled:opacity-30 disabled:hover:text-ts-muted transition-colors active:scale-[0.95]"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center font-mono text-sm font-bold text-ts-text">
                    {scanConfig.mode === 'single' ? 1 : scanConfig.threadCount}
                  </div>
                  <button
                    type="button"
                    disabled={scanConfig.mode === 'single' || scanConfig.threadCount >= 64}
                    onClick={() => setThreadCount(scanConfig.threadCount + 1)}
                    className="w-10 h-9 flex items-center justify-center font-mono text-base font-bold text-ts-muted hover:text-ts-lime disabled:opacity-30 disabled:hover:text-ts-muted transition-colors active:scale-[0.95]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Thread Selectors */}
            {scanConfig.mode === 'multi' && (
              <div className="flex items-center gap-2 pt-1 border-t border-ts-border-subtle">
                <span className="font-mono text-[10px] text-ts-dim uppercase">
                  Quick Stepper:
                </span>
                {[2, 4, 8, 16, 32].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setThreadCount(cnt)}
                    className={`px-2 py-0.5 font-mono text-[10px] border transition-colors ${
                      scanConfig.threadCount === cnt
                        ? 'bg-ts-lime/10 border-ts-lime text-ts-lime font-bold'
                        : 'bg-ts-surface border-ts-border text-ts-muted hover:text-ts-text'
                    }`}
                  >
                    {cnt}T
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Action Button Bar */}
          <div className="p-5 bg-ts-panel border border-ts-border flex items-center justify-between">
            <div>
              <div className="font-mono text-xs text-ts-text font-semibold">
                {isScanning ? 'Scan Execution in Progress' : 'Ready for Filesystem Traversal'}
              </div>
              <div className="font-mono text-[11px] text-ts-muted mt-0.5">
                {isScanning
                  ? 'Hashing file content and resolving collision blocks'
                  : 'Target mounted with read-only POSIX directory stream'}
              </div>
            </div>

            {isScanning ? (
              <button
                type="button"
                onClick={stopScan}
                className="flex items-center gap-2 px-6 py-3 bg-ts-orange text-ts-bg hover:bg-ts-orange/90 font-mono text-xs font-bold tracking-wider rounded-xs transition-colors active:scale-[0.98]"
              >
                <Stop size={16} weight="fill" />
                <span>HALT SCAN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startScan}
                className="flex items-center gap-2 px-6 py-3 bg-ts-lime text-ts-bg hover:bg-ts-lime/90 font-mono text-xs font-bold tracking-wider rounded-xs transition-colors active:scale-[0.98]"
              >
                <Play size={16} weight="fill" />
                <span>START SCAN</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Filesystem Telemetry Matrix (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-ts-panel border border-ts-border p-5">
            <div className="flex items-center justify-between pb-3 border-b border-ts-border-subtle mb-4">
              <span className="font-mono text-xs font-semibold tracking-wider text-ts-text uppercase flex items-center gap-2">
                <Database size={16} className="text-ts-lime" />
                FILESYSTEM TELEMETRY
              </span>
              <span className="font-mono text-[10px] text-ts-dim uppercase">
                {metrics ? 'Buffer Active' : 'Standby'}
              </span>
            </div>

            {/* Metrics Rows */}
            <div className="space-y-3 font-mono">
              {/* FILES DISCOVERED */}
              <div className="p-3 bg-ts-surface border border-ts-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ts-muted">
                    FILES DISCOVERED
                  </div>
                  <div className="text-xs text-ts-dim mt-0.5">
                    Recursive inode traversal
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-ts-text">
                    {metrics ? metrics.filesDiscovered.toLocaleString() : '---'}
                  </div>
                  <div className="text-[10px] text-ts-dim">entries</div>
                </div>
              </div>

              {/* FILES PROCESSED */}
              <div className="p-3 bg-ts-surface border border-ts-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ts-muted">
                    FILES PROCESSED
                  </div>
                  <div className="text-xs text-ts-dim mt-0.5">
                    Hashed &amp; filtered
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-ts-text">
                    {metrics ? metrics.filesProcessed.toLocaleString() : '---'}
                  </div>
                  <div className="text-[10px] text-ts-dim">
                    {metrics && metrics.filesDiscovered > 0
                      ? `${Math.round((metrics.filesProcessed / metrics.filesDiscovered) * 100)}% complete`
                      : 'awaiting batch'}
                  </div>
                </div>
              </div>

              {/* BYTES PROCESSED */}
              <div className="p-3 bg-ts-surface border border-ts-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ts-muted">
                    BYTES PROCESSED
                  </div>
                  <div className="text-xs text-ts-dim mt-0.5">
                    I/O payload read
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-ts-lime">
                    {metrics ? formatBytes(metrics.bytesProcessed) : '---'}
                  </div>
                  <div className="text-[10px] text-ts-dim">
                    {metrics ? `${metrics.throughputMBs} MB/s` : 'throughput idle'}
                  </div>
                </div>
              </div>

              {/* DUPLICATE GROUPS */}
              <div className="p-3 bg-ts-surface border border-ts-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ts-muted">
                    DUPLICATE GROUPS
                  </div>
                  <div className="text-xs text-ts-dim mt-0.5">
                    Identical hash buckets
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-ts-orange">
                    {metrics ? metrics.duplicateGroups : '---'}
                  </div>
                  <div className="text-[10px] text-ts-dim">clusters</div>
                </div>
              </div>

              {/* DUPLICATE FILES */}
              <div className="p-3 bg-ts-surface border border-ts-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ts-muted">
                    DUPLICATE FILES
                  </div>
                  <div className="text-xs text-ts-dim mt-0.5">
                    Redundant copies
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-ts-text">
                    {metrics ? metrics.duplicateFiles : '---'}
                  </div>
                  <div className="text-[10px] text-ts-dim">
                    {metrics ? `Wasted: ${formatBytes(metrics.wastedBytes)}` : 'zero redundant'}
                  </div>
                </div>
              </div>
            </div>

            {/* Empty State Banner if no scan */}
            {!metrics && (
              <div className="mt-4 p-3 bg-ts-surface/60 border border-dashed border-ts-border text-center">
                <div className="font-mono text-[11px] text-ts-muted">
                  [ STANDBY: NO ACTIVE SCAN BUFFER ]
                </div>
                <div className="font-mono text-[10px] text-ts-dim mt-1">
                  Click START SCAN to initiate directory traversal
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
