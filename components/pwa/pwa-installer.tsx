"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tripnest_pwa_prompt_dismissed";

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[pwa] service worker registration failed", err);
      });
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) {
        setDismissed(true);
        return;
      }
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setDismissed(true);
    }
  }, [deferredPrompt]);

  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2"
        role="dialog"
        aria-label="Install TripNest"
      >
        <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-surface/95 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10">
              <Download size={20} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-white">
                Install TripNest
              </p>
              <p className="text-xs text-muted-foreground">
                Get faster access to rides, direct from your home screen.
              </p>
            </div>
          </div>
          <button
            onClick={install}
            className="mt-3 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Install app
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}