"use client";

import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Funnel,
  Circle,
} from '@phosphor-icons/react';
import { useScanner } from '@/lib/context/ScannerContext';
import { ActivityLogEvent } from '@/lib/api/types';

export default function ActivityPage() {
  const { activityLogs } = useScanner();
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  const filteredLogs = activityLogs.filter((log) => {
    if (filterSource === 'ALL') return true;
    return log.source.toUpperCase() === filterSource;
  });

  const handleCopyLogs = () => {
    const text = activityLogs
      .map((l) => `[${l.timestamp}] [${l.source.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceBadge = (source: ActivityLogEvent['source']) => {
    switch (source) {
      case 'scanner':
        return 'text-ts-lime border-ts-lime/40 bg-ts-lime/10';
      case 'worker':
        return 'text-ts-orange border-ts-orange/40 bg-ts-orange/10';
      case 'system':
        return 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10';
      case 'backend':
        return 'text-purple-400 border-purple-400/40 bg-purple-400/10';
      default:
        return 'text-ts-muted border-ts-border bg-ts-surface';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-ts-border">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ts-lime mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-ts-lime rounded-xs" />
            <span>Event Streaming</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-ts-text">
            ACTIVITY
          </h1>
          <p className="text-xs font-mono text-ts-muted mt-1">
            Realtime Kernel Traversal, Worker Dispatch &amp; IPC Event Stream
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ts-panel border border-ts-border hover:border-ts-border-highlight text-ts-muted hover:text-ts-text font-mono text-xs rounded-xs transition-colors"
          >
            {copied ? (
              <>
                <Check size={14} className="text-ts-lime" />
                <span className="text-ts-lime">COPIED</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>EXPORT</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Stream Header */}
      <div className="p-4 bg-ts-panel border border-ts-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Funnel size={14} className="text-ts-muted" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-ts-dim">
            Source Filter:
          </span>
          {['ALL', 'SCANNER', 'WORKER', 'SYSTEM'].map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setFilterSource(src)}
              className={`px-2 py-0.5 font-mono text-[10px] border transition-colors ${
                filterSource === src
                  ? 'bg-ts-lime/10 border-ts-lime text-ts-lime font-bold'
                  : 'bg-ts-surface border-ts-border text-ts-muted hover:text-ts-text'
              }`}
            >
              {src}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-ts-dim">
          <Circle size={8} weight="fill" className="text-ts-lime animate-pulse" />
          <span>STREAM BUFFER: {filteredLogs.length} ENTRIES</span>
        </div>
      </div>

      {/* Terminal Event Stream Console */}
      <div className="bg-ts-panel border border-ts-border p-5 font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-ts-border-subtle mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-ts-text uppercase tracking-wider">
            <Terminal size={16} className="text-ts-lime" />
            <span>SYSTEM CONSOLE LOG [POSIX STDOUT / IPC EVENT STREAM]</span>
          </div>
          <span className="text-[10px] text-ts-dim">
            FORMAT: [TIMESTAMP] SOURCE: MESSAGE
          </span>
        </div>

        {/* Monospace Stream Lines */}
        <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-2">
          {filteredLogs.map((log) => {
            const isStandby = log.timestamp === '--:--:--';

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-2 bg-ts-surface border border-ts-border-subtle hover:border-ts-border-highlight text-xs leading-relaxed transition-colors"
              >
                {/* Timestamp */}
                <span className={`shrink-0 ${isStandby ? 'text-ts-dim' : 'text-ts-muted'}`}>
                  [{log.timestamp}]
                </span>

                {/* Source Badge */}
                <span
                  className={`shrink-0 px-1.5 py-0.5 text-[9px] uppercase font-bold border rounded-xs ${getSourceBadge(
                    log.source
                  )}`}
                >
                  {log.source}
                </span>

                {/* Message */}
                <span
                  className={`flex-1 break-all ${
                    isStandby
                      ? 'text-ts-dim italic'
                      : log.level === 'error'
                      ? 'text-red-400 font-semibold'
                      : log.level === 'warn'
                      ? 'text-ts-orange'
                      : 'text-ts-text'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer State Distinction */}
        <div className="mt-4 pt-3 border-t border-ts-border-subtle flex flex-col sm:flex-row items-center justify-between text-[11px] text-ts-dim gap-2">
          <div>
            Events labeled with <code className="text-ts-muted">[--:--:--]</code> are standby placeholders awaiting daemon scan execution.
          </div>
          <div className="text-ts-dim">
            Ring Buffer Size: 100 entries
          </div>
        </div>
      </div>
    </div>
  );
}
