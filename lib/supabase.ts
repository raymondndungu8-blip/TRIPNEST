"use client";

import { createClient } from "@supabase/supabase-js";

// The publishable (anon) key is public by design — it ships in the client
// bundle and is gated by RLS — so a fallback here keeps prod builds working
// even if the env vars aren't set in the host. Override via env in any other env.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://frqlxatryxlsjntzqdgn.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_cK5vgUbgJOFveFSX_0hICw_Ft8cLicY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { params: { eventsPerSecond: 10 } },
});
