"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { FadeIn } from "@/components/motion/motion";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { signInWithEmail, resetPassword, signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { friendlyErrorMessage } from "@/lib/utils";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

export default function LoginPage() {
  const router = useRouter();
  const { user, client, driver, loading } = useSession();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

  // Countdown ticker while locked out after repeated failed logins.
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockSecondsLeft(0);
        setFailedAttempts(0);
      } else {
        setLockSecondsLeft(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    if (!loading && user) {
      if (client) router.replace("/client");
      else if (driver) router.replace("/driver");
      else router.replace("/signup/client");
    }
  }, [loading, user, client, driver, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (lockedUntil) {
      toast(`Too many attempts. Try again in ${lockSecondsLeft}s.`, "warning");
      return;
    }
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = "Enter your email";
    if (!password) next.password = "Enter your password";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      setFailedAttempts(0);
      toast("Welcome back!", "success");

      // Fetch session and redirect directly
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: c } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (c) {
          router.replace("/client");
          return;
        }
        const { data: d } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (d) {
          router.replace("/driver");
          return;
        }
        router.replace("/signup/client");
      }
    } catch (err) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        toast(
          `Too many failed attempts. Locked for ${LOCKOUT_MS / 1000}s.`,
          "error"
        );
      } else {
        toast(friendlyErrorMessage(err, "Invalid email or password"), "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast("Enter your email first, then tap Forgot password", "warning");
      return;
    }
    setResetting(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      toast("Password reset link sent to your email", "success");
    } catch (err) {
      toast(friendlyErrorMessage(err, "Could not send reset email"), "error");
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <FullPageSpinner label="Loading…" />;
  if (user) return <FullPageSpinner label="Redirecting…" />;

  return (
    <AppShell withNav={false}>
      <PageHeader title="Welcome back" back />

      <FadeIn>
        <div className="mb-6 flex flex-col items-start gap-3">
          <Logo size={36} />
          <p className="text-sm text-muted-foreground">
            Log in to your TripNest account to continue.
          </p>
        </div>

        <form onSubmit={handleLogin} noValidate className="space-y-4">
          <Field label="Email" htmlFor="login-email" required error={errors.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                maxLength={255}
                className="pl-10"
                invalid={!!errors.email}
                autoComplete="email"
                autoFocus
              />
            </div>
          </Field>

          <Field
            label="Password"
            htmlFor="login-password"
            required
            error={errors.password}
          >
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              invalid={!!errors.password}
              autoComplete="current-password"
            />
          </Field>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="text-sm font-medium text-accent transition-colors hover:underline disabled:opacity-50"
            >
              {resetting ? "Sending…" : "Forgot password?"}
            </button>
          </div>

          {resetSent && (
            <div className="rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">
              Check your email for a password reset link.
            </div>
          )}

          {lockedUntil && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              Too many failed attempts. Try again in {lockSecondsLeft}s.
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!!lockedUntil}
          >
            {lockedUntil
              ? `Locked (${lockSecondsLeft}s)`
              : submitting
                ? "Logging in…"
                : "Log in"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button
          size="lg"
          fullWidth
          onClick={async () => {
            setGoogleBusy(true);
            try { await signInWithGoogle(); } catch { toast("Google sign-in failed", "error"); }
            finally { setGoogleBusy(false); }
          }}
          loading={googleBusy}
          variant="outline"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <a
            href="/signup/client"
            className="font-medium text-accent underline underline-offset-2"
          >
            Sign up
          </a>
        </p>
      </FadeIn>
    </AppShell>
  );
}
