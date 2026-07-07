import { supabase } from "./supabase";

/**
 * Normalize a Kenyan phone number to E.164 (+254…), which Supabase Auth
 * requires. Accepts 07XXXXXXXX, 7XXXXXXXX, 254…, or already-+254 input.
 */
export function normalizePhone(input: string): string {
  let p = input.replace(/[\s-]/g, "").trim();
  if (p.startsWith("+")) return p;
  if (p.startsWith("0")) return "+254" + p.slice(1);
  if (p.startsWith("254")) return "+" + p;
  if (p.length === 9) return "+254" + p; // bare 7XXXXXXXX
  return "+" + p;
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone),
  });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone),
    token: token.trim(),
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : "https://tripnest-puce.vercel.app/auth/callback",
    },
  });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<void> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : "https://tripnest-puce.vercel.app/login";
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function resetPassword(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : "https://tripnest-puce.vercel.app/reset-password";
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
