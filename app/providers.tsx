"use client";

import { SessionProvider } from "@/components/providers/session-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PwaInstaller } from "@/components/pwa/pwa-installer";
import { PushSubscriptionProvider } from "@/components/pwa/push-subscription-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        {children}
        <BottomNav />
        <PwaInstaller />
        <PushSubscriptionProvider />
      </ToastProvider>
    </SessionProvider>
  );
}
