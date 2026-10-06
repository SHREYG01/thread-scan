import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WorkstationShell from "@/components/layout/WorkstationShell";
import { ScannerProvider } from "@/lib/context/ScannerContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "THREAD//SCAN | Concurrent Filesystem Analyzer",
  description: "High-performance multithreaded duplicate file finder and filesystem analysis workstation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-[100dvh] bg-ts-bg text-ts-text flex flex-col font-sans selection:bg-ts-lime selection:text-ts-bg">
        <ScannerProvider>
          <WorkstationShell>{children}</WorkstationShell>
        </ScannerProvider>
      </body>
    </html>
  );
}
