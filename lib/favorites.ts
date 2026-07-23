import { docs, collections, queryDocuments, getDocument, setDocument, removeDocument } from "./db"
import { where } from "firebase/firestore"
import type { Driver, VehicleCategory } from "./types"

function favKey(clientId: string, driverId: string): string {
  return `${clientId}_${driverId}`
}

function toDriver(data: Record<string, unknown>): Driver {
  return {
    id: data.id as string,
    name: data.name as string,
    phone: data.phone as string,
    vehicle_type: data.vehicleType as string,
    plate_number: data.plateNumber as string,
    current_location: (data.currentLocation as string) ?? null,
    frequent_location: (data.frequentLocation as string) ?? null,
    vehicle_category: data.vehicleCategory as VehicleCategory,
    is_available: data.isAvailable as boolean,
    created_at: data.createdAt as string,
  }
}

export async function addFavorite(
  clientId: string,
  driverId: string
): Promise<void> {
  await setDocument(docs.favorite(favKey(clientId, driverId)), { clientId, driverId })
}

export async function removeFavorite(
  clientId: string,
  driverId: string
): Promise<void> {
  await removeDocument(docs.favorite(favKey(clientId, driverId)))
}

export async function fetchFavoriteDriverIds(
  clientId: string
): Promise<string[]> {
  const list = await queryDocuments<{ driverId: string }>(
    collections.favorites(),
    where("clientId", "==", clientId)
  )
  return list.map((d) => d.driverId)
}

export async function fetchFavoriteDrivers(
  clientId: string
): Promise<Driver[]> {
  const list = await queryDocuments<{ driverId: string }>(
    collections.favorites(),
    where("clientId", "==", clientId)
  )
  const driverDocs = await Promise.all(
    list.map((f) => getDocument<Record<string, unknown>>(docs.driver(f.driverId)))
  )
  return driverDocs.filter(Boolean).map((d) => toDriver(d!))
}

export async function fetchMapDrivers(
  clientId: string,
  category?: VehicleCategory
): Promise<{ driver: Driver; isFavorite: boolean }[]> {
  const favoriteIds = new Set(await fetchFavoriteDriverIds(clientId))

  const constraints = [where("isAvailable", "==", true)]
  if (category) constraints.push(where("vehicleCategory", "==", category))
  const onlineDrivers = await queryDocuments<Record<string, unknown>>(
    collections.drivers(),
    ...constraints
  )

  const byId = new Map<string, Driver>()
  for (const d of onlineDrivers) {
    const driver = toDriver(d)
    byId.set(driver.id, driver)
  }

  if (favoriteIds.size > 0) {
    const favDrivers = await fetchFavoriteDrivers(clientId)
    for (const d of favDrivers) if (!byId.has(d.id)) byId.set(d.id, d)
  }

  return Array.from(byId.values())
    .map((driver) => ({ driver, isFavorite: favoriteIds.has(driver.id) }))
    .sort(
      (a, b) =>
        Number(b.driver.is_available) - Number(a.driver.is_available) ||
        Number(b.isFavorite) - Number(a.isFavorite)
    )
}

export async function fetchAvailableDrivers(
  clientId: string,
  category?: VehicleCategory
): Promise<{ driver: Driver; isFavorite: boolean }[]> {
  const constraints = [where("isAvailable", "==", true)]
  if (category) constraints.push(where("vehicleCategory", "==", category))
  const raw = await queryDocuments<Record<string, unknown>>(
    collections.drivers(),
    ...constraints
  )
  const drivers = raw.map(toDriver)

  const favoriteIds = new Set(await fetchFavoriteDriverIds(clientId))

  return drivers
    .map((driver) => ({ driver, isFavorite: favoriteIds.has(driver.id) }))
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
}
