"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  CreditCard,
  Clock,
  HelpCircle,
  LogOut,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Phone,
  Mail,
  Save,
  Smartphone,
  CheckCircle2,
  MessageCircle,
  Car,
  MapPin,
  Hash,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { CategoryBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { FadeIn } from "@/components/motion/motion";
import { RequireRole } from "@/components/auth/require-role";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { AvailabilityCard } from "@/components/driver/availability-card";
import { BecomeRiderModal } from "@/components/driver/become-rider-modal";
import { fetchDriverRides } from "@/lib/rides";
import { patchDocument, queryDocuments, collections, docs, where } from "@/lib/db";
import { cn, formatKES, formatDateTime, friendlyErrorMessage } from "@/lib/utils";
import { VEHICLE_CATEGORIES } from "@/lib/types";
import type { Driver, RideWithRelations, VehicleCategory } from "@/lib/types";

type Panel = null | "personal" | "payment" | "history" | "help";

function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <button
        onClick={onBack}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
    </div>
  );
}

/* ── Personal / Vehicle information ────────────────────── */

function PersonalInfoPanel({
  driver,
  onBack,
}: {
  driver: Driver;
  onBack: () => void;
}) {
  const { refreshDriver } = useSession();
  const { toast } = useToast();
  const [name, setName] = useState(driver.name);
  const [phone, setPhone] = useState(driver.phone ?? "");
  const [vehicleType, setVehicleType] = useState(driver.vehicle_type);
  const [plate, setPlate] = useState(driver.plate_number);
  const [current, setCurrent] = useState(driver.current_location ?? "");
  const [frequent, setFrequent] = useState(driver.frequent_location ?? "");
  const [category, setCategory] = useState<VehicleCategory>(
    driver.vehicle_category
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast("Name is required", "warning");
      return;
    }
    if (!vehicleType.trim() || !plate.trim()) {
      toast("Vehicle type and plate number are required", "warning");
      return;
    }
    setSaving(true);
    try {
      await patchDocument(docs.driver(driver.id), {
        name: name.trim(),
        phone: phone.trim(),
        vehicleType: vehicleType.trim(),
        plateNumber: plate.trim(),
        currentLocation: current.trim() || null,
        frequentLocation: frequent.trim() || null,
        vehicleCategory: category,
      });
      await refreshDriver();
      toast("Profile updated", "success");
    } catch (err) {
      toast(friendlyErrorMessage(err, "Could not update profile"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PanelHeader title="Personal & Vehicle" onBack={onBack} />
      <div className="space-y-4">
        <Field label="Full name" htmlFor="dp_name" required>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dp_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="pl-10"
              autoComplete="name"
            />
          </div>
        </Field>

        <Field label="Phone number" htmlFor="dp_phone" hint="Riders reach you here">
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dp_phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              maxLength={20}
              className="pl-10"
              autoComplete="tel"
            />
          </div>
        </Field>

        <Field label="Vehicle type" htmlFor="dp_vehicle" required hint="Make and model">
          <div className="relative">
            <Car className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dp_vehicle"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              placeholder="e.g. Toyota Noah"
              maxLength={60}
              className="pl-10"
            />
          </div>
        </Field>

        <Field label="Car plate number" htmlFor="dp_plate" required>
          <div className="relative">
            <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dp_plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="e.g. KDA 123A"
              autoCapitalize="characters"
              maxLength={20}
              className="pl-10"
            />
          </div>
        </Field>

        <Field label="Current location" htmlFor="dp_current">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dp_current"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="e.g. Westlands, Nairobi"
              maxLength={200}
              className="pl-10"
            />
          </div>
        </Field>

        <Field
          label="Frequent operating location"
          htmlFor="dp_frequent"
          hint="Where you usually pick up riders"
        >
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dp_frequent"
              value={frequent}
              onChange={(e) => setFrequent(e.target.value)}
              placeholder="e.g. CBD / JKIA"
              maxLength={200}
              className="pl-10"
            />
          </div>
        </Field>

        <Field label="Vehicle category" required>
          <Segmented
            name="dp_category"
            columns={3}
            value={category}
            onChange={setCategory}
            options={VEHICLE_CATEGORIES}
          />
        </Field>

        <Button size="lg" fullWidth loading={saving} onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </>
  );
}

/* ── Payout method ────────────────────────────────────── */

function PayoutPanel({ driver, onBack }: { driver: Driver; onBack: () => void }) {
  return (
    <>
      <PanelHeader title="Payout Method" onBack={onBack} />
      <div className="space-y-3">
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#4CAF50]/20">
              <Smartphone className="h-5 w-5 text-[#4CAF50]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">M-Pesa</p>
                <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                  Active
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {driver.phone || "No phone linked"}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Fares are paid straight to this M-Pesa number when a rider completes
            payment at the destination. Keep it up to date in Personal & Vehicle.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-2/40 p-4 opacity-60">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">Bank transfer</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Weekly settlements to your bank account
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Trip history ─────────────────────────────────────── */

function TripHistoryPanel({
  driver,
  onBack,
}: {
  driver: Driver;
  onBack: () => void;
}) {
  const [rides, setRides] = useState<RideWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverRides(driver.id)
      .then((data) => setRides(data))
      .catch(() => setRides([]))
      .finally(() => setLoading(false));
  }, [driver.id]);

  const statusColor: Record<string, string> = {
    completed: "text-success",
    cancelled: "text-destructive",
    rejected: "text-destructive",
    requested: "text-warning",
    accepted: "text-accent",
    in_progress: "text-accent",
  };

  return (
    <>
      <PanelHeader title="Trip History" onBack={onBack} />
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="py-10 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No trips yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rides.map((ride) => (
            <div
              key={ride.id}
              className="rounded-2xl border border-border bg-surface-2/40 p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(ride.created_at)}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold capitalize",
                    statusColor[ride.status] ?? "text-muted-foreground"
                  )}
                >
                  {ride.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2">
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="h-6 w-px bg-border" />
                  <span className="h-2 w-2 rounded-full bg-accent" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm text-foreground">{ride.pickup}</p>
                  <p className="truncate text-sm text-foreground">
                    {ride.destination}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {ride.client?.name ?? "Rider"} ·{" "}
                  {ride.vehicle_category.toUpperCase()}
                </span>
                <span className="font-semibold text-foreground">
                  {formatKES(ride.budget)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Help & Support ───────────────────────────────────── */

function HelpPanel({ onBack }: { onBack: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I start receiving requests?",
      a: "Toggle availability to online on your dashboard (or here on your profile). Ride requests near you appear in real time while you're online.",
    },
    {
      q: "How does a trip start?",
      a: "When you accept a ride, the rider gets a 4-digit code. At pickup, ask them to read it out and enter it on the trip card to start the trip.",
    },
    {
      q: "When do I get paid?",
      a: "At the destination you confirm arrival, which sends an M-Pesa STK push to the rider. Once they pay, the fare goes to your linked M-Pesa number.",
    },
    {
      q: "How do I switch to booking rides myself?",
      a: "Use ‘Get a ride’ on your profile. If you already have a rider account you'll switch straight over; otherwise you can set one up in a few seconds.",
    },
    {
      q: "How do I update my vehicle details?",
      a: "Open ‘Personal & Vehicle’ from your profile to change your car, plate number, locations, and category.",
    },
  ];

  return (
    <>
      <PanelHeader title="Help & Support" onBack={onBack} />
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Contact us</p>
          <div className="space-y-2.5">
            <a
              href="mailto:support@tripnest.co.ke"
              className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="h-4 w-4 text-accent" />
              support@tripnest.co.ke
            </a>
            <a
              href="tel:+254700000000"
              className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Phone className="h-4 w-4 text-accent" />
              +254 700 000 000
            </a>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4 text-accent" />
              WhatsApp support available 8AM - 10PM
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground">
            Frequently asked questions
          </p>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
                >
                  {faq.q}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      openFaq === i && "rotate-180"
                    )}
                  />
                </button>
                {openFaq === i && (
                  <div className="border-t border-border bg-surface-2/40 px-4 py-3 text-sm text-muted-foreground">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50">
          TripNest v0.2.0 · Prototype
        </p>
      </div>
    </>
  );
}

/* ── Profile stats ────────────────────────────────────── */

function ProfileStats({ driver }: { driver: Driver }) {
  const [tripCount, setTripCount] = useState(0);
  const joinedYear = new Date(driver.created_at).getFullYear();

  useEffect(() => {
    queryDocuments(collections.rides(), where("driverId", "==", driver.id), where("status", "==", "completed"))
      .then((rides) => setTripCount(rides.length))
      .catch(() => {});
  }, [driver.id]);

  return (
    <div className="mt-5 grid grid-cols-3 gap-2">
      {[
        { value: String(tripCount), label: "TRIPS" },
        { value: "4.9 ★", label: "RATING" },
        { value: String(joinedYear), label: "JOINED" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center rounded-2xl border border-border bg-surface-2/40 py-3"
        >
          <span className="font-display text-lg font-bold text-foreground">
            {stat.value}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Menu ─────────────────────────────────────────────── */

const MENU_ITEMS: { icon: typeof User; label: string; panel: Panel }[] = [
  { icon: User, label: "Personal & Vehicle", panel: "personal" },
  { icon: CreditCard, label: "Payout Method", panel: "payment" },
  { icon: Clock, label: "Trip History", panel: "history" },
  { icon: HelpCircle, label: "Help & Support", panel: "help" },
];

/* ── Main profile screen ──────────────────────────────── */

function ProfileScreen({ driver }: { driver: Driver }) {
  const router = useRouter();
  const { client, logout, setRolePreference } = useSession();
  const [panel, setPanel] = useState<Panel>(null);
  const [showGetRide, setShowGetRide] = useState(false);

  if (panel === "personal")
    return (
      <AppShell>
        <PersonalInfoPanel driver={driver} onBack={() => setPanel(null)} />
      </AppShell>
    );
  if (panel === "payment")
    return (
      <AppShell>
        <PayoutPanel driver={driver} onBack={() => setPanel(null)} />
      </AppShell>
    );
  if (panel === "history")
    return (
      <AppShell>
        <TripHistoryPanel driver={driver} onBack={() => setPanel(null)} />
      </AppShell>
    );
  if (panel === "help")
    return (
      <AppShell>
        <HelpPanel onBack={() => setPanel(null)} />
      </AppShell>
    );

  function handleRideCta() {
    if (client) {
      setRolePreference("client");
      router.push("/client");
    } else {
      setShowGetRide(true);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <AppShell>
      <FadeIn>
        {/* Header */}
        <div className="flex flex-col items-center pt-2">
          <div className="relative">
            <Avatar name={driver.name} size={80} />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-3">
              <CategoryBadge category={driver.vehicle_category} />
            </span>
          </div>
          <h1 className="mt-6 font-display text-xl font-bold text-foreground">
            {driver.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {driver.vehicle_type} · {driver.plate_number}
          </p>
        </div>

        {/* Stats */}
        <ProfileStats driver={driver} />

        {/* Availability toggle */}
        <div className="mt-6">
          <AvailabilityCard driver={driver} />
        </div>

        {/* Menu */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          {MENU_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={cn(
                  "flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-surface-2",
                  i < MENU_ITEMS.length - 1 && "border-b border-border"
                )}
                onClick={() => setPanel(item.panel)}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2">
                  <Icon className="h-[18px] w-[18px] text-accent" />
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Get a ride / switch to rider mode */}
        <button
          onClick={handleRideCta}
          className="mt-4 flex w-full items-center gap-3.5 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-4 text-left transition-colors hover:bg-accent/10"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/20">
            <Car className="h-[18px] w-[18px] text-accent" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              Get a ride
            </span>
            <span className="block text-xs text-muted-foreground">
              {client
                ? "Switch back to rider mode and book a ride."
                : "Set up rider mode so you can book rides too."}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {/* Log out */}
        <button
          onClick={handleLogout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2/40 py-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </FadeIn>

      {showGetRide && (
        <BecomeRiderModal driver={driver} onClose={() => setShowGetRide(false)} />
      )}
    </AppShell>
  );
}

export default function DriverProfilePage() {
  const { driver } = useSession();
  return (
    <RequireRole role="driver">
      {driver && <ProfileScreen driver={driver} />}
    </RequireRole>
  );
}
