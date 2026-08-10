import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Flexible";
  const d = new Date(value);
  return d.toLocaleString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(value: string): string {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Translate raw Postgres/Supabase errors into a friendly message. DB-level
 * rate-limit triggers raise `rate_limit_exceeded: <message>` — surface just
 * the human part; otherwise fall back to a generic message.
 */
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  // Firebase Auth errors carry a code like "auth/wrong-password" (either on
  // `.code` or embedded in the message when thrown by firebase/* JS SDKs).
  let code: string | undefined;
  if (err && typeof err === "object") {
    const maybeCode = (err as { code?: unknown }).code;
    if (typeof maybeCode === "string") code = maybeCode;
  }
  if (!code && err instanceof Error) {
    const m = err.message.match(/\(auth\/([\w-]+)\)/);
    if (m) code = "auth/" + m[1];
  }
  if (code) {
    const known: Record<string, string> = {
      "auth/invalid-credential": "Invalid email or password",
      "auth/wrong-password": "Invalid email or password",
      "auth/user-not-found": "No account found for this email",
      "auth/invalid-email": "Enter a valid email address",
      "auth/user-disabled": "This account has been disabled",
      "auth/too-many-requests":
        "Too many attempts. Please wait a moment and try again.",
      "auth/network-request-failed":
        "Network error. Check your connection and try again.",
      "auth/popup-closed-by-user": "Sign-in was cancelled.",
      "auth/popup-blocked": "The sign-in popup was blocked by your browser.",
      "auth/unauthorized-domain":
        "This address isn't authorized to sign in yet.",
      "auth/operation-not-allowed": "This sign-in method is not enabled.",
      "auth/account-exists-with-different-credential":
        "An account already exists for this email with a different sign-in method.",
      "auth/email-already-in-use": "An account already exists for this email",
      "auth/weak-password": "Choose a stronger password",
      "auth/internal-error": "Something went wrong. Please try again.",
    };
    const mapped = known[code];
    if (mapped) return mapped;
    return code.replace(/^auth\//, "Account error: ") ?? fallback;
  }
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const rateLimitMatch = raw.match(/rate_limit_exceeded:\s*(.+)/i);
  if (rateLimitMatch) return rateLimitMatch[1];
  if (/too many requests/i.test(raw)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return fallback;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
