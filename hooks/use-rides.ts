"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchClientRides,
  fetchDriverRides,
  fetchOpenRequests,
} from "@/lib/rides";
import { fetchAvailableDrivers, fetchMapDrivers } from "@/lib/favorites";
import type { Driver, RideWithRelations, VehicleCategory } from "@/lib/types";

/**
 * Generic realtime list: runs `fetcher`, then refetches whenever ANY row in
 * the `rides` table changes. Simple and race-proof for a prototype.
 */
function useRealtimeRides(
  channelKey: string,
  fetcher: (() => Promise<RideWithRelations[]>) | null
) {
  const [rides, setRides] = useState<RideWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    if (!fetcherRef.current) {
      setRides([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetcherRef.current();
      setRides(data);
    } catch (err) {
      console.error("[useRealtimeRides] fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetcher) {
      setLoading(false);
      return;
    }
    refetch();
    const channel = supabase
      .channel(`rides-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides" },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelKey, refetch, !!fetcher]);

  return { rides, loading, refetch };
}

export function useClientRides(clientId: string | null | undefined) {
  return useRealtimeRides(
    `client-${clientId ?? "none"}`,
    clientId ? () => fetchClientRides(clientId) : null
  );
}

export function useOpenRequests(
  driverId: string | null | undefined,
  available: boolean
) {
  return useRealtimeRides(
    `open-${driverId ?? "none"}`,
    driverId && available ? () => fetchOpenRequests(driverId) : null
  );
}

export function useDriverRides(driverId: string | null | undefined) {
  return useRealtimeRides(
    `driver-${driverId ?? "none"}`,
    driverId ? () => fetchDriverRides(driverId) : null
  );
}

/**
 * Realtime list of available drivers for the client's booking screen. Runs
 * `fetchAvailableDrivers`, then refetches whenever ANY row in the `drivers`
 * table changes (e.g. a driver toggles online/offline).
 */
export function useRealtimeDrivers(
  clientId: string | null | undefined,
  category?: VehicleCategory
) {
  const [drivers, setDrivers] = useState<
    { driver: Driver; isFavorite: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;
  const categoryRef = useRef(category);
  categoryRef.current = category;

  const refetch = useCallback(async () => {
    if (!clientIdRef.current) {
      setDrivers([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAvailableDrivers(
        clientIdRef.current,
        categoryRef.current
      );
      setDrivers(data);
    } catch (err) {
      console.error("[useRealtimeDrivers] fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!clientId) {
      setDrivers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refetch();
    const channel = supabase
      .channel(`drivers-${clientId}-${category ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, category, refetch]);

  return { drivers, loading, refetch };
}

/**
 * Realtime drivers for the client's live map — online drivers plus the
 * client's favorites (online or offline). Refetches whenever any `drivers`
 * row changes, so markers flip online/offline the moment a driver toggles.
 */
export function useNearbyDrivers(
  clientId: string | null | undefined,
  category?: VehicleCategory
) {
  const [drivers, setDrivers] = useState<
    { driver: Driver; isFavorite: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;
  const categoryRef = useRef(category);
  categoryRef.current = category;

  const refetch = useCallback(async () => {
    if (!clientIdRef.current) {
      setDrivers([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchMapDrivers(
        clientIdRef.current,
        categoryRef.current
      );
      setDrivers(data);
    } catch (err) {
      console.error("[useNearbyDrivers] fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!clientId) {
      setDrivers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refetch();
    const channel = supabase
      .channel(`nearby-${clientId}-${category ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, category, refetch]);

  return { drivers, loading, refetch };
}
