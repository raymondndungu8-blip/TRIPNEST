"use client";

import { useState } from "react";
import { Phone, KeyRound, ArrowLeft } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";
import { sendPhoneOtp, verifyPhoneOtp, normalizePhone } from "@/lib/auth";

/**
 * Phone → SMS code verification. On success, a Supabase auth session exists
 * (the SessionProvider picks it up via onAuthStateChange). `onVerified` lets
 * the parent advance immediately.
 */
export function PhoneOtp({
  onVerified,
}: {
  onVerified: (phone: string) => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (phone.trim().length < 9) {
      toast("Enter a valid phone number", "warning");
      return;
    }
    setBusy(true);
    try {
      await sendPhoneOtp(phone);
      toast(`Code sent to ${normalizePhone(phone)}`, "success");
      setPhase("code");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send code";
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 6) {
      toast("Enter the 6-digit code", "warning");
      return;
    }
    setBusy(true);
    try {
      await verifyPhoneOtp(phone, code);
      onVerified(normalizePhone(phone));
    } catch (err) {
      toast("Incorrect or expired code. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "phone") {
    return (
      <form onSubmit={handleSend} className="space-y-4">
        <Field
          label="Phone number"
          htmlFor="phone"
          required
          hint="We'll text you a 6-digit verification code."
        >
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
              className="pl-10"
              autoComplete="tel"
              autoFocus
            />
          </div>
        </Field>
        <Button type="submit" size="lg" fullWidth loading={busy}>
          {!busy && <Phone className="h-4 w-4" />}
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <Field
        label="Verification code"
        htmlFor="code"
        required
        hint={`Sent to ${normalizePhone(phone)}`}
      >
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            maxLength={6}
            autoFocus
            className="pl-10 text-center text-lg font-semibold tracking-[0.5em] tabular-nums"
          />
        </div>
      </Field>
      <Button type="submit" size="lg" fullWidth loading={busy}>
        {!busy && <KeyRound className="h-4 w-4" />}
        Verify &amp; continue
      </Button>
      <button
        type="button"
        onClick={() => {
          setPhase("phone");
          setCode("");
        }}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Change number
      </button>
    </form>
  );
}
