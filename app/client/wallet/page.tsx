"use client";

import { useEffect, useMemo, useState } from "react";
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
  LockKeyhole,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RequireRole } from "@/components/auth/require-role";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { useClientRides } from "@/hooks/use-rides";
import { usePaginatedList } from "@/hooks/use-pagination";
import { docs, patchDocument } from "@/lib/db";
import { formatKES, friendlyErrorMessage } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface PaymentMethod {
  id: "mpesa" | "card";
  type: "mpesa" | "card";
  label: string;
  detail: string;
  isDefault: boolean;
  active: boolean;
}

type SetupMethod = "choose" | "mpesa" | "card" | "done";

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

function normalizeKenyanPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("254")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 9 ? `254${digits}` : "";
}

function displayKenyanPhone(value: string): string {
  const normalized = normalizeKenyanPhone(value);
  return normalized ? normalized.slice(3) : value.replace(/\D/g, "").slice(-9);
}

function AddMethodModal({
  initialMethod,
  currentPhone,
  cardReady,
  clientId,
  onClose,
  onSaved,
}: {
  initialMethod: SetupMethod;
  currentPhone: string;
  cardReady: boolean;
  clientId: string;
  onClose: () => void;
  onSaved: (method: "mpesa" | "card", value?: string) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<SetupMethod>(initialMethod);
  const [phone, setPhone] = useState(displayKenyanPhone(currentPhone));
  const [loading, setLoading] = useState(false);

  async function handleSaveMpesa() {
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) {
      toast("Enter a valid Kenyan number, for example 0712 345 678", "warning");
      return;
    }
    setLoading(true);
    try {
      await patchDocument(docs.client(clientId), { mpesaPhone: normalized });
      onSaved("mpesa", normalized);
      setStep("done");
    } catch (error) {
      toast(friendlyErrorMessage(error, "Could not save your M-PESA number"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableCard() {
    setLoading(true);
    try {
      await patchDocument(docs.client(clientId), { cardReady: true });
      onSaved("card");
      setStep("done");
    } catch (error) {
      toast(friendlyErrorMessage(error, "Could not enable card checkout"), "error");
    } finally {
      setLoading(false);
    }
  }

  const title =
    step === "choose"
      ? "Add Payment Method"
      : step === "mpesa"
        ? "Link M-PESA"
        : step === "card"
          ? "Enable Card Payments"
          : "All Set!";

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
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close payment method setup"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "choose" && (
            <motion.div key="choose" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <button onClick={() => setStep("mpesa")} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-2/50 p-4 text-left transition-all hover:border-[#4CAF50]/50 hover:bg-surface-2">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#4CAF50]/15"><Smartphone className="h-6 w-6 text-[#4CAF50]" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">M-PESA</p>
                  <p className="text-xs text-muted-foreground">Save the number used for IntaSend STK prompts</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <button onClick={() => setStep("card")} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-2/50 p-4 text-left transition-all hover:border-accent/50 hover:bg-surface-2">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft"><CreditCard className="h-6 w-6 text-accent" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Credit / Debit Card</p>
                  <p className="text-xs text-muted-foreground">Enable secure card checkout through IntaSend</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </motion.div>
          )}

          {step === "mpesa" && (
            <motion.div key="mpesa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
              <div className="rounded-2xl bg-[#4CAF50]/10 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#4CAF50]" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Your number, your choice</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Update the Kenyan number that should receive an IntaSend STK prompt. Saving this number does not charge you; payment is requested only after a driver confirms arrival.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="wallet_mpesa_phone">M-PESA phone number</label>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-2/50 px-4 py-3 focus-within:border-accent/60">
                  <span className="text-sm font-medium text-muted-foreground">+254</span>
                  <input id="wallet_mpesa_phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="712 345 678" className="input-transparent flex-1 bg-transparent text-sm focus:outline-none" />
                </div>
              </div>
              <Button fullWidth size="lg" loading={loading} disabled={phone.replace(/\D/g, "").length !== 9} onClick={handleSaveMpesa} className="rounded-2xl"><Zap className="h-4 w-4" />Save M-PESA Number</Button>
            </motion.div>
          )}

          {step === "card" && (
            <motion.div key="card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
              <div className="rounded-2xl bg-primary-soft p-4">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Secure card entry</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">TripNest never stores your full card number or CVV. When you pay for a ride, IntaSend opens its secure hosted checkout where you enter your Visa or Mastercard details.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface-2/40 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground"><CreditCard className="h-4 w-4 text-accent" /><span className="font-semibold">{cardReady ? "Card checkout is enabled" : "Card checkout is ready to enable"}</span></div>
                <p className="mt-2 text-xs leading-5">The actual card form appears on the IntaSend payment page after a ride payment link is created. This keeps sensitive card data outside TripNest.</p>
              </div>
              <Button fullWidth size="lg" loading={loading} onClick={handleEnableCard} className="rounded-2xl"><ExternalLink className="h-4 w-4" />{cardReady ? "Keep Card Checkout Enabled" : "Enable Card Checkout"}</Button>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#4CAF50]/15"><Check className="h-8 w-8 text-[#4CAF50]" /></div>
              <p className="font-display text-lg font-bold text-foreground">Payment method updated</p>
              <p className="mt-1 text-sm text-muted-foreground">{phone ? `M-PESA +254 ${displayKenyanPhone(phone)} is ready for STK prompts.` : "Secure IntaSend card checkout is ready for your next ride."}</p>
              <Button fullWidth size="lg" onClick={onClose} className="mt-6 rounded-2xl">Done</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function WalletContent({ client }: { client: Client }) {
  const { setClient } = useSession();
  const { rides } = useClientRides(client.id);
  const [showAdd, setShowAdd] = useState(false);
  const [initialMethod, setInitialMethod] = useState<SetupMethod>("choose");
  const [mpesaPhone, setMpesaPhone] = useState(client.mpesa_phone ?? "");
  const [cardReady, setCardReady] = useState(client.card_ready);

  useEffect(() => {
    setMpesaPhone(client.mpesa_phone ?? "");
    setCardReady(client.card_ready);
  }, [client.mpesa_phone, client.card_ready]);

  const methods: PaymentMethod[] = [
    { id: "mpesa", type: "mpesa", label: "M-PESA", detail: mpesaPhone ? `+${mpesaPhone}` : "No phone linked — tap to add one", isDefault: true, active: true },
    { id: "card", type: "card", label: "Credit / Debit Card", detail: cardReady ? "Secure IntaSend checkout enabled" : "Tap to enable secure card checkout", isDefault: false, active: true },
  ];

  const transactions = useMemo(
    () => rides.filter((r) => r.status === "completed" && r.payment_status === "paid").slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((r) => ({ id: r.id, label: `Ride to ${r.destination}`, amount: r.budget, date: formatDate(r.created_at), status: "paid" as const })),
    [rides]
  );
  const totalSpent = useMemo(() => rides.filter((r) => r.status === "completed" && r.payment_status === "paid").reduce((sum, r) => sum + (r.budget ?? 0), 0), [rides]);
  const transactionsPage = usePaginatedList(transactions, 8);

  function openMethod(method: SetupMethod) {
    setInitialMethod(method);
    setShowAdd(true);
  }

  function handleSaved(method: "mpesa" | "card", value?: string) {
    if (method === "mpesa" && value) {
      setMpesaPhone(value);
      setClient({ ...client, mpesa_phone: value, card_ready: cardReady });
    }
    if (method === "card") {
      setCardReady(true);
      setClient({ ...client, mpesa_phone: mpesaPhone || null, card_ready: true });
    }
  }

  return (
    <AppShell>
      <div className="mb-1"><h1 className="font-display text-2xl font-extrabold text-foreground">Wallet</h1><p className="text-sm text-muted-foreground">Manage your payment methods</p></div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl border border-border bg-gradient-to-br from-accent/10 via-surface-2 to-surface-2 p-5">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15"><Wallet className="h-5 w-5 text-accent" /></div><div><p className="text-xs font-medium text-muted-foreground">Total spent on rides</p><p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">{formatKES(totalSpent)}</p></div></div>
        <p className="mt-3 text-xs text-muted-foreground">Ride payments are settled through IntaSend using M-PESA STK or secure Visa and Mastercard checkout.</p>
      </motion.div>

      <div className="mt-6">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-label text-muted-foreground">Payment Methods</h2><button onClick={() => openMethod("choose")} className="flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent/80"><Plus className="h-3.5 w-3.5" />Add</button></div>
        <div className="mt-3 space-y-2">
          {methods.map((method) => (
            <motion.button key={method.id} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={() => openMethod(method.type)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-4 text-left transition-colors hover:border-accent/50 hover:bg-surface-2/70">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${method.type === "mpesa" ? "bg-[#4CAF50]/15" : "bg-primary-soft"}`}>{method.type === "mpesa" ? <Smartphone className="h-5 w-5 text-[#4CAF50]" /> : <CreditCard className="h-5 w-5 text-accent" />}</div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold text-foreground">{method.label}</p><span className="text-[10px] font-bold uppercase tracking-wider text-[#4CAF50]">Active</span></div><p className="truncate text-xs text-muted-foreground">{method.detail}</p></div>
              <div className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#4CAF50]/15"><Check className="h-3 w-3 text-[#4CAF50]" /></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>
            </motion.button>
          ))}
          {methods.length === 0 && <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/40 py-10 text-center"><AlertCircle className="mb-2 h-8 w-8 text-muted-foreground/30" /><p className="text-sm font-medium text-muted-foreground">No payment methods yet</p><p className="mt-1 text-xs text-muted-foreground/70">Add M-PESA or a card to start paying for rides</p></div>}
        </div>
      </div>

      <div className="mt-7"><div className="flex items-center justify-between"><h2 className="text-sm font-bold uppercase tracking-label text-muted-foreground">Recent Rides</h2><Receipt className="h-4 w-4 text-muted-foreground/40" /></div><div className="mt-3 space-y-2">
        {transactions.length === 0 && <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/40 py-8 text-center"><AlertCircle className="mb-2 h-7 w-7 text-muted-foreground/30" /><p className="text-sm font-medium text-muted-foreground">No paid rides yet</p><p className="mt-1 text-xs text-muted-foreground/70">Completed and paid trips will appear here</p></div>}
        {transactionsPage.visible.map((tx) => <div key={tx.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface-2/30 px-4 py-3"><div><p className="text-sm font-medium text-foreground">{tx.label}</p><p className="text-xs text-muted-foreground">{tx.date}</p></div><div className="text-right"><p className="text-sm font-bold text-foreground">{formatKES(tx.amount)}</p><span className="text-[10px] font-medium uppercase text-[#4CAF50]">{tx.status}</span></div></div>)}
      </div>{transactionsPage.hasMore && <button onClick={transactionsPage.showMore} className="mt-3 w-full rounded-2xl border border-border bg-surface-2/40 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">Show more rides ({transactions.length - transactionsPage.visible.length} more)</button>}</div>

      <div className="mt-7 rounded-2xl border border-border bg-surface-2/30 p-4"><h3 className="mb-3 font-display text-sm font-bold text-foreground">How Payments Work</h3><div className="space-y-3">{[
        { step: "1", text: "Tap M-PESA or Credit / Debit Card above to update your payment method." },
        { step: "2", text: "When your ride ends, choose M-PESA STK or secure IntaSend card checkout." },
        { step: "3", text: "Approve the M-PESA prompt or enter card details on IntaSend&apos;s hosted page." },
      ].map((item) => <div key={item.step} className="flex items-start gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">{item.step}</span><p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p></div>)}</div></div>

      <AnimatePresence>{showAdd && <AddMethodModal initialMethod={initialMethod} currentPhone={mpesaPhone} cardReady={cardReady} clientId={client.id} onClose={() => setShowAdd(false)} onSaved={handleSaved} />}</AnimatePresence>
    </AppShell>
  );
}

export default function WalletPage() {
  return <RequireRole role="client"><WalletContentWrapper /></RequireRole>;
}

function WalletContentWrapper() {
  const { client } = useSession();
  if (!client) return null;
  return <WalletContent client={client} />;
}
