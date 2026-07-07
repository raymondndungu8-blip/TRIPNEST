"use client";

import { SessionProvider } from "@/components/providers/session-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { BottomNav } from "@/components/layout/bottom-nav";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        {children}
        <BottomNav />
      </ToastProvider>
    </SessionProvider>
  );
}
