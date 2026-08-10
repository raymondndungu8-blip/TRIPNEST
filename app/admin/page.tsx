"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Car,
  Wifi,
  ClipboardList,
  Wallet,
  CalendarHeart,
  ShieldAlert,
  Plus,
  Trash2,
  LogOut,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import {
  queryDocuments,
  collections,
  docs,
  createDocument,
  removeDocument,
  orderBy,
  limit,
} from "@/lib/db";
import { isAdminUser } from "@/lib/admins";
import { cn, formatKES, formatDateTime, timeAgo } from "@/lib/utils";
import type { Client, Driver, EventItem, Ride } from "@/lib/types";

interface Metrics {
  clients: number;
  drivers: number;
  online: number;
  open: number;
  completed: number;
  revenue: number;
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl",
          accent ? "bg-accent/20" : "bg-surface-2"
        )}
      >
        <Icon className={cn("h-4 w-4", accent ? "text-accent" : "text-muted-foreground")} />
      </span>
      <p className="mt-3 font-display text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useSession();
  const { toast } = useToast();
  const [phase, setPhase] = useState<"loading" | "denied" | "ready">("loading");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAll() {
    const [c, d, r, e] = await Promise.all([
      queryDocuments<Client>(collections.clients(), orderBy("createdAt", "desc"), limit(200)),
      queryDocuments<Driver>(collections.drivers(), orderBy("createdAt", "desc"), limit(200)),
      queryDocuments<Ride>(collections.rides(), orderBy("createdAt", "desc"), limit(100)),
      queryDocuments<EventItem>(collections.events(), orderBy("eventDate", "asc"), limit(100)),
    ]);
    setClients(c);
    setDrivers(d);
    setRides(r);
    setEvents(e);
    const open = r.filter((x) => x.status === "requested" && !x.driver_id).length;
    const completed = r.filter((x) => x.status === "completed").length;
    const revenue = r
      .filter((x) => x.payment_status === "paid")
      .reduce((sum, x) => sum + (x.budget || 0), 0);
    setMetrics({
      clients: c.length,
      drivers: d.length,
      online: d.filter((x) => x.is_available).length,
      open,
      completed,
      revenue,
    });
  }

  useEffect(() => {
    if (!user) return;
    let active = true;
    isAdminUser(user.uid)
      .then((ok) => {
        if (!active) return;
        if (ok) {
          setPhase("ready");
          loadAll().catch(() =>
            toast("Could not load dashboard data", "error")
          );
        } else {
          setPhase("denied");
        }
      })
      .catch(() => {
        if (active) setPhase("denied");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadAll();
      toast("Dashboard refreshed", "success");
    } catch {
      toast("Could not refresh", "error");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    setBusyId(eventId);
    try {
      await removeDocument(docs.event(eventId));
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast("Event deleted", "success");
    } catch {
      toast("Could not delete event", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (phase === "loading" || !user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pt-10">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold text-foreground">
          Admin access only
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard is restricted to TripNest administrators. If you run
          the platform, grant your account admin access in Firestore and try
          again.
        </p>
        <div className="mt-6 flex w-full gap-2">
          <Button variant="outline" fullWidth onClick={() => router.push("/")}>
            Go home
          </Button>
          <Button fullWidth onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-5">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span className="font-display text-sm font-extrabold uppercase tracking-[0.16em]">
              TripNest Admin
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Live operations · {formatDateTime(new Date().toISOString())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {!metrics ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile icon={Users} label="Riders" value={metrics.clients} />
          <StatTile icon={Car} label="Drivers" value={metrics.drivers} />
          <StatTile icon={Wifi} label="Online now" value={metrics.online} accent />
          <StatTile icon={ClipboardList} label="Open requests" value={metrics.open} />
          <StatTile icon={CalendarHeart} label="Trips completed" value={metrics.completed} />
          <StatTile icon={Wallet} label="Revenue (paid)" value={formatKES(metrics.revenue)} accent />
        </section>
      )}

      {/* Recent rides */}
      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          Recent rides
        </h2>
        <div className="space-y-2">
          {rides.length === 0 && (
            <Skeleton className="h-16 w-full" />
          )}
          {rides.slice(0, 6).map((r) => (
            <Row key={r.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {r.pickup} → {r.destination}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(r.created_at)} · {r.vehicle_category}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">
                  {formatKES(r.budget)}
                </p>
                <p
                  className={cn(
                    "text-xs font-semibold capitalize",
                    r.status === "completed"
                      ? "text-success"
                      : r.status === "requested"
                      ? "text-warning"
                      : "text-muted-foreground"
                  )}
                >
                  {r.status.replace("_", " ")}
                  {r.payment_status === "paid" && " · paid"}
                </p>
              </div>
            </Row>
          ))}
        </div>
      </section>

      {/* Event management */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">Events</h2>
          <Button size="sm" onClick={() => setShowCreateEvent(true)}>
            <Plus className="h-4 w-4" />
            Add event
          </Button>
        </div>
        <div className="space-y-2">
          {events.map((e) => (
            <Row key={e.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {e.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.location} · {e.event_date && formatDateTime(e.event_date)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {formatKES(e.estimated_budget)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={busyId === e.id}
                  onClick={() => handleDeleteEvent(e.id)}
                  aria-label={`Delete ${e.name}`}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Row>
          ))}
          {events.length === 0 && (
            <Row>
              <p className="text-sm text-muted-foreground">
                No events yet. Add one to fill the event transport page.
              </p>
            </Row>
          )}
        </div>
      </section>

      {/* Driver roster */}
      <section className="mt-8">
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          Driver roster
        </h2>
        <div className="space-y-2">
          {drivers.slice(0, 8).map((d) => (
            <Row key={d.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {d.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {d.vehicle_type} · {d.plate_number}
                </p>
              </div>
              <div className="text-right text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                    d.is_available
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      d.is_available ? "bg-success" : "bg-muted-foreground/50"
                    )}
                  />
                  {d.is_available ? "Online" : "Offline"}
                </span>
              </div>
            </Row>
          ))}
          {drivers.length === 0 && <Skeleton className="h-16 w-full" />}
        </div>
      </section>

      {showCreateEvent && (
        <CreateEventModal
          onClose={() => setShowCreateEvent(false)}
          onCreated={(event) => {
            setEvents((prev) => [event, ...prev]);
            setShowCreateEvent(false);
          }}
        />
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground/60">
        <Link href="/" className="text-accent hover:underline">
          Back to TripNest
        </Link>
      </p>
    </main>
  );
}

function CreateEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (event: EventItem) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !location.trim()) {
      toast("Event name and location are required", "warning");
      return;
    }
    const parsedBudget = Number(budget);
    if (!budget.trim() || !Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      toast("Enter a valid estimated budget", "warning");
      return;
    }
    setSaving(true);
    try {
      const id = await createDocument(collections.events(), {
        name: name.trim(),
        location: location.trim(),
        eventDate: date ? new Date(date).toISOString() : new Date().toISOString(),
        estimatedBudget: parsedBudget,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      });
      onCreated({
        id,
        name: name.trim(),
        location: location.trim(),
        event_date: date ? new Date(date).toISOString() : new Date().toISOString(),
        estimated_budget: parsedBudget,
        image_url: null,
        created_at: new Date().toISOString(),
      });
      toast("Event published", "success");
    } catch {
      toast("Could not create event", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground">
            New event
          </h3>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Event name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nairobi F1 Grand Prix"
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-[15px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring/60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Location
            </span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Uhuru Gardens, Nairobi"
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-[15px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring/60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Date & time
            </span>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-[15px] text-slate-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-ring/60"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Estimated budget (KES)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 2500"
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-[15px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-ring/60"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleCreate}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}