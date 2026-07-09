import { supabase } from "./supabase";

export interface Message {
  id: string;
  client_id: string;
  driver_id: string;
  sender_type: "client" | "driver";
  content: string;
  created_at: string;
}

export interface ConversationPreview {
  driver_id: string;
  driver_name: string;
  driver_vehicle: string;
  driver_plate: string;
  last_message: string;
  last_message_at: string;
  unread: boolean;
}

export async function fetchConversations(
  clientId: string
): Promise<ConversationPreview[]> {
  const { data: rides } = await supabase
    .from("rides")
    .select("driver_id, driver:drivers(id, name, vehicle_type, plate_number)")
    .eq("client_id", clientId)
    .not("driver_id", "is", null);

  const { data: favs } = await supabase
    .from("favorites")
    .select("driver_id, driver:drivers(id, name, vehicle_type, plate_number)")
    .eq("client_id", clientId);

  const driverMap = new Map<
    string,
    { name: string; vehicle: string; plate: string }
  >();

  for (const r of rides ?? []) {
    const d = r.driver as unknown as {
      id: string;
      name: string;
      vehicle_type: string;
      plate_number: string;
    } | null;
    if (d) driverMap.set(d.id, { name: d.name, vehicle: d.vehicle_type, plate: d.plate_number });
  }
  for (const f of favs ?? []) {
    const d = f.driver as unknown as {
      id: string;
      name: string;
      vehicle_type: string;
      plate_number: string;
    } | null;
    if (d && !driverMap.has(d.id))
      driverMap.set(d.id, { name: d.name, vehicle: d.vehicle_type, plate: d.plate_number });
  }

  const conversations: ConversationPreview[] = [];

  for (const [driverId, info] of driverMap) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("client_id", clientId)
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(1);

    const last = msgs?.[0];
    conversations.push({
      driver_id: driverId,
      driver_name: info.name,
      driver_vehicle: info.vehicle,
      driver_plate: info.plate,
      last_message: last?.content ?? "",
      last_message_at: last?.created_at ?? "",
      unread: false,
    });
  }

  conversations.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  return conversations;
}

export interface DriverConversationPreview {
  client_id: string;
  client_name: string;
  client_phone: string;
  is_favorite: boolean;
  last_message: string;
  last_message_at: string;
}

/**
 * Conversations for a driver: clients they've had rides with, plus clients who
 * favorited them (loyal riders). RLS exposes both — rides via is_client_visible
 * and favorites via the favorites clause added to it.
 */
export async function fetchDriverConversations(
  driverId: string
): Promise<DriverConversationPreview[]> {
  const [{ data: rides }, { data: favs }] = await Promise.all([
    supabase
      .from("rides")
      .select("client_id, client:clients(id, name, phone)")
      .eq("driver_id", driverId)
      .not("client_id", "is", null),
    supabase
      .from("favorites")
      .select("client_id, client:clients(id, name, phone)")
      .eq("driver_id", driverId),
  ]);

  const favoriteIds = new Set(
    (favs ?? []).map((f) => f.client_id as string).filter(Boolean)
  );

  const clientMap = new Map<string, { name: string; phone: string }>();
  const collect = (
    rows: { client: unknown }[] | null | undefined
  ) => {
    for (const row of rows ?? []) {
      const c = row.client as {
        id: string;
        name: string;
        phone: string;
      } | null;
      if (c && !clientMap.has(c.id))
        clientMap.set(c.id, { name: c.name, phone: c.phone });
    }
  };
  collect(rides);
  collect(favs);

  const conversations: DriverConversationPreview[] = [];
  for (const [clientId, info] of clientMap) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("client_id", clientId)
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(1);
    const last = msgs?.[0];
    conversations.push({
      client_id: clientId,
      client_name: info.name,
      client_phone: info.phone,
      is_favorite: favoriteIds.has(clientId),
      last_message: last?.content ?? "",
      last_message_at: last?.created_at ?? "",
    });
  }

  conversations.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0;
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return (
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
    );
  });

  return conversations;
}

export async function fetchMessages(
  clientId: string,
  driverId: string
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientId)
    .eq("driver_id", driverId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(
  clientId: string,
  driverId: string,
  senderType: "client" | "driver",
  content: string
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      client_id: clientId,
      driver_id: driverId,
      sender_type: senderType,
      content: content.trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}
