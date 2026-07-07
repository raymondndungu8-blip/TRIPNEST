"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { FadeIn } from "@/components/motion/motion";
import { useToast } from "@/components/providers/toast-provider";
import { updatePassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!password) next.password = "Enter a new password";
    else if (password.length < 6) next.password = "Min 6 characters";
    if (password !== confirm) next.confirm = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await updatePassword(password);
      toast("Password updated! You can now log in.", "success");
      router.push("/login");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not update password";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell withNav={false}>
      <PageHeader title="Reset Password" back />

      <FadeIn>
        <div className="mb-6 flex flex-col items-start gap-3">
          <Logo size={36} />
          <p className="text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field
            label="New password"
            htmlFor="new-password"
            required
            error={errors.password}
          >
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              invalid={!!errors.password}
              autoComplete="new-password"
              autoFocus
            />
          </Field>

          <Field
            label="Confirm password"
            htmlFor="confirm-password"
            required
            error={errors.confirm}
          >
            <PasswordInput
              id="confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              invalid={!!errors.confirm}
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </FadeIn>
    </AppShell>
  );
}
