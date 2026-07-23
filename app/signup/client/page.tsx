"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone } from "lucide-react";
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
import { auth } from "@/lib/firebase";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import { getDocument, docs, patchDocument } from "@/lib/db";
import { friendlyErrorMessage } from "@/lib/utils";
import { PasswordStrength } from "@/components/ui/password-strength";
import type { Client } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Poll briefly for the client document to exist. */
async function waitForClient(
  userId: string,
  attempts = 6
): Promise<Client | null> {
  for (let i = 0; i < attempts; i++) {
    const data = await getDocument<Client>(docs.client(userId));
    if (data) return data;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

export default function ClientSignupPage() {
  const router = useRouter();
  const { user, client, loading, setClient, setRolePreference } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    setRolePreference("client");
  }, [setRolePreference]);

  // Already have a client profile — go straight home.
  useEffect(() => {
    if (!loading && client) router.replace("/client");
  }, [loading, client, router]);

  // Have a session but the profile hasn't loaded into context yet (e.g. just
  // came back from Google or a password reset). The DB trigger guarantees a
  // row exists almost instantly — poll briefly, then go home automatically.
  useEffect(() => {
    if (loading || client || !user) return;
    let active = true;
    (async () => {
      const found = await waitForClient(user.uid);
      if (!active) return;
      if (found) {
        setClient(found);
        router.replace("/client");
      }
    })();
    return () => { active = false; };
  }, [user, client, loading, router, setClient]);

  async function handleGoogle() {
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      toast("Google sign-in failed. Use email instead.", "error");
      setGoogleBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter your name";
    else if (name.trim().length > 100) next.name = "Name is too long (max 100 characters)";
    if (!email.trim()) next.email = "Enter your email";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email";
    if (phone.trim().length > 20) next.phone = "Phone number is too long";
    if (!password) next.password = "Create a password";
    else if (password.length < 6)
      next.password = "Password must be at least 6 characters";
    else if (password.length > 72)
      next.password = "Password is too long (max 72 characters)";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      try {
        await signUpWithEmail(email, password);
      } catch (signupErr) {
        const msg = signupErr instanceof Error ? signupErr.message : "";
        if (/already registered/i.test(msg)) {
          toast("You already have an account. Redirecting to login.", "warning");
          router.push("/login");
          return;
        }
        throw signupErr;
      }

      const authUser = auth.currentUser;

      if (!authUser) {
        toast("Check your email to confirm your account, then log in.", "info");
        router.push("/login");
        return;
      }

      const profile = await waitForClient(authUser.uid);
      await patchDocument(docs.client(authUser.uid), { name: name.trim(), phone: phone.trim() });
      const finalProfile = (await getDocument<Client>(docs.client(authUser.uid))) ?? profile;
      if (!finalProfile) throw new Error("Could not finish setting up your account");

      setClient(finalProfile);
      toast("Welcome to TripNest!", "success");
      router.push("/client");
    } catch (err) {
      toast(friendlyErrorMessage(err, "Something went wrong"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || (user && !client)) return <FullPageSpinner label="Setting up your account…" />;

  return (
    <AppShell withNav={false}>
      <PageHeader title="Create Account" back />

      <FadeIn>
        <div className="mb-6 flex flex-col items-start gap-3">
          <Logo size={36} />
          <p className="text-sm text-muted-foreground">
            Join the elite network of professional transport logistics.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Full name" htmlFor="name" required error={errors.name}>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Wanjiru"
                maxLength={100}
                className="pl-10"
                invalid={!!errors.name}
                autoComplete="name"
                autoFocus
              />
            </div>
          </Field>

          <Field label="Email" htmlFor="email" required error={errors.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
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
            htmlFor="phone"
            hint="For M-Pesa payments and driver contact"
            error={errors.phone}
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
                maxLength={20}
                className="pl-10"
                invalid={!!errors.phone}
                autoComplete="tel"
              />
            </div>
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            required
            error={errors.password}
          >
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              maxLength={72}
              invalid={!!errors.password}
              autoComplete="new-password"
            />
            <PasswordStrength password={password} />
          </Field>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            {submitting ? "Creating account…" : "Create account"}
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
          onClick={handleGoogle}
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
          Already have an account?{" "}
          <a
            href="/login"
            className="font-medium text-accent underline underline-offset-2"
          >
            Log in
          </a>
        </p>
      </FadeIn>
    </AppShell>
  );
}
