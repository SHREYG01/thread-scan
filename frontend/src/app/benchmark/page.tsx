"use client";

import React, { useState, useEffect } from 'react';
import {
  ChartBar,
  Lightning,
  Clock,
  Gauge,
  Cpu,
  ArrowsClockwise,
  Play,
} from '@phosphor-icons/react';
import { useScanner } from '@/lib/context/ScannerContext';

export default function BenchmarkPage() {
  const { benchmarkResult, runBenchmark, backendOnline, fetchLatestBenchmark } = useScanner();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (backendOnline) {
      fetchLatestBenchmark();
    }
  }, [backendOnline, fetchLatestBenchmark]);

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    await runBenchmark();
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-ts-border">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ts-orange mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-ts-orange rounded-xs" />
            <span>Multithreaded Performance Profiler</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-ts-text">
            BENCHMARK
          </h1>
          <p className="text-xs font-mono text-ts-muted mt-1">
            Amdahl&apos;s Law Scaling, Concurrency Speedup &amp; Core Efficiency
          </p>
        </div>

        <div>
          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunBenchmark}
            className="flex items-center gap-2 px-5 py-2.5 bg-ts-orange text-ts-bg hover:bg-ts-orange/90 font-mono text-xs font-bold tracking-wider rounded-xs transition-colors active:scale-[0.98] disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <ArrowsClockwise size={16} className="animate-spin" />
                <span>PROFILING THREADS...</span>
              </>
            ) : (
              <>
                <Play size={16} weight="fill" />
                <span>RUN BENCHMARK PROFILER</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Body: Empty State or Profiler Results */}
      {!benchmarkResult ? (
        <div className="p-16 bg-ts-panel border border-dashed border-ts-border text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-ts-surface border border-ts-border flex items-center justify-center text-ts-orange">
            <ChartBar size={24} />
          </div>
          <div className="space-y-1">
            <div className="font-mono text-base font-bold text-ts-text">
              Run a benchmark to populate performance data.
            </div>
            <p className="font-mono text-xs text-ts-muted max-w-md mx-auto">
              Executes identical SHA-256 duplicate detection workloads across 1, 2, 4, and 8 threads to evaluate thread scaling, lock contention, and Amdahl&apos;s law efficiency.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleRunBenchmark}
              className="px-4 py-2 bg-ts-orange text-ts-bg font-mono text-xs font-bold tracking-wider rounded-xs active:scale-[0.98] transition-colors"
            >
              RUN BENCHMARK SUITE
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Note that data is test run */}
          <div className="p-3 bg-ts-orange/10 border border-ts-orange/30 flex items-center justify-between text-xs font-mono text-ts-orange">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-ts-orange rounded-xs" />
              BENCHMARK RUN EVALUATION SUITE
            </span>
            <span className="text-ts-dim">
              Timestamp: {new Date(benchmarkResult.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* 4 Core Sections: SINGLE THREAD | MULTI THREAD | SPEEDUP | EFFICIENCY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SINGLE THREAD */}
            <div className="p-5 bg-ts-panel border border-ts-border space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ts-muted flex items-center gap-1.5">
                <Clock size={14} className="text-ts-muted" />
                SINGLE THREAD
              </div>
              <div className="font-mono text-2xl font-bold text-ts-text">
                {(benchmarkResult.singleThreadMs / 1000).toFixed(2)}s
              </div>
              <div className="font-mono text-[11px] text-ts-dim">
                Baseline latency (1 worker)
              </div>
            </div>

            {/* MULTI THREAD */}
            <div className="p-5 bg-ts-panel border border-ts-border space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ts-muted flex items-center gap-1.5">
                <Lightning size={14} className="text-ts-lime" />
                MULTI THREAD
              </div>
              <div className="font-mono text-2xl font-bold text-ts-lime">
                {(benchmarkResult.multiThreadMs / 1000).toFixed(2)}s
              </div>
              <div className="font-mono text-[11px] text-ts-dim">
                Concurrent execution (4 workers)
              </div>
            </div>

            {/* SPEEDUP */}
            <div className="p-5 bg-ts-panel border border-ts-border space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ts-muted flex items-center gap-1.5">
                <Gauge size={14} className="text-ts-orange" />
                SPEEDUP
              </div>
              <div className="font-mono text-2xl font-bold text-ts-orange">
                {benchmarkResult.speedup.toFixed(2)}x
              </div>
              <div className="font-mono text-[11px] text-ts-dim">
                T(1) / T(N) latency ratio
              </div>
            </div>

            {/* EFFICIENCY */}
            <div className="p-5 bg-ts-panel border border-ts-border space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-ts-muted flex items-center gap-1.5">
                <Cpu size={14} className="text-ts-muted" />
                EFFICIENCY
              </div>
              <div className="font-mono text-2xl font-bold text-ts-text">
                {benchmarkResult.efficiency.toFixed(1)}%
              </div>
              <div className="font-mono text-[11px] text-ts-dim">
                Speedup / Cores utilization
              </div>
            </div>
          </div>

          {/* Visualization Comparing Thread Counts */}
          <div className="p-6 bg-ts-panel border border-ts-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-ts-border-subtle gap-2">
              <span className="font-mono text-xs font-semibold tracking-wider text-ts-text uppercase flex items-center gap-2">
                <ChartBar size={16} className="text-ts-orange" />
                THREAD SCALABILITY PROJECTION
              </span>
              <span className="font-mono text-[10px] text-ts-dim">
                Throughput &amp; Latency Scaling Curve
              </span>
            </div>

            {/* Scalability Bars */}
            <div className="space-y-4">
              {benchmarkResult.points.map((pt) => {
                const maxSpeedup = 10;
                const percentage = Math.min(100, (pt.speedup / maxSpeedup) * 100);

                return (
                  <div key={pt.threads} className="space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ts-text">
                        {pt.threads} {pt.threads === 1 ? 'THREAD' : 'THREADS'}
                      </span>
                      <div className="flex items-center gap-4 text-ts-muted text-[11px]">
                        <span>{(pt.durationMs / 1000).toFixed(2)}s</span>
                        <span className="text-ts-orange font-bold">{pt.speedup.toFixed(2)}x speedup</span>
                        <span className="text-ts-dim">{pt.efficiency.toFixed(0)}% eff.</span>
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="h-4 bg-ts-surface border border-ts-border p-0.5">
                      <div
                        className="h-full bg-ts-orange/80 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Monospace Table */}
            <div className="pt-4 border-t border-ts-border-subtle overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-ts-border text-ts-dim text-[10px] uppercase">
                    <th className="py-2">Threads</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2">Speedup</th>
                    <th className="py-2">Efficiency</th>
                    <th className="py-2">Files Processed</th>
                    <th className="py-2">Bytes Processed</th>
                    <th className="py-2">I/O Throughput</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ts-border-subtle">
                  {benchmarkResult.points.map((pt) => (
                    <tr key={pt.threads} className="hover:bg-ts-surface/40">
                      <td className="py-2 text-ts-text font-bold">{pt.threads}T</td>
                      <td className="py-2 text-ts-muted">{(pt.durationMs / 1000).toFixed(3)}s</td>
                      <td className="py-2 text-ts-orange font-semibold">{pt.speedup.toFixed(2)}x</td>
                      <td className="py-2 text-ts-muted">{pt.efficiency.toFixed(1)}%</td>
                      <td className="py-2 text-ts-text">{pt.filesProcessed ?? benchmarkResult.totalFiles} files</td>
                      <td className="py-2 text-ts-muted">{formatBytes(pt.bytesProcessed ?? benchmarkResult.totalBytes)}</td>
                      <td className="py-2 text-ts-lime font-mono">{pt.throughputMBs} MB/s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
