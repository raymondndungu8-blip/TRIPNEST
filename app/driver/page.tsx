"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarCheck,
  Inbox,
  Moon,
  Route,
  Wallet,
  User,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { RequireRole } from "@/components/auth/require-role";
import { useDriverRides, useOpenRequests } from "@/hooks/use-rides";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FadeIn, StaggerList } from "@/components/motion/motion";
import { formatKES, friendlyErrorMessage } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { Client, Driver } from "@/lib/types";
import { AvailabilityCard } from "@/components/driver/availability-card";
import { RequestCard } from "@/components/driver/request-card";
import { TripCard } from "@/components/driver/trip-card";
import { StatCard } from "@/components/driver/stat-card";
import { useToast } from "@/components/providers/toast-provider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isToday(value: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/* ── Become a Rider ───────────────────────────────────── */

function BecomeRiderModal({
  driver,
  onClose,
}: {
  driver: Driver;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user, setClient } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState(driver.name);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(driver.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter your name";
    else if (name.trim().length > 100) next.name = "Too long (max 100)";
    if (!email.trim()) next.email = "Enter your email";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email";
    if (phone.trim().length > 20) next.phone = "Phone number is too long";
    setErrors(next);
    if (Object.keys(next).length > 0 || !user) return;

    setSubmitting(true);
    try {
      // A baseline client row may already exist (created by a DB trigger).
      // Update it if present, otherwise insert a fresh one.
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      const query = existing
        ? supabase.from("clients").update(payload).eq("user_id", user.id)
        : supabase.from("clients").insert({ user_id: user.id, ...payload });

      const { data, error } = await query.select().single();
      if (error) throw error;

      setClient(data as Client);
      toast("Rider mode is ready!", "success");
      router.push("/client");
    } catch (err) {
      console.error("[become rider] failed", err);
      toast(
        friendlyErrorMessage(
          err,
          "Could not set up rider mode. Please try again."
        ),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              Become a rider
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Set up rider mode on your account so you can book rides too. You
              can switch between driver and rider anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="r_name" required error={errors.name}>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="r_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Wanjiru"
                maxLength={100}
                className="pl-10"
                invalid={!!errors.name}
                autoComplete="name"
              />
            </div>
          </Field>

          <Field label="Email" htmlFor="r_email" required error={errors.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="r_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                maxLength={255}
                className="pl-10"
                invalid={!!errors.email}
                autoComplete="email"
              />
            </div>
          </Field>

          <Field
            label="Phone number"
            htmlFor="r_phone"
            hint="For M-Pesa payments and driver contact"
            error={errors.phone}
          >
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="r_phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                maxLength={20}
                className="pl-10"
                invalid={!!errors.phone}
                autoComplete="tel"
              />
            </div>
          </Field>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {submitting ? "Setting up…" : "Enable rider mode"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function DriverDashboard({ driver }: { driver: Driver }) {
  const router = useRouter();
  const { client, setRolePreference } = useSession();
  const [showBecomeRider, setShowBecomeRider] = useState(false);
  const {
    rides: requests,
    loading: requestsLoading,
    refetch: refetchRequests,
  } = useOpenRequests(driver.id, driver.is_available);

  const { rides: myTrips, refetch: refetchTrips } = useDriverRides(driver.id);

  const upcoming = useMemo(
    () =>
      myTrips.filter(
        (r) => r.status === "accepted" || r.status === "in_progress"
      ),
    [myTrips]
  );
  const history = useMemo(
    () => myTrips.filter((r) => r.status === "completed"),
    [myTrips]
  );

  const todaysAccepted = useMemo(
    () =>
      myTrips.filter(
        (r) =>
          (r.status === "accepted" || r.status === "completed") &&
          isToday(r.created_at)
      ).length,
    [myTrips]
  );
  const totalEarned = useMemo(
    () =>
      history.reduce((sum, r) => sum + (r.budget ?? 0), 0),
    [history]
  );

  // The trips list updates live; both sections share one refetch trigger.
  function refetchAll() {
    refetchRequests();
    refetchTrips();
  }

  function handleRiderCta() {
    if (client) {
      setRolePreference("client");
      router.push("/client");
    } else {
      setShowBecomeRider(true);
    }
  }

  return (
    <AppShell>
      <FadeIn>
        <PageHeader
          title={`Welcome back, ${driver.name.split(" ")[0]}`}
          subtitle="Your performance index is up this week."
          action={
            <button
              type="button"
              onClick={handleRiderCta}
              aria-label={client ? "Switch to rider mode" : "Become a rider"}
              className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftRight className="h-4 w-4" />
              {client ? "Rider mode" : "Become a rider"}
            </button>
          }
        />
      </FadeIn>

      {/* Incoming requests (Active Alerts) */}
      <SectionTitle>Incoming requests</SectionTitle>
      {!driver.is_available ? (
        <EmptyState
          icon={Moon}
          title="You're offline"
          description="Toggle availability on to start receiving ride requests."
        />
      ) : requestsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests right now"
          description="New ride requests will appear here the moment they come in."
        />
      ) : (
        <StaggerList className="space-y-3">
          {requests.map((ride) => (
            <RequestCard
              key={ride.id}
              ride={ride}
              driverId={driver.id}
              onResolved={refetchAll}
            />
          ))}
        </StaggerList>
      )}

      {/* Availability */}
      <div className="mt-5">
        <AvailabilityCard driver={driver} />
      </div>

      {/* Stats */}
      <StaggerList className="mb-1 grid grid-cols-3 gap-2">
        <StatCard
          icon={Wallet}
          label="TODAY'S REVENUE"
          value={formatKES(totalEarned)}
        />
        <StatCard
          icon={CalendarCheck}
          label="TOTAL RIDES"
          value={String(todaysAccepted)}
        />
        <StatCard
          icon={Route}
          label="Completed"
          value={String(history.length)}
        />
      </StaggerList>

      {/* Upcoming trips */}
      <SectionTitle>Your trips</SectionTitle>
      {upcoming.length === 0 ? (
        <EmptyState
          icon={Route}
          title="No upcoming trips"
          description="Accepted rides will show up here for you to manage."
        />
      ) : (
        <StaggerList className="space-y-3">
          {upcoming.map((ride) => (
            <TripCard key={ride.id} ride={ride} onResolved={refetchAll} />
          ))}
        </StaggerList>
      )}

      {/* History */}
      {history.length > 0 && (
        <>
          <SectionTitle>History</SectionTitle>
          <StaggerList className="space-y-3">
            {history.map((ride) => (
              <TripCard key={ride.id} ride={ride} onResolved={refetchAll} />
            ))}
          </StaggerList>
        </>
      )}

      {showBecomeRider && (
        <BecomeRiderModal
          driver={driver}
          onClose={() => setShowBecomeRider(false)}
        />
      )}
    </AppShell>
  );
}

export default function DriverPage() {
  const { driver } = useSession();
  return (
    <RequireRole role="driver">
      {driver && <DriverDashboard driver={driver} />}
    </RequireRole>
  );
}
