"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged, getRedirectResult, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signOut as authSignOut } from "@/lib/auth";
import { ensureClientProfile } from "@/lib/profiles";
import { getDocument, docs } from "@/lib/db";
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
      let c: Client | null = null;
      let d: Driver | null = null;
      try {
        [c, d] = await Promise.all([
          getDocument<Client>(docs.client(u.uid)),
          getDocument<Driver>(docs.driver(u.uid)),
        ]);
      } catch (err) {
        // A denied/slow Firestore read must never hang the app: log and
        // continue with a null profile (the user can still retry/sign up).
        console.error("[session] profile load failed", err);
      }
      // No profile on record? Treat the visitor as a client and provision one
      // so sign-in always lands them straight on the dashboard (Google users
      // have none yet). Drivers already have a driver doc, so we skip them.
      if (!c && !d) {
        try {
          c = await ensureClientProfile(u);
        } catch (err) {
          console.error("[session] client profile provisioning failed", err);
        }
      }

      setClientState(c);
      setDriverState(d);
      setRole(resolveRole(c, d));
    },
    [resolveRole]
  );

  useEffect(() => {
    let active = true;

    // Finish any pending Google redirect sign-in (the listener below completes
    // the flow) and surface errors instead of silently swallowing them.
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) console.info("[session] redirect sign-in completed");
      })
      .catch((err) => console.error("[session] redirect sign-in failed", err));

    // Fail-safe: never let the app hang on "loading" if Firebase Auth is slow
    // or unreachable (the listener below depends on the network).
    const safety = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
      setUser(fbUser);
      await loadProfiles(fbUser);
      if (active) {
        setLoading(false);
        window.clearTimeout(safety);
      }
    });

    return () => {
      active = false;
      window.clearTimeout(safety);
      unsubscribe();
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
    const data = await getDocument<Driver>(docs.driver(user.uid));
    if (data) setDriverState(data);
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
