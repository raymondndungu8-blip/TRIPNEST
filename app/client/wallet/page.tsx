"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  CreditCard,
  Plus,
  Check,
  ChevronRight,
  Shield,
  Zap,
  AlertCircle,
  X,
  Wallet,
  Receipt,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RequireRole } from "@/components/auth/require-role";
import { useSession } from "@/components/providers/session-provider";
import { useClientRides } from "@/hooks/use-rides";
import { usePaginatedList } from "@/hooks/use-pagination";
import { docs, patchDocument } from "@/lib/db";
import { formatKES } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface PaymentMethod {
  id: string;
  type: "mpesa" | "card";
  label: string;
  detail: string;
  isDefault: boolean;
  verified: boolean;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function AddMethodModal({
  clientId,
  onLinked,
  onClose,
}: {
  clientId: string;
  onLinked: (phone: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"choose" | "mpesa" | "done">("choose");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerifyMpesa() {
    if (!phone.trim() || !clientId) return;
    setLoading(true);
    try {
      await patchDocument(docs.client(clientId), { phone: `+254${phone}` });
      onLinked(`+254${phone}`);
      setLoading(false);
      setStep("done");
    } catch {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 pb-10 sm:rounded-3xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            {step === "choose" && "Add Payment Method"}
            {step === "mpesa" && "Link M-Pesa"}
            {step === "done" && "All Set!"}
          </h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <button
                onClick={() => setStep("mpesa")}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-2/50 p-4 text-left transition-all hover:border-accent/40 hover:bg-surface-2"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#4CAF50]/15">
                  <Smartphone className="h-6 w-6 text-[#4CAF50]" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">M-Pesa</p>
                  <p className="text-xs text-muted-foreground">Pay instantly from your M-Pesa balance</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              <button
                disabled
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-2/30 p-4 text-left opacity-50"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft">
                  <CreditCard className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Debit / Credit Card</p>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              </button>
            </motion.div>
          )}

          {step === "mpesa" && (
            <motion.div
              key="mpesa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <div className="rounded-2xl bg-[#4CAF50]/10 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#4CAF50]" />
                  <div>
                    <p className="text-sm font-medium text-foreground">How it works</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      We&apos;ll send an STK prompt to your phone. Approve it to verify your M-Pesa number. No money is charged during verification.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  M-Pesa Phone Number
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-2/50 px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">+254</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="7XXXXXXXX"
                    className="input-transparent flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                loading={loading}
                disabled={phone.length < 9}
                onClick={handleVerifyMpesa}
                className="rounded-2xl"
              >
                <Zap className="h-4 w-4" />
                Send Verification Prompt
              </Button>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-4 text-center"
            >
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#4CAF50]/15">
                <Check className="h-8 w-8 text-[#4CAF50]" />
              </div>
              <p className="font-display text-lg font-bold text-foreground">M-Pesa Verified</p>
              <p className="mt-1 text-sm text-muted-foreground">
                +254 {phone} is now linked to your TripNest wallet.
              </p>
              <Button fullWidth size="lg" onClick={onClose} className="mt-6 rounded-2xl">
                Done
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function WalletContent({ client }: { client: Client }) {
  const { setClient } = useSession();
  const [showAdd, setShowAdd] = useState(false);
  const { rides } = useClientRides(client.id);

  const methods = useMemo<PaymentMethod[]>(() => {
    if (client.phone) {
      return [
        {
          id: "mpesa-linked",
          type: "mpesa",
          label: "M-Pesa",
          detail: `+${client.phone.replace(/\D/g, "")}`,
          isDefault: true,
          verified: true,
        },
      ];
    }
    return [
      {
        id: "mpesa-add",
        type: "mpesa",
        label: "M-Pesa",
        detail: "Link a number to pay for rides",
        isDefault: true,
        verified: false,
      },
    ];
  }, [client.phone]);

  const transactions = useMemo(
    () =>
      rides
        .filter((r) => r.status === "completed" && r.payment_status === "paid")
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .map((r) => ({
          id: r.id,
          label: `Ride to ${r.destination}`,
          amount: r.budget,
          date: formatDate(r.created_at),
          status: "paid" as const,
        })),
    [rides]
  );

  const totalSpent = useMemo(
    () =>
      rides
        .filter((r) => r.status === "completed" && r.payment_status === "paid")
        .reduce((sum, r) => sum + (r.budget ?? 0), 0),
    [rides]
  );

  const transactionsPage = usePaginatedList(transactions, 8);

  function handleLinked(phone: string) {
    setClient({ ...client, phone });
    setShowAdd(false);
  }

  return (
    <AppShell>
      <div className="mb-1">
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          Wallet
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your payment methods
        </p>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 rounded-2xl border border-border bg-gradient-to-br from-accent/10 via-surface-2 to-surface-2 p-5"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15">
            <Wallet className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total spent on rides</p>
            <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">{formatKES(totalSpent)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Ride payments are settled via M-Pesa STK prompt at the end of every trip.
        </p>
      </motion.div>

      {/* Payment Methods */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-label text-muted-foreground">
            Payment Methods
          </h2>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent/80"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {methods.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-4"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#4CAF50]/15">
                <Smartphone className="h-5 w-5 text-[#4CAF50]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{m.label}</p>
                  {m.verified && (
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-[#4CAF50]/20">
                      <Check className="h-2.5 w-2.5 text-[#4CAF50]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{m.detail}</p>
              </div>
              {m.isDefault && (
                <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                  Default
                </span>
              )}
            </motion.div>
          ))}

          {methods.length === 0 && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/40 py-10 text-center">
              <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No payment methods yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Add M-Pesa to start paying for rides
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-label text-muted-foreground">
            Recent Rides
          </h2>
          <Receipt className="h-4 w-4 text-muted-foreground/40" />
        </div>

        <div className="mt-3 space-y-2">
          {transactions.length === 0 && (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/40 py-8 text-center">
              <AlertCircle className="mb-2 h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No paid rides yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Completed and paid trips will appear here
              </p>
            </div>
          )}
          {transactionsPage.visible.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface-2/30 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{tx.label}</p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{formatKES(tx.amount)}</p>
                <span className="text-[10px] font-medium uppercase text-[#4CAF50]">{tx.status}</span>
              </div>
            </div>
          ))}
        </div>
        {transactionsPage.hasMore && (
          <button
            onClick={transactionsPage.showMore}
            className="mt-3 w-full rounded-2xl border border-border bg-surface-2/40 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Show more rides ({transactions.length - transactionsPage.visible.length} more)
          </button>
        )}
      </div>

      {/* How It Works */}
      <div className="mt-7 rounded-2xl border border-border bg-surface-2/30 p-4">
        <h3 className="mb-3 font-display text-sm font-bold text-foreground">
          How Payments Work
        </h3>
        <div className="space-y-3">
          {[
            { step: "1", text: "Link your M-Pesa number in Payment Methods above" },
            { step: "2", text: "When your ride ends, you&apos;ll receive an STK prompt on your phone" },
            { step: "3", text: "Enter your M-Pesa PIN to complete the payment" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                {item.step}
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: item.text }} />
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddMethodModal
            clientId={client.id}
            onLinked={handleLinked}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

export default function WalletPage() {
  return (
    <RequireRole role="client">
      <WalletContentWrapper />
    </RequireRole>
  );
}

function WalletContentWrapper() {
  const { client } = useSession();
  if (!client) return null;
  return <WalletContent client={client} />;
}
