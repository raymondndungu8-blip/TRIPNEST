"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, X } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { friendlyErrorMessage } from "@/lib/utils";
import type { Client, Driver } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lets a driver set up (or re-link) a rider profile so they can book rides too.
 * A baseline client row may already exist from the auth signup trigger — update
 * it if present, otherwise insert a fresh one.
 */
export function BecomeRiderModal({
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
              Get a ride
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
