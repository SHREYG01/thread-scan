"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { Play, Stop, ArrowsClockwise } from '@phosphor-icons/react';
import { useScanner } from '@/lib/context/ScannerContext';

const PAGE_NAMES: Record<string, { title: string; subtitle: string }> = {
  '/overview': { title: 'OVERVIEW', subtitle: 'Concurrent Filesystem Analysis' },
  '/duplicates': { title: 'DUPLICATES', subtitle: 'Identified File Collision Clusters' },
  '/threads': { title: 'THREAD MONITOR', subtitle: 'Process Pipeline & Worker States' },
  '/benchmark': { title: 'BENCHMARK', subtitle: 'Multithreaded Performance Profiler' },
  '/activity': { title: 'ACTIVITY', subtitle: 'System Event Stream' },
  '/system': { title: 'SYSTEM', subtitle: 'Host Diagnostics & Runtime Info' },
};

export default function WorkstationHeader() {
  const pathname = usePathname();
  const { scanConfig, scanStatus, startScan, stopScan, clearAllData } = useScanner();

  const current = PAGE_NAMES[pathname] || PAGE_NAMES['/overview'];
  const isScanning = scanStatus === 'scanning';

  return (
    <header className="h-16 shrink-0 bg-ts-surface border-b border-ts-border px-6 flex items-center justify-between select-none">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold tracking-wider text-ts-text">
              {current.title}
            </span>
            <span className="text-ts-dim font-mono text-xs">/</span>
            <span className="text-[11px] font-mono text-ts-muted">
              {current.subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Telemetry Strip & Quick Actions */}
      <div className="flex items-center gap-4">
        {/* Execution Mode Telemetry */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-ts-panel border border-ts-border text-[11px] font-mono">
          <span className="text-ts-muted">EXEC:</span>
          <span className="text-ts-text font-semibold uppercase">
            {scanConfig.mode === 'single' ? 'Single Thread' : `${scanConfig.threadCount} Threads`}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-ts-panel border border-ts-border text-[11px] font-mono">
          <span className="text-ts-muted">STATUS:</span>
          <span
            className={`font-semibold uppercase flex items-center gap-1.5 ${
              isScanning
                ? 'text-ts-orange animate-pulse'
                : scanStatus === 'completed'
                ? 'text-ts-lime'
                : 'text-ts-muted'
            }`}
          >
            {isScanning ? 'SCANNING' : scanStatus === 'completed' ? 'FINISHED' : 'STANDBY'}
          </span>
        </div>

        {/* Global Action Button */}
        {isScanning ? (
          <button
            type="button"
            onClick={stopScan}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ts-orange/15 border border-ts-orange text-ts-orange hover:bg-ts-orange/25 font-mono text-xs tracking-wider font-semibold rounded-xs transition-colors active:scale-[0.98]"
          >
            <Stop size={14} weight="fill" />
            <span>ABORT</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startScan}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ts-lime text-ts-bg hover:bg-ts-lime/90 font-mono text-xs tracking-wider font-bold rounded-xs transition-colors active:scale-[0.98]"
          >
            <Play size={14} weight="fill" />
            <span>START SCAN</span>
          </button>
        )}

        <button
          type="button"
          onClick={clearAllData}
          className="p-1.5 bg-ts-panel border border-ts-border text-ts-muted hover:text-ts-text hover:border-ts-border-highlight rounded-xs transition-colors"
          title="Reset telemetry and clear sample buffers"
        >
          <ArrowsClockwise size={14} />
        </button>
      </div>
    </header>
  );
}
