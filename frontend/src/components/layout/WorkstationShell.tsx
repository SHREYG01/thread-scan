"use client";

import React from 'react';
import WorkstationSidebar from './WorkstationSidebar';
import WorkstationHeader from './WorkstationHeader';

export default function WorkstationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-ts-bg text-ts-text">
      <WorkstationSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WorkstationHeader />

        <main className="flex-1 overflow-y-auto workstation-grid p-6 lg:p-8">
          <div className="max-w-[1440px] mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
