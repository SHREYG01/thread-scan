"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Folder,
  Files,
  Cpu,
  ChartBar,
  Terminal,
  Gear,
  Circle,
  Flask,
} from '@phosphor-icons/react';
import { useScanner } from '@/lib/context/ScannerContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'OVERVIEW', path: '/overview', icon: Folder },
  { label: 'DUPLICATES', path: '/duplicates', icon: Files },
  { label: 'THREAD MONITOR', path: '/threads', icon: Cpu },
  { label: 'BENCHMARK', path: '/benchmark', icon: ChartBar },
  { label: 'ACTIVITY', path: '/activity', icon: Terminal },
  { label: 'SYSTEM', path: '/system', icon: Gear },
];

export default function WorkstationSidebar() {
  const pathname = usePathname();
  const { backendOnline, isTestPreviewActive, toggleTestPreview } = useScanner();

  return (
    <aside className="w-64 shrink-0 bg-ts-surface border-r border-ts-border flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-ts-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2.5 h-2.5 bg-ts-lime rounded-xs" />
            <span className="font-mono text-base font-bold tracking-wider text-ts-text">
              THREAD//SCAN
            </span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ts-muted leading-tight">
            CONCURRENT<br />
            FILESYSTEM<br />
            ANALYZER
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1" aria-label="Workstation Navigation">
          <div className="px-3 py-1.5 text-[10px] font-mono tracking-widest text-ts-dim uppercase">
            Navigation
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path === '/overview' && pathname === '/');

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center justify-between px-3 py-2.5 text-xs font-mono tracking-wider transition-colors duration-150 border-l-2 ${
                  isActive
                    ? 'bg-ts-panel text-ts-lime border-ts-lime font-semibold'
                    : 'text-ts-muted border-transparent hover:text-ts-text hover:bg-ts-panel/50 hover:border-ts-border-highlight'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    size={16}
                    weight={isActive ? 'fill' : 'regular'}
                    className={isActive ? 'text-ts-lime' : 'text-ts-muted group-hover:text-ts-text'}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-ts-border text-ts-dim rounded-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & Backend Offline Status */}
      <div className="p-4 border-t border-ts-border space-y-3 bg-ts-bg/40">
        {/* Standby preview toggle for interactive verification */}
        <button
          type="button"
          onClick={toggleTestPreview}
          className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-mono border transition-all duration-150 active:scale-[0.98] ${
            isTestPreviewActive
              ? 'bg-ts-lime/10 border-ts-lime/40 text-ts-lime'
              : 'bg-ts-panel border-ts-border text-ts-muted hover:text-ts-text hover:border-ts-border-highlight'
          }`}
          title="Toggle standby preview mode to evaluate UI animations and pipeline metrics before backend connection"
        >
          <div className="flex items-center gap-2">
            <Flask size={14} weight={isTestPreviewActive ? 'fill' : 'regular'} />
            <span>STANDBY PREVIEW</span>
          </div>
          <span className="text-[9px] uppercase px-1 py-0.5 rounded-xs bg-ts-surface border border-ts-border">
            {isTestPreviewActive ? 'ACTIVE' : 'READY'}
          </span>
        </button>

        {/* Backend Status Display */}
        <div className="p-3 bg-ts-panel border border-ts-border rounded-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ts-muted">
              BACKEND
            </span>
            <div className="flex items-center gap-1.5">
              <Circle
                size={8}
                weight="fill"
                className={backendOnline ? 'text-ts-lime animate-pulse' : 'text-ts-orange'}
              />
              <span
                className={`font-mono text-[10px] font-semibold tracking-wider ${
                  backendOnline ? 'text-ts-lime' : 'text-ts-orange'
                }`}
              >
                {backendOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div className="font-mono text-[10px] text-ts-dim leading-snug">
            {backendOnline
              ? 'C++17 Engine Connected: 127.0.0.1:8080'
              : 'Daemon awaiting connection on port 8080'}
          </div>
        </div>
      </div>
    </aside>
  );
}
