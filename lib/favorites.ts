import { supabase } from "./supabase";
import type { Driver, VehicleCategory } from "./types";

export async function addFavorite(
  clientId: string,
  driverId: string
): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .upsert(
      { client_id: clientId, driver_id: driverId },
      { onConflict: "client_id,driver_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function removeFavorite(
  clientId: string,
  driverId: string
): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("client_id", clientId)
    .eq("driver_id", driverId);
  if (error) throw error;
}

export async function fetchFavoriteDriverIds(
  clientId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("driver_id")
    .eq("client_id", clientId);
  if (error) throw error;
  return (data ?? []).map((r) => r.driver_id as string);
}

export async function fetchFavoriteDrivers(
  clientId: string
): Promise<Driver[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("driver:drivers(*)")
    .eq("client_id", clientId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => (r as unknown as { driver: Driver }).driver)
    .filter(Boolean);
}

/**
 * Available drivers for the client's booking screen, optionally filtered by
 * vehicle category. Favorite drivers are surfaced first.
 */
export async function fetchAvailableDrivers(
  clientId: string,
  category?: VehicleCategory
): Promise<{ driver: Driver; isFavorite: boolean }[]> {
  let query = supabase.from("drivers").select("*").eq("is_available", true);
  if (category) query = query.eq("vehicle_category", category);
  const { data, error } = await query;
  if (error) throw error;

  const favoriteIds = new Set(await fetchFavoriteDriverIds(clientId));
  const drivers = (data ?? []) as Driver[];

  return drivers
    .map((driver) => ({ driver, isFavorite: favoriteIds.has(driver.id) }))
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
}
