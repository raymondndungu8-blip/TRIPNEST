"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Heart,
  User,
  CreditCard,
  Clock,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Phone,
  Mail,
  Save,
  Smartphone,
  CreditCard as CardIcon,
  CheckCircle2,
  MessageCircle,
  ChevronDown,
  Car,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { AvatarCropper } from "@/components/ui/avatar-cropper";
import { CategoryBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { StaggerList, FadeIn, fadeUp } from "@/components/motion/motion";
import { RequireRole } from "@/components/auth/require-role";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { fetchFavoriteDrivers, removeFavorite } from "@/lib/favorites";
import { fetchClientRides } from "@/lib/rides";
import { uploadAvatar, updateClientAvatar } from "@/lib/storage";
import { getDocument, setDocument, patchDocument, queryDocuments, collections, docs, where, Timestamp } from "@/lib/db";
import { cn, formatKES, formatDateTime, friendlyErrorMessage } from "@/lib/utils";
import { VEHICLE_CATEGORIES } from "@/lib/types";
import type {
  Client,
  Driver,
  RideWithRelations,
  VehicleCategory,
} from "@/lib/types";

type Panel =
  | null
  | "personal"
  | "payment"
  | "history"
  | "safety"
  | "help"
  | "become_driver";

function PanelHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <button
        onClick={onBack}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h2 className="font-display text-lg font-bold text-foreground">
        {title}
      </h2>
    </div>
  );
}

/* ── Personal Information ─────────────────────────────── */

function PersonalInfoPanel({
  client,
  onBack,
}: {
  client: Client;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast("Name is required", "warning");
      return;
    }
    setSaving(true);
    try {
      await patchDocument(docs.client(client.id), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      toast("Profile updated", "success");
    } catch {
      toast("Could not update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PanelHeader title="Personal Information" onBack={onBack} />
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Full name
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4">
            <User className="h-4 w-4 shrink-0 text-accent" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-transparent w-full bg-transparent py-3 text-[15px] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4">
            <Mail className="h-4 w-4 shrink-0 text-accent" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-transparent w-full bg-transparent py-3 text-[15px] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Phone number
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4">
            <Phone className="h-4 w-4 shrink-0 text-accent" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="input-transparent w-full bg-transparent py-3 text-[15px] focus:outline-none"
            />
          </div>
        </div>
        <Button size="lg" fullWidth loading={saving} onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </>
  );
}

/* ── Payment Methods ──────────────────────────────────── */

function PaymentPanel({
  client,
  onBack,
}: {
  client: Client;
  onBack: () => void;
}) {
  return (
    <>
      <PanelHeader title="Payment Methods" onBack={onBack} />
      <div className="space-y-3">
        {/* M-Pesa */}
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
                {client.phone || "No phone linked"}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            M-Pesa STK push will be sent to your phone when the driver confirms
            arrival at your destination.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4 opacity-60">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2">
              <CardIcon className="h-5 w-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">
                  Credit / Debit Card
                </p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Visa, Mastercard, and more
              </p>
            </div>
          </div>
        </div>

        {/* PayPal */}
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4 opacity-60">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M7.02 21.5 8 16.5h2.5c4.5 0 7.5-2.5 8.2-6.5.7-4-1.7-6-5.7-6H7.5c-.5 0-1 .4-1.1.9L4 21.1c-.1.3.2.4.4.4h2.6Z" fill="#7a8ba3"/>
                <path d="M9 13.5l.7-4h2.3c2.5 0 4.2-1.2 4.7-3.5.5-2.3-1-3.5-3.2-3.5H9.2l-2 11h1.8Z" fill="#5a6b83"/>
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">PayPal</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                  Coming Soon
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pay with your PayPal account
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Ride History ─────────────────────────────────────── */

function RideHistoryPanel({
  client,
  onBack,
}: {
  client: Client;
  onBack: () => void;
}) {
  const [rides, setRides] = useState<RideWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientRides(client.id).then((data) => {
      setRides(data);
      setLoading(false);
    });
  }, [client.id]);

  const statusColor: Record<string, string> = {
    completed: "text-success",
    cancelled: "text-destructive",
    requested: "text-warning",
    accepted: "text-accent",
    in_progress: "text-accent",
  };

  return (
    <>
      <PanelHeader title="Ride History" onBack={onBack} />
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <div className="py-10 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No rides yet</p>
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
                  <p className="truncate text-sm text-foreground">
                    {ride.pickup}
                  </p>
                  <p className="truncate text-sm text-foreground">
                    {ride.destination}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {ride.driver?.name ?? "No driver"} ·{" "}
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

/* ── Safety Settings ──────────────────────────────────── */

function SafetyPanel({
  client,
  onBack,
}: {
  client: Client;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [emergency, setEmergency] = useState(client.emergency_contact ?? "");
  const [shareRides, setShareRides] = useState(client.share_rides ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await patchDocument(docs.client(client.id), {
        emergencyContact: emergency.trim() || null,
        shareRides: shareRides,
      });
      toast("Safety settings updated", "success");
    } catch {
      toast("Could not save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PanelHeader title="Safety Settings" onBack={onBack} />
      <div className="space-y-5">
        {/* Emergency contact */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Emergency contact
          </label>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4">
            <Phone className="h-4 w-4 shrink-0 text-destructive" />
            <input
              type="tel"
              value={emergency}
              onChange={(e) => setEmergency(e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="input-transparent w-full bg-transparent py-3 text-[15px] focus:outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            This number will be contacted in case of an emergency during your
            ride.
          </p>
        </div>

        {/* Share ride details */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              Share ride details
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Automatically share your ride status and route with your emergency
              contact.
            </p>
          </div>
          <button
            onClick={() => setShareRides(!shareRides)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              shareRides ? "bg-accent" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                shareRides ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
        </div>

        {/* Safety tips */}
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
          <div className="flex items-center gap-2 text-accent">
            <Shield className="h-4 w-4" />
            <p className="text-sm font-semibold">Safety tips</p>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <li>• Always verify your driver&apos;s identity and plate number</li>
            <li>• Share your ride code only with your assigned driver</li>
            <li>• Keep your emergency contact updated</li>
            <li>• Use the in-app chat to coordinate pickup details</li>
          </ul>
        </div>

        <Button size="lg" fullWidth loading={saving} onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </>
  );
}

/* ── Help & Support ───────────────────────────────────── */

function HelpPanel({ onBack }: { onBack: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I book a ride?",
      a: "Go to the Home tab, enter your destination in the 'Where to?' field, choose a vehicle type, and tap 'Confirm Booking'. A nearby driver will be assigned to you.",
    },
    {
      q: "How does payment work?",
      a: "When your driver confirms arrival at the destination, an M-Pesa STK push is sent to your phone. Enter your PIN to complete the payment.",
    },
    {
      q: "What is the ride verification code?",
      a: "When you book a ride, you receive a 4-digit code. Share it with your driver at pickup — they enter it to start the trip. This ensures you're getting into the right car.",
    },
    {
      q: "How do I add a favorite driver?",
      a: "After completing a ride, tap the heart icon on the ride card to save that driver to your favorites. They'll appear first in your driver list next time.",
    },
    {
      q: "Can I cancel a ride?",
      a: "Yes, you can cancel a ride anytime before the driver starts the trip. Go to your rides list and tap 'Cancel ride'.",
    },
    {
      q: "How does cost sharing work?",
      a: "Select 'Cost sharing' as your ride type when booking. You set your transport budget, and TripNest matches you with other riders going the same way.",
    },
  ];

  return (
    <>
      <PanelHeader title="Help & Support" onBack={onBack} />
      <div className="space-y-5">
        {/* Contact */}
        <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Contact us
          </p>
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

        {/* FAQ */}
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

        {/* App version */}
        <p className="text-center text-xs text-muted-foreground/50">
          TripNest v0.2.0 · Prototype
        </p>
      </div>
    </>
  );
}

/* ── Become a Driver ──────────────────────────────────── */

interface DriverForm {
  name: string;
  vehicle_type: string;
  plate_number: string;
  current_location: string;
  frequent_location: string;
  vehicle_category: VehicleCategory;
}

function BecomeDriverPanel({
  client,
  onBack,
}: {
  client: Client;
  onBack: () => void;
}) {
  const router = useRouter();
  const { user, setDriver } = useSession();
  const { toast } = useToast();

  const [form, setForm] = useState<DriverForm>({
    name: client.name,
    vehicle_type: "",
    plate_number: "",
    current_location: "",
    frequent_location: "",
    vehicle_category: "standard",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof DriverForm, string>>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof DriverForm>(key: K, value: DriverForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof DriverForm, string>> = {};
    if (!form.name.trim()) next.name = "Your name is required";
    else if (form.name.trim().length > 100) next.name = "Too long (max 100)";
    if (!form.vehicle_type.trim())
      next.vehicle_type = "Vehicle type is required";
    else if (form.vehicle_type.trim().length > 60)
      next.vehicle_type = "Too long (max 60)";
    if (!form.plate_number.trim())
      next.plate_number = "Car plate number is required";
    else if (form.plate_number.trim().length > 20)
      next.plate_number = "Too long (max 20)";
    if (!form.current_location.trim())
      next.current_location = "Current location is required";
    else if (form.current_location.trim().length > 200)
      next.current_location = "Too long (max 200)";
    if (!form.frequent_location.trim())
      next.frequent_location = "Frequent location is required";
    else if (form.frequent_location.trim().length > 200)
      next.frequent_location = "Too long (max 200)";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !user) return;
    setSubmitting(true);
    try {
      await setDocument(docs.driver(user.uid), {
        userId: user.uid,
        name: form.name.trim(),
        phone: client.phone ?? "",
        vehicleType: form.vehicle_type.trim(),
        plateNumber: form.plate_number.trim(),
        currentLocation: form.current_location.trim(),
        frequentLocation: form.frequent_location.trim(),
        vehicleCategory: form.vehicle_category,
        isAvailable: false,
        createdAt: Timestamp.now(),
      });
      const data = await getDocument<Driver>(docs.driver(user.uid));
      if (!data) throw new Error("Could not create driver profile");
      setDriver(data);
      toast("You're now a TripNest driver!", "success");
      router.push("/driver");
    } catch (err) {
      console.error("[become driver] failed", err);
      toast(
        friendlyErrorMessage(
          err,
          "Could not set up your driver profile. Please try again."
        ),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PanelHeader title="Become a Driver" onBack={onBack} />

      <div className="mb-5 rounded-2xl border border-accent/25 bg-accent/5 p-4">
        <div className="flex items-center gap-2 text-accent">
          <Wallet className="h-4 w-4" />
          <p className="text-sm font-semibold">Earn with your car</p>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Keep your rider account and start accepting ride requests to make extra
          income. You can switch between rider and driver mode anytime.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Full name" htmlFor="d_name" required error={errors.name}>
          <Input
            id="d_name"
            autoComplete="name"
            value={form.name}
            invalid={!!errors.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </Field>

        <Field
          label="Vehicle type"
          htmlFor="d_vehicle_type"
          required
          error={errors.vehicle_type}
          hint="Make and model of your car"
        >
          <Input
            id="d_vehicle_type"
            placeholder="e.g. Toyota Noah"
            value={form.vehicle_type}
            invalid={!!errors.vehicle_type}
            onChange={(e) => update("vehicle_type", e.target.value)}
          />
        </Field>

        <Field
          label="Car plate number"
          htmlFor="d_plate_number"
          required
          error={errors.plate_number}
        >
          <Input
            id="d_plate_number"
            autoCapitalize="characters"
            placeholder="e.g. KDA 123A"
            value={form.plate_number}
            invalid={!!errors.plate_number}
            onChange={(e) => update("plate_number", e.target.value)}
          />
        </Field>

        <Field
          label="Current location"
          htmlFor="d_current_location"
          required
          error={errors.current_location}
        >
          <Input
            id="d_current_location"
            placeholder="e.g. Westlands, Nairobi"
            value={form.current_location}
            invalid={!!errors.current_location}
            onChange={(e) => update("current_location", e.target.value)}
          />
        </Field>

        <Field
          label="Frequent operating location"
          htmlFor="d_frequent_location"
          required
          error={errors.frequent_location}
          hint="Where you usually pick up riders"
        >
          <Input
            id="d_frequent_location"
            placeholder="e.g. CBD / JKIA"
            value={form.frequent_location}
            invalid={!!errors.frequent_location}
            onChange={(e) => update("frequent_location", e.target.value)}
          />
        </Field>

        <Field label="Vehicle category" required>
          <Segmented
            name="d_vehicle_category"
            columns={3}
            value={form.vehicle_category}
            onChange={(v) => update("vehicle_category", v)}
            options={VEHICLE_CATEGORIES}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          className="mt-2"
        >
          <Car className="h-5 w-5" />
          Create driver profile
        </Button>
      </form>
    </>
  );
}

/* ── Profile Stats ────────────────────────────────────── */

function ProfileStats({ client }: { client: Client }) {
  const [tripCount, setTripCount] = useState(0);
  const joinedYear = new Date(client.created_at).getFullYear();

  useEffect(() => {
    queryDocuments(collections.rides(), where("clientId", "==", client.id), where("status", "==", "completed"))
      .then((rides) => setTripCount(rides.length))
      .catch(() => {});
  }, [client.id]);

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

/* ── Favorite Drivers ─────────────────────────────────── */

function FavoriteDriversList({ client }: { client: Client }) {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchFavoriteDrivers(client.id);
      setDrivers(data);
    } catch {
      toast("Could not load your favorites", "error");
    } finally {
      setLoading(false);
    }
  }, [client.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemove(driver: Driver) {
    try {
      await removeFavorite(client.id, driver.id);
      setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
      toast(`Removed ${driver.name}`, "info");
    } catch {
      toast("Could not remove favorite", "error");
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[68px] w-full" />
        ))}
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No favorite drivers yet. Tap the heart on a driver to save them.
      </p>
    );
  }

  return (
    <StaggerList className="space-y-2">
      {drivers.map((driver) => (
        <motion.div
          key={driver.id}
          variants={fadeUp}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-3"
        >
          <Avatar name={driver.name} size={42} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {driver.name}
              </p>
              <CategoryBadge category={driver.vehicle_category} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {driver.vehicle_type} · {driver.plate_number}
            </p>
          </div>
          <button
            onClick={() => handleRemove(driver)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
            aria-label={`Remove ${driver.name}`}
          >
            <Heart className="h-4 w-4 fill-current" />
          </button>
        </motion.div>
      ))}
    </StaggerList>
  );
}

/* ── Menu Items ───────────────────────────────────────── */

const MENU_ITEMS: {
  icon: typeof User;
  label: string;
  panel: Panel;
}[] = [
  { icon: User, label: "Personal Information", panel: "personal" },
  { icon: CreditCard, label: "Payment Methods", panel: "payment" },
  { icon: Clock, label: "Ride History", panel: "history" },
  { icon: Shield, label: "Safety Settings", panel: "safety" },
  { icon: HelpCircle, label: "Help & Support", panel: "help" },
];

/* ── Main Setup Screen ────────────────────────────────── */

function SetupScreen() {
  const router = useRouter();
  const { client, driver, logout, setRolePreference } = useSession();
  const { toast } = useToast();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    if (client?.avatar_url) setAvatarUrl(client.avatar_url);
  }, [client]);

  if (!client) return null;

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast("Image must be under 8 MB", "warning");
      return;
    }
    // Open the cropper instead of uploading immediately
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    setUploading(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const url = await uploadAvatar(client!.id, file);
      await updateClientAvatar(client!.id, url);
      setAvatarUrl(url);
      toast("Photo updated!", "success");
    } catch {
      toast("Could not upload photo", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  // Render active panel
  if (panel === "personal")
    return (
      <AppShell>
        <PersonalInfoPanel client={client} onBack={() => setPanel(null)} />
      </AppShell>
    );
  if (panel === "payment")
    return (
      <AppShell>
        <PaymentPanel client={client} onBack={() => setPanel(null)} />
      </AppShell>
    );
  if (panel === "history")
    return (
      <AppShell>
        <RideHistoryPanel client={client} onBack={() => setPanel(null)} />
      </AppShell>
    );
  if (panel === "safety")
    return (
      <AppShell>
        <SafetyPanel client={client} onBack={() => setPanel(null)} />
      </AppShell>
    );
  if (panel === "help")
    return (
      <AppShell>
        <HelpPanel onBack={() => setPanel(null)} />
      </AppShell>
    );
  if (panel === "become_driver")
    return (
      <AppShell>
        <BecomeDriverPanel client={client} onBack={() => setPanel(null)} />
      </AppShell>
    );

  function handleDriverCta() {
    if (driver) {
      setRolePreference("driver");
      router.push("/driver");
    } else {
      setPanel("become_driver");
    }
  }

  return (
    <AppShell>
      <FadeIn>
        {/* Profile header with photo upload */}
        <div className="flex flex-col items-center pt-2">
          <div className="relative">
            <Avatar
              name={client.name}
              src={avatarUrl}
              size={80}
            />
            {/* Gallery picker — no capture attr, opens photo library */}
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {/* Camera capture — opens device camera directly */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => setShowPhotoMenu(true)}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-accent text-background transition-colors hover:bg-accent/80 disabled:opacity-50"
              aria-label="Change photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-3 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">
              Premium
            </span>
          </div>

          {/* Photo source choice sheet */}
          {showPhotoMenu && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
              onClick={() => setShowPhotoMenu(false)}
            >
              <div
                className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
                <p className="mb-3 text-center text-sm font-semibold text-foreground">
                  Update profile photo
                </p>
                <button
                  onClick={() => {
                    setShowPhotoMenu(false);
                    cameraRef.current?.click();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2">
                    <Camera className="h-5 w-5 text-accent" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    Take a photo
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowPhotoMenu(false);
                    galleryRef.current?.click();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2">
                    <ImageIcon className="h-5 w-5 text-accent" />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    Choose from gallery
                  </span>
                </button>
                <button
                  onClick={() => setShowPhotoMenu(false)}
                  className="mt-2 w-full rounded-xl py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <h1 className="mt-6 font-display text-xl font-bold text-foreground">
            {client.name}
          </h1>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>

        {/* Stats */}
        <ProfileStats client={client} />

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

        {/* Become a driver / switch to driver mode */}
        <button
          onClick={handleDriverCta}
          className="mt-4 flex w-full items-center gap-3.5 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-4 text-left transition-colors hover:bg-accent/10"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/20">
            <Car className="h-[18px] w-[18px] text-accent" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              {driver ? "Switch to driver mode" : "Become a driver"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {driver
                ? "Go to your driver dashboard and start accepting rides."
                : "Drive with TripNest and earn extra income on your schedule."}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {/* Favorite drivers */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
              Favorite Drivers
            </h3>
          </div>
          <FavoriteDriversList client={client} />
        </div>

        {/* Log out */}
        <button
          onClick={handleLogout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2/40 py-3.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </FadeIn>

      {/* Crop modal — pan & zoom to frame your face before saving */}
      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onCancel={() => setCropSrc(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </AppShell>
  );
}

export default function ClientFavoritesPage() {
  return (
    <RequireRole role="client">
      <SetupScreen />
    </RequireRole>
  );
}
