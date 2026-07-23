"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signOut as authSignOut } from "@/lib/auth";
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
      const [c, d] = await Promise.all([
        getDocument<Client>(docs.client(u.uid)),
        getDocument<Driver>(docs.driver(u.uid)),
      ]);
      setClientState(c);
      setDriverState(d);
      setRole(resolveRole(c, d));
    },
    [resolveRole]
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;
      setUser(fbUser);
      await loadProfiles(fbUser);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
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
