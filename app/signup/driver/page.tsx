"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, ShieldCheck } from "lucide-react";
import { getDocument, setDocument, docs, Timestamp } from "@/lib/db";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { FadeIn } from "@/components/motion/motion";
import { FullPageSpinner } from "@/components/ui/spinner";
import { PhoneOtp } from "@/components/auth/phone-otp";
import { friendlyErrorMessage } from "@/lib/utils";
import { VEHICLE_CATEGORIES } from "@/lib/types";
import type { Driver, VehicleCategory } from "@/lib/types";

interface FormState {
  name: string;
  vehicle_type: string;
  plate_number: string;
  current_location: string;
  frequent_location: string;
  vehicle_category: VehicleCategory;
}

type Errors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = {
  name: "",
  vehicle_type: "",
  plate_number: "",
  current_location: "",
  frequent_location: "",
  vehicle_category: "standard",
};

export default function DriverSignupPage() {
  const router = useRouter();
  const { user, driver, setDriver, loading, setRolePreference } = useSession();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRolePreference("driver");
  }, [setRolePreference]);

  useEffect(() => {
    if (!loading && driver) router.replace("/driver");
  }, [loading, driver, router]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Your name is required";
    else if (form.name.trim().length > 100) next.name = "Name is too long (max 100 characters)";
    if (!form.vehicle_type.trim()) next.vehicle_type = "Vehicle type is required";
    else if (form.vehicle_type.trim().length > 60)
      next.vehicle_type = "Too long (max 60 characters)";
    if (!form.plate_number.trim())
      next.plate_number = "Car plate number is required";
    else if (form.plate_number.trim().length > 20)
      next.plate_number = "Too long (max 20 characters)";
    if (!form.current_location.trim())
      next.current_location = "Current location is required";
    else if (form.current_location.trim().length > 200)
      next.current_location = "Too long (max 200 characters)";
    if (!form.frequent_location.trim())
      next.frequent_location = "Frequent location is required";
    else if (form.frequent_location.trim().length > 200)
      next.frequent_location = "Too long (max 200 characters)";
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
        phone: user.phoneNumber ?? "",
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
      toast("Welcome to TripNest!", "success");
      router.push("/driver");
    } catch (err) {
      console.error("[driver signup] failed", err);
      toast(friendlyErrorMessage(err, "Could not create your account. Please try again."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <FullPageSpinner label="Loading…" />;

  return (
    <AppShell withNav={false}>
      <FadeIn>
        <div className="mb-6 flex justify-center">
          <Logo size={32} />
        </div>

        <PageHeader
          title={user ? "Set up your driver profile" : "Sign in as a driver"}
          subtitle={
            user
              ? "Add your vehicle details to start receiving ride requests."
              : "Verify your phone with a one-time code to start driving."
          }
          back
        />

        {!user ? (
          <PhoneOtp onVerified={() => undefined} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">
              <ShieldCheck className="h-4 w-4" />
              {user.phoneNumber ?? "Phone"} verified
            </div>

            <Field label="Full name" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                autoComplete="name"
                placeholder="e.g. James Mwangi"
                value={form.name}
                invalid={!!errors.name}
                onChange={(e) => update("name", e.target.value)}
                autoFocus
              />
            </Field>

            <Field
              label="Vehicle type"
              htmlFor="vehicle_type"
              required
              error={errors.vehicle_type}
              hint="Make and model of your car"
            >
              <Input
                id="vehicle_type"
                placeholder="e.g. Toyota Noah"
                value={form.vehicle_type}
                invalid={!!errors.vehicle_type}
                onChange={(e) => update("vehicle_type", e.target.value)}
              />
            </Field>

            <Field
              label="Car plate number"
              htmlFor="plate_number"
              required
              error={errors.plate_number}
            >
              <Input
                id="plate_number"
                autoCapitalize="characters"
                placeholder="e.g. KDA 123A"
                value={form.plate_number}
                invalid={!!errors.plate_number}
                onChange={(e) => update("plate_number", e.target.value)}
              />
            </Field>

            <Field
              label="Current location"
              htmlFor="current_location"
              required
              error={errors.current_location}
            >
              <Input
                id="current_location"
                placeholder="e.g. Westlands, Nairobi"
                value={form.current_location}
                invalid={!!errors.current_location}
                onChange={(e) => update("current_location", e.target.value)}
              />
            </Field>

            <Field
              label="Frequent operating location"
              htmlFor="frequent_location"
              required
              error={errors.frequent_location}
              hint="Where you usually pick up riders"
            >
              <Input
                id="frequent_location"
                placeholder="e.g. CBD / JKIA"
                value={form.frequent_location}
                invalid={!!errors.frequent_location}
                onChange={(e) => update("frequent_location", e.target.value)}
              />
            </Field>

            <Field label="Vehicle category" required>
              <Segmented
                name="vehicle_category"
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
              Create driver account
            </Button>
          </form>
        )}
      </FadeIn>
    </AppShell>
  );
}
