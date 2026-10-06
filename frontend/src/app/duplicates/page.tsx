"use client";

import React, { useState, useEffect } from 'react';
import {
  Files,
  Copy,
  MagnifyingGlass,
  Check,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useScanner } from '@/lib/context/ScannerContext';

export default function DuplicatesPage() {
  const {
    duplicateGroups,
    loadSampleDuplicates,
    clearSampleData,
    fetchLatestDuplicates,
    isSampleData,
    backendOnline,
  } = useScanner();

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Hydrate latest duplicates from backend when visiting the page
  useEffect(() => {
    if (backendOnline && !isSampleData) {
      fetchLatestDuplicates();
    }
  }, [backendOnline, isSampleData, fetchLatestDuplicates]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredGroups = duplicateGroups.filter((group) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      group.hash.toLowerCase().includes(query) ||
      group.files.some((f) => f.path.toLowerCase().includes(query))
    );
  });

  const totalWastedBytes = duplicateGroups.reduce(
    (acc, g) => acc + g.sizeBytes * (g.files.length - 1),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-ts-border">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-ts-lime mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-ts-lime rounded-xs" />
            <span>Filesystem Collisions</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tight text-ts-text">
            DUPLICATES
          </h1>
          <p className="text-xs font-mono text-ts-muted mt-1">
            Byte-Identical Hash Groups &amp; Redundant Inodes
          </p>
        </div>

        {/* Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 bg-ts-panel border border-ts-border font-mono text-xs flex items-center gap-2">
            <span className="text-ts-muted">GROUPS:</span>
            <span className="text-ts-text font-bold">{duplicateGroups.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-ts-panel border border-ts-border font-mono text-xs flex items-center gap-2">
            <span className="text-ts-muted">POTENTIAL RECLAIM:</span>
            <span className="text-ts-lime font-bold">
              {formatBytes(totalWastedBytes)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => fetchLatestDuplicates()}
            className="p-1.5 bg-ts-panel border border-ts-border text-ts-muted hover:text-ts-text hover:border-ts-border-highlight rounded-xs transition-colors"
            title="Refresh duplicate clusters from C++ backend"
          >
            <ArrowsClockwise size={14} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-ts-panel border border-ts-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ts-muted"
          />
          <input
            type="text"
            placeholder="Filter by filename, path, or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-ts-surface border border-ts-border text-ts-text font-mono text-xs pl-9 pr-3 py-2 placeholder:text-ts-dim focus:outline-none focus:border-ts-lime"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {duplicateGroups.length === 0 && !isSampleData && (
            <button
              type="button"
              onClick={loadSampleDuplicates}
              className="px-3 py-2 bg-ts-surface border border-ts-border hover:border-ts-lime/50 text-ts-lime font-mono text-xs tracking-wider transition-colors active:scale-[0.98]"
            >
              [ LOAD SAMPLE INSPECTION SET ]
            </button>
          )}
        </div>
      </div>

      {/* Explicit Sample Data Alert */}
      {isSampleData && (
        <div className="p-3 bg-ts-orange/10 border border-ts-orange/30 flex items-center justify-between text-xs font-mono text-ts-orange">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-ts-orange rounded-xs" />
            DEMO / SAMPLE DATA ACTIVE (PREVIEW ONLY)
          </span>
          <button
            type="button"
            onClick={clearSampleData}
            className="px-2.5 py-1 bg-ts-surface border border-ts-orange/40 text-ts-orange hover:bg-ts-orange/20 text-[10px] tracking-wider transition-colors active:scale-[0.98]"
          >
            [ RESTORE REAL SCAN RESULTS ]
          </button>
        </div>
      )}

      {/* Empty State */}
      {duplicateGroups.length === 0 ? (
        <div className="p-12 bg-ts-panel border border-dashed border-ts-border text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-ts-surface border border-ts-border flex items-center justify-center text-ts-muted">
            <Files size={24} />
          </div>
          <div className="space-y-1">
            <div className="font-mono text-sm font-bold text-ts-text">
              NO DUPLICATE CLUSTERS DISCOVERED
            </div>
            <p className="font-mono text-xs text-ts-muted max-w-md mx-auto">
              No duplicate file groups have been identified yet. Start a scan from the Overview page or load a sample inspection set to preview layout structure.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={loadSampleDuplicates}
              className="px-4 py-2 bg-ts-lime text-ts-bg font-mono text-xs font-bold tracking-wider rounded-xs active:scale-[0.98] transition-colors"
            >
              LOAD SAMPLE INSPECTION SET
            </button>
          </div>
        </div>
      ) : (
        /* Duplicate Groups List */
        <div className="space-y-6">
          {filteredGroups.map((group, groupIdx) => (
            <div
              key={group.id}
              className="bg-ts-panel border border-ts-border space-y-4 p-5 hover:border-ts-border-highlight transition-colors"
            >
              {/* Group Header: DUPLICATE GROUP #001 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ts-border-subtle">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-ts-surface border border-ts-border font-mono text-xs font-bold text-ts-lime">
                    DUPLICATE GROUP #{String(groupIdx + 1).padStart(3, '0')}
                  </span>
                  <span className="font-mono text-xs text-ts-muted">
                    {group.files.length} Identical Copies
                  </span>
                </div>

                <div className="flex items-center gap-4 font-mono text-xs">
                  <div className="text-ts-muted">
                    SIZE: <span className="text-ts-text font-bold">{formatBytes(group.sizeBytes)}</span>
                  </div>
                  <div className="text-ts-muted">
                    WASTED: <span className="text-ts-orange font-bold">{formatBytes(group.sizeBytes * (group.files.length - 1))}</span>
                  </div>
                </div>
              </div>

              {/* SHA-256 Hash */}
              <div className="flex items-center justify-between gap-3 p-2.5 bg-ts-surface border border-ts-border font-mono text-xs">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-ts-dim text-[10px] uppercase font-bold shrink-0">
                    SHA-256
                  </span>
                  <span className="text-ts-text truncate select-all">
                    {group.hash}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyHash(group.hash)}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] text-ts-muted hover:text-ts-lime transition-colors"
                  title="Copy SHA-256 digest"
                >
                  {copiedHash === group.hash ? (
                    <>
                      <Check size={12} className="text-ts-lime" />
                      <span className="text-ts-lime">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>

              {/* FILES LIST */}
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ts-muted">
                  FILES ({group.files.length})
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  {group.files.map((file, fileIdx) => (
                    <div
                      key={file.path}
                      className="p-3 bg-ts-surface border border-ts-border flex flex-col md:flex-row md:items-center justify-between gap-2 hover:border-ts-border-highlight transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-ts-dim text-[10px] shrink-0">
                          [{fileIdx === 0 ? 'ORIGINAL' : 'CLONE'}]
                        </span>
                        <span className="text-ts-text truncate font-mono select-all">
                          {file.path}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-ts-dim text-[11px] shrink-0">
                        <span>Modified: {file.modifiedAt}</span>
                        <span>{formatBytes(file.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
