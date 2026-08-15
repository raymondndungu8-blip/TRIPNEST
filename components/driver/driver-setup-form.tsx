"use client";

import { useState } from "react";
import {
  Car,
  ShieldCheck,
  UserRound,
  Truck,
} from "lucide-react";
import type { User } from "firebase/auth";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { useToast } from "@/components/providers/toast-provider";
import { getDocument, setDocument, docs, Timestamp } from "@/lib/db";
import {
  uploadDriverAvatar,
  uploadVehicleImage,
  uploadLicenseFront,
  uploadLicenseBack,
  uploadNationalId,
} from "@/lib/storage";
import { toDriver } from "@/lib/rides";
import { friendlyErrorMessage } from "@/lib/utils";
import { VEHICLE_CATEGORIES } from "@/lib/types";
import type { Driver, VehicleCategory } from "@/lib/types";

interface DriverSetupFormProps {
  user: User;
  initialName?: string;
  phone?: string;
  submitLabel?: string;
  onCreated: (driver: Driver) => void;
}

interface PickedPhoto {
  file: Blob;
  name: string;
}

/**
 * Full driver onboarding form — shared by the phone-OTP driver signup and the
 * client's "Become a Driver" panel. Collects profile + vehicle photo, seat
 * capacity, and the driving licence (both sides) and National ID scans.
 */
export function DriverSetupForm({
  user,
  initialName = "",
  phone = "",
  submitLabel = "Create driver account",
  onCreated,
}: DriverSetupFormProps) {
  const { toast } = useToast();

  const [name, setName] = useState(initialName);
  const [vehicleType, setVehicleType] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [seats, setSeats] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [frequentLocation, setFrequentLocation] = useState("");
  const [category, setCategory] = useState<VehicleCategory>("standard");
  const [avatar, setAvatar] = useState<PickedPhoto | null>(null);
  const [vehiclePhoto, setVehiclePhoto] = useState<PickedPhoto | null>(null);
  const [licenseFront, setLicenseFront] = useState<PickedPhoto | null>(null);
  const [licenseBack, setLicenseBack] = useState<PickedPhoto | null>(null);
  const [nationalId, setNationalId] = useState<PickedPhoto | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function setError(key: string, value?: string) {
    setErrors((e) => ({ ...e, [key]: value ?? "" }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Your name is required";
    else if (name.trim().length > 100) next.name = "Too long (max 100)";
    if (!avatar) next.avatar = "Add a profile photo";
    if (!vehicleType.trim()) next.vehicleType = "Vehicle type is required";
    else if (vehicleType.trim().length > 60)
      next.vehicleType = "Too long (max 60)";
    const seatCount = Number(seats);
    if (!seats || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 20)
      next.seats = "How many passengers can it carry? (1–20)";
    if (!plateNumber.trim()) next.plateNumber = "Car plate number is required";
    else if (plateNumber.trim().length > 20)
      next.plateNumber = "Too long (max 20)";
    if (!currentLocation.trim())
      next.currentLocation = "Current location is required";
    else if (currentLocation.trim().length > 200)
      next.currentLocation = "Too long (max 200)";
    if (!frequentLocation.trim())
      next.frequentLocation = "Frequent location is required";
    else if (frequentLocation.trim().length > 200)
      next.frequentLocation = "Too long (max 200)";
    if (!licenseFront) next.licenseFront = "Scan the front of your licence";
    if (!licenseBack) next.licenseBack = "Scan the back of your licence";
    if (!nationalId) next.nationalId = "Scan your National ID";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const [avatarUrl, vehicleImageUrl, licenseFrontUrl, licenseBackUrl, nationalIdUrl] =
        await Promise.all([
          avatar ? uploadDriverAvatar(user.uid, new File([avatar.file], avatar.name)) : Promise.resolve(null),
          vehiclePhoto
            ? uploadVehicleImage(user.uid, new File([vehiclePhoto.file], vehiclePhoto.name))
            : Promise.resolve(null),
          licenseFront
            ? uploadLicenseFront(user.uid, new File([licenseFront.file], licenseFront.name))
            : Promise.resolve(null),
          licenseBack
            ? uploadLicenseBack(user.uid, new File([licenseBack.file], licenseBack.name))
            : Promise.resolve(null),
          nationalId
            ? uploadNationalId(user.uid, new File([nationalId.file], nationalId.name))
            : Promise.resolve(null),
        ]);

      await setDocument(docs.driver(user.uid), {
        userId: user.uid,
        name: name.trim(),
        phone: phone || user.phoneNumber || "",
        avatarUrl,
        vehicleType: vehicleType.trim(),
        seats: Number(seats),
        vehicleImageUrl,
        plateNumber: plateNumber.trim().toUpperCase(),
        currentLocation: currentLocation.trim(),
        frequentLocation: frequentLocation.trim(),
        vehicleCategory: category,
        isAvailable: false,
        licenseFrontUrl,
        licenseBackUrl,
        nationalIdUrl,
        documentsSubmitted: true,
        ratingAvg: null,
        ratingCount: 0,
        createdAt: Timestamp.now(),
      });

      const data = await getDocument<Record<string, unknown>>(docs.driver(user.uid));
      if (!data) throw new Error("Could not create driver profile");
      onCreated(toDriver(data));
    } catch (err) {
      console.error("[driver setup] failed", err);
      toast(friendlyErrorMessage(err, "Could not create your driver account."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Profile photo */}
      <PhotoUpload
        label="Profile photo"
        hint="A clear headshot — clients see this when you accept a ride."
        required
        crop="round"
        value={avatar ? null : undefined}
        onChange={(blob) => {
          setAvatar(blob ? { file: blob, name: "avatar.jpg" } : null);
          setError("avatar");
        }}
      />
      {errors.avatar && <p className="text-xs text-destructive">{errors.avatar}</p>}

      <Field label="Full name" htmlFor="setup_name" required error={errors.name}>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="setup_name"
            autoComplete="name"
            placeholder="e.g. James Mwangi"
            value={name}
            invalid={!!errors.name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="pl-10"
          />
        </div>
      </Field>

      {/* Vehicle photo */}
      <PhotoUpload
        label="Vehicle photo"
        hint="A recent shot of your actual vehicle, exterior."
        required
        value={vehiclePhoto ? null : undefined}
        onChange={(blob) => {
          setVehiclePhoto(blob ? { file: blob, name: "vehicle.jpg" } : null);
          setError("vehiclePhoto");
        }}
      />

      <Field label="Vehicle type" htmlFor="setup_vehicle" required error={errors.vehicleType} hint="Make and model of your car">
        <div className="relative">
          <Car className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="setup_vehicle"
            placeholder="e.g. Toyota Noah"
            value={vehicleType}
            invalid={!!errors.vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            maxLength={60}
            className="pl-10"
          />
        </div>
      </Field>

      <Field
        label="How many can it carry?"
        htmlFor="setup_seats"
        required
        error={errors.seats}
        hint="Total passenger seats, including back seats."
      >
        <div className="relative">
          <Truck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="setup_seats"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            placeholder="e.g. 7"
            value={seats}
            invalid={!!errors.seats}
            onChange={(e) => setSeats(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className="pl-10"
          />
        </div>
      </Field>

      <Field label="Car plate number" htmlFor="setup_plate" required error={errors.plateNumber}>
        <Input
          id="setup_plate"
          autoCapitalize="characters"
          placeholder="e.g. KDA 123A"
          value={plateNumber}
          invalid={!!errors.plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          maxLength={20}
        />
      </Field>

      <Field label="Current location" htmlFor="setup_current" required error={errors.currentLocation}>
        <Input
          id="setup_current"
          placeholder="e.g. Westlands, Nairobi"
          value={currentLocation}
          invalid={!!errors.currentLocation}
          onChange={(e) => setCurrentLocation(e.target.value)}
          maxLength={200}
        />
      </Field>

      <Field
        label="Frequent operating location"
        htmlFor="setup_frequent"
        required
        error={errors.frequentLocation}
        hint="Where you usually pick up riders"
      >
        <Input
          id="setup_frequent"
          placeholder="e.g. CBD / JKIA"
          value={frequentLocation}
          invalid={!!errors.frequentLocation}
          onChange={(e) => setFrequentLocation(e.target.value)}
          maxLength={200}
        />
      </Field>

      <Field label="Vehicle category" required>
        <Segmented
          name="setup_category"
          columns={3}
          value={category}
          onChange={setCategory}
          options={VEHICLE_CATEGORIES}
        />
      </Field>

      {/* Documents */}
      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-3.5">
        <div className="flex items-center gap-2 text-accent">
          <ShieldCheck className="h-4 w-4" />
          <p className="text-sm font-semibold">Required documents</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Scans of both sides of your driving licence and your National ID —
          these are required to drive on TripNest.
        </p>
      </div>

      <PhotoUpload
        label="Driving licence — front"
        required
        value={licenseFront ? null : undefined}
        onChange={(blob) => {
          setLicenseFront(blob ? { file: blob, name: "licence-front.jpg" } : null);
          setError("licenseFront");
        }}
      />
      {errors.licenseFront && (
        <p className="text-xs text-destructive">{errors.licenseFront}</p>
      )}

      <PhotoUpload
        label="Driving licence — back"
        required
        value={licenseBack ? null : undefined}
        onChange={(blob) => {
          setLicenseBack(blob ? { file: blob, name: "licence-back.jpg" } : null);
          setError("licenseBack");
        }}
      />
      {errors.licenseBack && (
        <p className="text-xs text-destructive">{errors.licenseBack}</p>
      )}

      <PhotoUpload
        label="National ID"
        required
        value={nationalId ? null : undefined}
        onChange={(blob) => {
          setNationalId(blob ? { file: blob, name: "national-id.jpg" } : null);
          setError("nationalId");
        }}
      />
      {errors.nationalId && (
        <p className="text-xs text-destructive">{errors.nationalId}</p>
      )}

      <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
        {!submitting && <Car className="h-5 w-5" />}
        {submitting ? "Uploading documents…" : submitLabel}
      </Button>
    </form>
  );
}