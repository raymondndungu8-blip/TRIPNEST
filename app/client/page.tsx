"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  LogOut,
  MoreVertical,
  CarFront,
  Users,
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Menu,
  Car,
  Bus,
  Navigation,
  Wallet,
  Users2,
  LocateFixed,
  X,
  Home,
  CalendarHeart,
  Route,
  UserCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { SectionTitle } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RideCard } from "@/components/ride/ride-card";
import { FadeIn, StaggerList, MotionItem, fadeUp } from "@/components/motion/motion";
import { RideMap } from "@/components/ride/ride-map-dynamic";
import { ActiveRideTracker } from "@/components/ride/active-ride-tracker";
import { RequireRole } from "@/components/auth/require-role";
import { DriverListItem } from "@/components/client/driver-list-item";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { useClientRides, useRealtimeDrivers } from "@/hooks/use-rides";
import { createRide, cancelRide, sendRideCodeWhatsApp } from "@/lib/rides";
import { addFavorite, removeFavorite } from "@/lib/favorites";
import { getCurrentLocationLabel, geocode, getRoute, type LngLat } from "@/lib/geo";
import { TIER_PRICING, computeFare } from "@/lib/pricing";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatKES, friendlyErrorMessage } from "@/lib/utils";
import type {
  Client,
  Driver,
  RideType,
  VehicleCategory,
  RideWithRelations,
} from "@/lib/types";

function LogoutMenu() {
  const router = useRouter();
  const { logout } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2/60 text-muted-foreground transition-colors hover:text-foreground"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border p-1.5"
          >
            <Link
              href="/client/favorites"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-2"
            >
              <Heart className="h-4 w-4 text-accent" />
              Favorite drivers
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuDrawer({
  open,
  onClose,
  clientName,
}: {
  open: boolean;
  onClose: () => void;
  clientName: string;
}) {
  const router = useRouter();
  const { logout } = useSession();

  const links = [
    { href: "/client", label: "Home", icon: Home },
    { href: "/events", label: "Events", icon: CalendarHeart },
    { href: "/client/wallet", label: "Inbox", icon: Route },
    { href: "/client/favorites", label: "Setup & favorites", icon: UserCircle },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            role="dialog"
            aria-label="Menu"
            className="glass fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] flex-col border-r border-border p-5"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={clientName} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {clientName}
                  </p>
                  <p className="text-xs text-muted-foreground">Client</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
                >
                  <l.icon className="h-5 w-5 text-accent" />
                  {l.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              Log out
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function NearbyDrivers({
  client,
  category,
}: {
  client: Client;
  category: VehicleCategory;
}) {
  const { toast } = useToast();
  const { drivers, loading, refetch } = useRealtimeDrivers(client.id, category);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleFavorite(driver: Driver, isFavorite: boolean) {
    setBusyId(driver.id);
    try {
      if (isFavorite) {
        await removeFavorite(client.id, driver.id);
        toast(`Removed ${driver.name} from favorites`, "info");
      } else {
        await addFavorite(client.id, driver.id);
        toast(`Added ${driver.name} to favorites`, "success");
      }
      await refetch();
    } catch (err) {
      toast("Could not update favorites", "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full" />
        ))}
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <EmptyState
        icon={CarFront}
        title="No drivers available"
        description="No drivers in this category are online right now. Try another vehicle type or check back soon."
      />
    );
  }

  return (
    <StaggerList className="space-y-2.5">
      {drivers.map(({ driver, isFavorite }) => (
        <DriverListItem
          key={driver.id}
          driver={driver}
          isFavorite={isFavorite}
          busy={busyId === driver.id}
          onToggleFavorite={() => toggleFavorite(driver, isFavorite)}
        />
      ))}
    </StaggerList>
  );
}

function YourRides({ client }: { client: Client }) {
  const { rides, loading, refetch } = useClientRides(client.id);
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCancel(rideId: string) {
    setBusyId(rideId);
    try {
      await cancelRide(rideId);
      toast("Ride cancelled", "info");
      await refetch();
    } catch (err) {
      toast("Could not cancel the ride", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleFavorite(driverId: string) {
    setBusyId(driverId);
    try {
      await addFavorite(client.id, driverId);
      toast("Driver added to favorites", "success");
    } catch (err) {
      toast("Could not add to favorites", "error");
    } finally {
      setBusyId(null);
    }
  }

  function paymentBlock(ride: RideWithRelations): React.ReactNode {
    if (ride.payment_status === "paid") {
      return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Paid · {formatKES(ride.budget)}
          </span>
          {ride.mpesa_receipt && (
            <span className="font-mono text-xs opacity-80">
              {ride.mpesa_receipt}
            </span>
          )}
        </div>
      );
    }
    if (ride.payment_status === "pending") {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
          <Smartphone className="h-4 w-4" />
          Enter your M-Pesa PIN on your phone to pay {formatKES(ride.budget)}.
        </div>
      );
    }
    if (ride.payment_status === "failed") {
      return (
        <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
          Payment didn&apos;t go through — your driver can request it again.
        </p>
      );
    }
    // unpaid, trip in progress — payment is requested by the driver on arrival
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2/40 px-3.5 py-2.5 text-xs text-muted-foreground">
        <Spinner className="h-4 w-4 text-accent" />
        Trip in progress — you&apos;ll get an M-Pesa prompt on arrival.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No rides yet"
        description="Your booked rides will show up here. Request one above to get started."
      />
    );
  }

  const activeRides = rides.filter(
    (r) =>
      r.status === "requested" ||
      r.status === "accepted" ||
      r.status === "in_progress"
  );
  const pastRides = rides.filter(
    (r) =>
      r.status !== "requested" &&
      r.status !== "accepted" &&
      r.status !== "in_progress"
  );

  return (
    <div className="space-y-3">
      {/* Active rides get the full tracker view */}
      {activeRides.map((ride) => (
        <ActiveRideTracker
          key={ride.id}
          ride={ride}
          cancelLoading={busyId === ride.id}
          onCancel={() => handleCancel(ride.id)}
        />
      ))}

      {/* Past rides show as compact cards */}
      {pastRides.length > 0 && (
        <StaggerList className="space-y-3">
          {pastRides.map((ride) => {
            const person = ride.driver
              ? {
                  name: ride.driver.name,
                  subtitle: `${ride.driver.vehicle_type} · ${ride.driver.plate_number}`,
                }
              : null;

            const canFavorite =
              ride.status === "completed" && !!ride.driver_id;

            let footer: React.ReactNode = null;
            if (ride.status === "completed") {
              footer = (
                <div className="space-y-3">
                  {paymentBlock(ride)}
                  {canFavorite && (
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      loading={busyId === ride.driver_id}
                      onClick={() => handleFavorite(ride.driver_id as string)}
                    >
                      <Heart className="h-4 w-4" />
                      Add driver to favorites
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <RideCard
                key={ride.id}
                ride={ride}
                person={person}
                footer={footer}
              />
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}

function ActiveRidesSection({ client }: { client: Client }) {
  const { rides, loading } = useClientRides(client.id);
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeRides = rides.filter(
    (r) =>
      r.status === "requested" ||
      r.status === "accepted" ||
      r.status === "in_progress"
  );

  async function handleCancel(rideId: string) {
    setBusyId(rideId);
    try {
      await cancelRide(rideId);
      toast("Ride cancelled", "info");
    } catch {
      toast("Could not cancel the ride", "error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || activeRides.length === 0) return null;

  return (
    <div className="mt-8 space-y-3">
      {activeRides.map((ride) => (
        <ActiveRideTracker
          key={ride.id}
          ride={ride}
          cancelLoading={busyId === ride.id}
          onCancel={() => handleCancel(ride.id)}
        />
      ))}
    </div>
  );
}

function ClientDashboard() {
  const { client } = useSession();
  const { toast } = useToast();
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleCategory>("standard");
  const [rideType, setRideType] = useState<RideType>("private");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [estimate, setEstimate] = useState<{
    distanceKm: number;
    durationMin: number;
  } | null>(null);
  const [estimating, setEstimating] = useState(false);

  // Live fare estimate: geocode pickup + destination, get the road route,
  // and derive distance/duration so per-tier fares are real, not hardcoded.
  useEffect(() => {
    const dest = destination.trim();
    if (!dest) {
      setEstimate(null);
      setEstimating(false);
      return;
    }
    let cancelled = false;
    setEstimating(true);
    const handle = setTimeout(async () => {
      try {
        const origin: LngLat = pickupCoords
          ? [pickupCoords.lng, pickupCoords.lat]
          : await geocode(pickup.trim() || "Nairobi");
        const target = await geocode(dest);
        const route = await getRoute(origin, target);
        if (!cancelled)
          setEstimate({
            distanceKm: route.distanceKm,
            durationMin: route.durationMin,
          });
      } catch {
        if (!cancelled) setEstimate(null);
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [pickup, destination, pickupCoords]);

  if (!client) return null;

  const VEHICLE_META: {
    category: VehicleCategory;
    name: string;
    seats: string;
    Icon: typeof Car;
  }[] = [
    { category: "standard", name: "Luxury Sedan", seats: "4 seats", Icon: Car },
    { category: "xl", name: "Premium SUV", seats: "6 seats", Icon: CarFront },
    { category: "premium", name: "Executive Van", seats: "8 seats", Icon: Bus },
  ];

  const vehicles = VEHICLE_META.map((v) => ({
    ...v,
    price: estimate
      ? computeFare(v.category, estimate.distanceKm, estimate.durationMin)
      : TIER_PRICING[v.category].min,
  }));

  const selected = vehicles.find((v) => v.category === selectedVehicle)!;

  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const { coords, label } = await getCurrentLocationLabel();
      setPickup(label);
      setPickupCoords(coords);
      toast("Current location set", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Could not get your location",
        "error"
      );
    } finally {
      setLocating(false);
    }
  }

  async function handleConfirm() {
    const trimmedDestination = destination.trim();
    const trimmedPickup = pickup.trim() || "Current Location";
    if (!trimmedDestination) {
      toast("Enter your destination", "warning");
      return;
    }
    if (trimmedDestination.length > 200 || trimmedPickup.length > 200) {
      toast("Location names must be under 200 characters", "warning");
      return;
    }
    const finalBudget = budget ? Number(budget) : selected.price;
    if (!Number.isFinite(finalBudget) || finalBudget <= 0 || finalBudget > 1_000_000) {
      toast("Enter a valid transport budget", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const ride = await createRide({
        client_id: client!.id,
        pickup: trimmedPickup,
        destination: trimmedDestination,
        scheduled_at:
          mode === "schedule" && scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        vehicle_category: selectedVehicle,
        ride_type: rideType,
        budget: finalBudget,
        event_id: null,
      });
      toast("Ride booked — finding you a driver", "success");

      // Send ride code to client's WhatsApp
      if (ride.verification_code && client!.phone) {
        sendRideCodeWhatsApp(
          client!.phone,
          ride.verification_code,
          trimmedPickup,
          trimmedDestination
        ).catch(() => {});
      }

      setDestination("");
      setScheduledAt("");
      setBudget("");
    } catch (err) {
      toast(friendlyErrorMessage(err, "Could not book your ride. Try again."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        clientName={client.name}
      />

      {/* Top bar */}
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-bold uppercase tracking-[0.15em]">
          TripNest
        </span>
        <Avatar name={client.name} size={36} />
      </div>

      {/* Ride Now / Schedule tabs */}
      <div className="mb-5 flex gap-2">
        {(["now", "schedule"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-2xl py-3 text-sm font-semibold transition-all",
              mode === m
                ? "bg-accent text-background shadow-glow"
                : "bg-surface-2 text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "now" ? "Ride Now" : "Schedule"}
          </button>
        ))}
      </div>

      {/* Location fields */}
      <div className="card mb-5 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center">
              <span className="h-3 w-3 rounded-full border-2 border-muted-foreground" />
            </span>
            <input
              value={pickup}
              onChange={(e) => {
                setPickup(e.target.value);
                setPickupCoords(null);
              }}
              placeholder="Current Location"
              maxLength={200}
              className="input-transparent w-full bg-transparent text-[15px] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              aria-label="Use my current location"
              title="Use my current location"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
            >
              {locating ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-3 pt-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center">
              <Navigation className="h-4 w-4 text-accent" />
            </span>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Where to?"
              maxLength={200}
              className="input-transparent w-full bg-transparent text-[15px] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Ride type */}
      <div className="mb-5">
        <h4 className="mb-2 text-sm font-medium text-foreground">Ride type</h4>
        <div className="flex gap-2">
          {([
            { value: "private" as RideType, label: "Private", icon: Car },
            { value: "cost_sharing" as RideType, label: "Cost sharing", icon: Users2 },
          ]).map((opt) => {
            const active = rideType === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setRideType(opt.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition-all",
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface-2/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transport budget — only visible for cost sharing */}
      {rideType === "cost_sharing" && (
        <div className="mb-5">
          <h4 className="mb-2 text-sm font-medium text-foreground">
            Transport budget (KES)
          </h4>
          <div className="card flex items-center gap-3 overflow-hidden p-0 px-4">
            <Wallet className="h-4 w-4 shrink-0 text-accent" />
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={1000000}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={`e.g. ${selected.price.toLocaleString()}`}
              className="input-transparent w-full bg-transparent py-3.5 text-[15px] focus:outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter your share of the ride cost
          </p>
        </div>
      )}

      {/* Nearby drivers */}
      <div className="mb-5">
        <NearbyDrivers client={client} category={selectedVehicle} />
      </div>

      {/* Schedule date/time */}
      {mode === "schedule" && (
        <FadeIn>
          <div className="card mb-5 p-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Date & time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-[15px] text-slate-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-ring/60"
            />
          </div>
        </FadeIn>
      )}

      {/* Choose a ride */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-foreground">
          Choose a ride
        </h3>
        {estimating ? (
          <span className="text-xs text-muted-foreground">Estimating…</span>
        ) : estimate ? (
          <span className="text-xs text-muted-foreground">
            ~{estimate.distanceKm.toFixed(1)} km · {Math.round(estimate.durationMin)} min
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Add destination for a fare
          </span>
        )}
      </div>
      <div className="mb-6 space-y-3">
        {vehicles.map((v) => {
          const active = selectedVehicle === v.category;
          return (
            <button
              key={v.category}
              onClick={() => setSelectedVehicle(v.category)}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-accent bg-accent/10"
                  : "border-border bg-surface-2/40 hover:bg-surface-2"
              )}
            >
              <span
                className={cn(
                  "grid h-12 w-12 shrink-0 place-items-center rounded-xl",
                  active ? "bg-accent/20" : "bg-surface-2"
                )}
              >
                <v.Icon
                  className={cn(
                    "h-6 w-6",
                    active ? "text-accent" : "text-muted-foreground"
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{v.name}</p>
                <p className="text-xs text-muted-foreground">
                  {v.seats}
                  {estimate ? ` · ${estimate.distanceKm.toFixed(1)} km` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-foreground">
                  {formatKES(v.price)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {estimate ? "estimated" : "from"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <Button size="lg" fullWidth loading={submitting} onClick={handleConfirm}>
        {submitting ? "Booking…" : "Confirm Booking"}
      </Button>

      {/* Active ride tracker — only shows rides in progress */}
      <ActiveRidesSection client={client} />
    </AppShell>
  );
}

export default function ClientPage() {
  return (
    <RequireRole role="client">
      <ClientDashboard />
    </RequireRole>
  );
}
