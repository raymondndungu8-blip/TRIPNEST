"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  CalendarCheck,
  Check,
  Receipt,
  Route,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { RequireRole } from "@/components/auth/require-role";
import { useDriverRides } from "@/hooks/use-rides";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatKES } from "@/lib/utils";
import type { Ride, Driver } from "@/lib/types";

function isThisWeek(value: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const day = (now.getDay() + 6) % 7; // Monday start
  startOfWeek.setDate(now.getDate() - day);
  return d >= startOfWeek && d <= now;
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

function Stat({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-bold uppercase tracking-label">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl font-extrabold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function DriverWallet({ driver }: { driver: Driver }) {
  const { rides, loading } = useDriverRides(driver.id);

  const completed = useMemo(
    () => rides.filter((r) => r.status === "completed"),
    [rides]
  );
  const paid = useMemo(
    () => completed.filter((r) => r.payment_status === "paid"),
    [completed]
  );
  const inProgress = useMemo(
    () => rides.filter((r) => r.status === "accepted" || r.status === "in_progress"),
    [rides]
  );

  const totalEarned = paid.reduce((sum, r) => sum + (r.budget ?? 0), 0);
  const weekEarned = paid
    .filter((r) => isThisWeek(r.created_at))
    .reduce((sum, r) => sum + (r.budget ?? 0), 0);
  const inProgressValue = inProgress.reduce((sum, r) => sum + (r.budget ?? 0), 0);

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Earnings" subtitle="Your driver wallet" />
        <div className="mt-5 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Earnings" subtitle="Real-time payout ledger from your completed rides." />

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 rounded-2xl border border-border bg-gradient-to-br from-[#34d399]/10 via-surface-2 to-surface-2 p-5"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#34d399]/15">
            <Wallet className="h-5 w-5 text-[#34d399]" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total earned this week</p>
            <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
              {formatKES(weekEarned)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Payouts land on your linked M-Pesa number after every ride is paid. This wallet reflects
          every completed trip in real time.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Total earned" value={formatKES(totalEarned)} icon={TrendingUp} sub={`${paid.length} paid rides`} />
        <Stat
          label="Pending rides"
          value={formatKES(inProgressValue)}
          icon={ArrowDownToLine}
          sub={`${inProgress.length} in progress`}
        />
      </div>

      {/* Payout method */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#4CAF50]/15">
          <Smartphone className="h-5 w-5 text-[#4CAF50]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">M-Pesa payout</p>
            <span className="grid h-4 w-4 place-items-center rounded-full bg-[#4CAF50]/20">
              <Check className="h-2.5 w-2.5 text-[#4CAF50]" />
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {driver.phone ? maskPhone(driver.phone) : "No number yet — add one in Profile"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#4CAF50]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4CAF50]">
          Active
        </span>
      </div>

      {/* Payouts list */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-label text-muted-foreground">
            Payouts
          </h2>
          <Receipt className="h-4 w-4 text-muted-foreground/40" />
        </div>

        {paid.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payouts yet"
            description="Complete and get paid for trips — your earnings appear here instantly."
          />
        ) : (
          <div className="mt-3 space-y-2">
            {paid.map((ride: Ride) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2/30 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/12">
                    <Route className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ride.pickup} → {ride.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(ride.created_at)}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-foreground">{formatKES(ride.budget)}</p>
                  {ride.mpesa_receipt ? (
                    <span className="font-mono text-[10px] uppercase text-[#34d399]">
                      {ride.mpesa_receipt}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium uppercase text-[#34d399]">Paid</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* How payouts work */}
      <div className="mt-7 rounded-2xl border border-border bg-surface-2/30 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <CalendarCheck className="h-4 w-4 text-accent" />
          How Payouts Work
        </h3>
        <div className="space-y-3">
          {[
            { step: "1", text: "Complete a ride and the rider pays via the M-Pesa STK prompt" },
            { step: "2", text: "The payment confirms instantly and lands on your linked M-Pesa number" },
            { step: "3", text: "Your earnings ledger updates in real time on this page" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#34d399]/15 text-[11px] font-bold text-[#34d399]">
                {item.step}
              </span>
              <p className="text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10) return phone;
  return `+${cleaned.slice(0, cleaned.length - 6)} ••• ••• ${cleaned.slice(-3)}`;
}

export default function WalletPage() {
  return (
    <RequireRole role="driver">
      <DriverWalletContent />
    </RequireRole>
  );
}

function DriverWalletContent() {
  const { driver } = useSession();
  if (!driver) return null;
  return <DriverWallet driver={driver} />;
}