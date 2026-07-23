import { docs, collections, queryDocuments, getDocument, createDocument } from "./db"
import { where, orderBy, limit } from "firebase/firestore"

export interface Message {
  id: string
  clientId: string
  driverId: string
  senderType: "client" | "driver"
  content: string
  createdAt: string
}

export interface ConversationPreview {
  driver_id: string
  driver_name: string
  driver_vehicle: string
  driver_plate: string
  last_message: string
  last_message_at: string
  unread: boolean
}

export interface DriverConversationPreview {
  client_id: string
  client_name: string
  client_phone: string
  is_favorite: boolean
  last_message: string
  last_message_at: string
}

export async function fetchConversations(
  clientId: string
): Promise<ConversationPreview[]> {
  const rides = await queryDocuments<{ driverId: string }>(
    collections.rides(),
    where("clientId", "==", clientId)
  )
  const favs = await queryDocuments<{ driverId: string }>(
    collections.favorites(),
    where("clientId", "==", clientId)
  )

  const driverIds = new Set<string>()
  for (const r of rides) if (r.driverId) driverIds.add(r.driverId)
  for (const f of favs) if (f.driverId) driverIds.add(f.driverId)

  const driverDocs = await Promise.all(
    Array.from(driverIds).map((id) =>
      getDocument<Record<string, unknown>>(docs.driver(id))
    )
  )

  const driverMap = new Map<string, { name: string; vehicle: string; plate: string }>()
  for (const d of driverDocs) {
    if (d) {
      driverMap.set(d.id as string, {
        name: d.name as string,
        vehicle: d.vehicleType as string,
        plate: d.plateNumber as string,
      })
    }
  }

  const conversations: ConversationPreview[] = []

  for (const [driverId, info] of driverMap) {
    const msgs = await queryDocuments<Message>(
      collections.messages(),
      where("clientId", "==", clientId),
      where("driverId", "==", driverId),
      orderBy("createdAt", "desc"),
      limit(1)
    )
    const last = msgs[0] ?? null
    conversations.push({
      driver_id: driverId,
      driver_name: info.name,
      driver_vehicle: info.vehicle,
      driver_plate: info.plate,
      last_message: last?.content ?? "",
      last_message_at: last?.createdAt ?? "",
      unread: false,
    })
  }

  conversations.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0
    if (!a.last_message_at) return 1
    if (!b.last_message_at) return -1
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  })

  return conversations
}

export async function fetchDriverConversations(
  driverId: string
): Promise<DriverConversationPreview[]> {
  const [rides, favs] = await Promise.all([
    queryDocuments<{ clientId: string }>(
      collections.rides(),
      where("driverId", "==", driverId)
    ),
    queryDocuments<{ clientId: string }>(
      collections.favorites(),
      where("driverId", "==", driverId)
    ),
  ])

  const favoriteIds = new Set(
    favs.map((f) => f.clientId).filter(Boolean)
  )

  const clientIds = new Set<string>()
  for (const r of rides) if (r.clientId) clientIds.add(r.clientId)
  for (const f of favs) if (f.clientId) clientIds.add(f.clientId)

  const clientDocs = await Promise.all(
    Array.from(clientIds).map((id) =>
      getDocument<Record<string, unknown>>(docs.client(id))
    )
  )

  const clientMap = new Map<string, { name: string; phone: string }>()
  for (const c of clientDocs) {
    if (c) {
      clientMap.set(c.id as string, {
        name: c.name as string,
        phone: c.phone as string,
      })
    }
  }

  const conversations: DriverConversationPreview[] = []
  for (const [clientId, info] of clientMap) {
    const msgs = await queryDocuments<Message>(
      collections.messages(),
      where("clientId", "==", clientId),
      where("driverId", "==", driverId),
      orderBy("createdAt", "desc"),
      limit(1)
    )
    const last = msgs[0] ?? null
    conversations.push({
      client_id: clientId,
      client_name: info.name,
      client_phone: info.phone,
      is_favorite: favoriteIds.has(clientId),
      last_message: last?.content ?? "",
      last_message_at: last?.createdAt ?? "",
    })
  }

  conversations.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0
    if (!a.last_message_at) return 1
    if (!b.last_message_at) return -1
    return (
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
    )
  })

  return conversations
}

export async function fetchMessages(
  clientId: string,
  driverId: string
): Promise<Message[]> {
  return queryDocuments<Message>(
    collections.messages(),
    where("clientId", "==", clientId),
    where("driverId", "==", driverId),
    orderBy("createdAt", "asc")
  )
}

export async function sendMessage(
  clientId: string,
  driverId: string,
  senderType: "client" | "driver",
  content: string
): Promise<Message> {
  const data = {
    clientId,
    driverId,
    senderType,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  const id = await createDocument(collections.messages(), data)
  return { id, ...data }
}
