import { VERIFIED_EVENTS } from "./verified-events";
import type { EventItem } from "./types";

type RawEvent = Partial<EventItem> & {
  eventDate?: string;
  estimatedBudget?: number;
  imageUrl?: string | null;
  created?: string;
  createdAt?: string;
};

export function normalizeEvent(raw: RawEvent): EventItem {
  return {
    id: raw.id ?? crypto.randomUUID(),
    name: raw.name ?? "Untitled event",
    location: raw.location ?? "Kenya",
    event_date: raw.event_date ?? raw.eventDate ?? new Date().toISOString(),
    estimated_budget: raw.estimated_budget ?? raw.estimatedBudget ?? 0,
    image_url: raw.image_url ?? raw.imageUrl ?? null,
    created_at:
      raw.created_at ?? raw.createdAt ?? raw.created ?? new Date().toISOString(),
  };
}

/**
 * Replace the original demo event IDs with the researched catalogue, while
 * preserving any additional events created by an administrator.
 */
export function mergeVerifiedEvents(rawEvents: RawEvent[]): EventItem[] {
  const normalized = rawEvents.map(normalizeEvent);
  const existingById = new Map(normalized.map((event) => [event.id, event]));
  const curated = VERIFIED_EVENTS.map((event) => ({
    ...event,
    // Keep an existing record's stable ID, but always use the researched name,
    // date, venue, and matching image for the demo slots.
    id: existingById.get(event.id)?.id ?? event.id,
  }));
  const curatedIds = new Set(curated.map((event) => event.id));
  const additional = normalized.filter((event) => !curatedIds.has(event.id));
  return [...curated, ...additional].sort(
    (a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
}
