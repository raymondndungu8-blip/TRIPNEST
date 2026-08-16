import type { EventItem } from "./types";

/**
 * Verified upcoming Kenyan events researched on 16 August 2026.
 * These records replace the original demo events when their stable IDs are
 * present in Firestore, while leaving any additional admin-created events
 * available to the page.
 */
export const VERIFIED_EVENTS: EventItem[] = [
  {
    id: "event-001",
    name: "Africa Food Show Kenya 2026",
    location: "KICC, Nairobi",
    event_date: "2026-08-19T09:00:00+03:00",
    estimated_budget: 1800,
    image_url: "/images/events-real/africa-food-show-kenya-2026.jpg",
    created_at: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "event-002",
    name: "Driftwood Rugby 7s 2026",
    location: "Mombasa Sports Club, Mombasa",
    event_date: "2026-08-21T09:00:00+03:00",
    estimated_budget: 2600,
    image_url: "/images/events-real/driftwood-rugby-7s-2026.jpg",
    created_at: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "event-003",
    name: "Afrocoast Festival 2026 with Monaco Laurèn",
    location: "Wild Waters, Mombasa",
    event_date: "2026-08-22T18:00:00+03:00",
    estimated_budget: 2800,
    image_url: "/images/events-real/afrocoast-festival-2026.jpg",
    created_at: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "event-004",
    name: "Redsan @ 30",
    location: "Carnivore Gardens, Nairobi",
    event_date: "2026-08-29T18:00:00+03:00",
    estimated_budget: 1700,
    image_url: "/images/events-real/redsan-at-30-2026.jpg",
    created_at: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "event-005",
    name: "Mombasa International Show 2026",
    location: "Mombasa Agricultural Showground, Mkomani",
    event_date: "2026-09-02T09:00:00+03:00",
    estimated_budget: 3000,
    image_url: "/images/events-real/mombasa-international-show-2026.jpg",
    created_at: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "event-006",
    name: "Nairobi International Trade Fair 2026",
    location: "Jamhuri Park Showground, Nairobi",
    event_date: "2026-09-28T09:00:00+03:00",
    estimated_budget: 1600,
    image_url: "/images/events-real/nairobi-international-trade-fair-2026.jpg",
    created_at: "2026-08-16T00:00:00.000Z",
  },
];
