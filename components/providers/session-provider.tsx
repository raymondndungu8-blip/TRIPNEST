"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { signOut as authSignOut } from "@/lib/auth";
import type { Client, Driver, Role } from "@/lib/types";

const ROLE_KEY = "tripnest_role";

interface SessionContextValue {
  user: User | null;
  role: Role | null;
  client: Client | null;
  driver: Driver | null;
  loading: boolean;
  setClient: (client: Client) => void;
  setDriver: (driver: Driver) => void;
  setRolePreference: (role: Role) => void;
  refreshDriver: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [client, setClientState] = useState<Client | null>(null);
  const [driver, setDriverState] = useState<Driver | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveRole = useCallback(
    (c: Client | null, d: Driver | null): Role | null => {
      const stored =
        typeof window !== "undefined"
          ? (localStorage.getItem(ROLE_KEY) as Role | null)
          : null;
      if (c && d) return stored ?? "client";
      if (c) return "client";
      if (d) return "driver";
      return stored;
    },
    []
  );

  const loadProfiles = useCallback(
    async (u: User | null) => {
      if (!u) {
        setClientState(null);
        setDriverState(null);
        setRole(null);
        return;
      }
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from("clients").select("*").eq("user_id", u.id).maybeSingle(),
        supabase.from("drivers").select("*").eq("user_id", u.id).maybeSingle(),
      ]);
      const clientRow = (c as Client | null) ?? null;
      const driverRow = (d as Driver | null) ?? null;
      setClientState(clientRow);
      setDriverState(driverRow);
      setRole(resolveRole(clientRow, driverRow));
    },
    [resolveRole]
  );

  useEffect(() => {
    let active = true;

    async function handle(u: User | null) {
      if (!active) return;
      setUser(u);
      await loadProfiles(u);
      if (active) setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => {
      handle(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handle(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfiles]);

  const setClient = useCallback((c: Client) => {
    setClientState(c);
    setRole("client");
    localStorage.setItem(ROLE_KEY, "client");
  }, []);

  const setDriver = useCallback((d: Driver) => {
    setDriverState(d);
    setRole("driver");
    localStorage.setItem(ROLE_KEY, "driver");
  }, []);

  const setRolePreference = useCallback((r: Role) => {
    setRole(r);
    localStorage.setItem(ROLE_KEY, r);
  }, []);

  const refreshDriver = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("drivers")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setDriverState(data as Driver);
  }, [user]);

  const logout = useCallback(async () => {
    await authSignOut();
    localStorage.removeItem(ROLE_KEY);
    setUser(null);
    setClientState(null);
    setDriverState(null);
    setRole(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        user,
        role,
        client,
        driver,
        loading,
        setClient,
        setDriver,
        setRolePreference,
        refreshDriver,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
