# TripNest

TripNest is a **mobile-first ride-booking & event-transport marketplace**. Customers
pre-order drivers for **scheduled rides, airport pickups, event travel, and shared rides**;
drivers go online and accept/reject requests in real time.

See [PRD.md](PRD.md) for the full product spec and roadmap.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** — custom design system (deep navy + electric blue `#2563EB`, glassmorphism)
- **Framer Motion** — spring micro-interactions
- **Supabase** — Postgres + Realtime (live request routing)
- Sora (display) + Inter (body) via `next/font`

## Project structure

```text
app/                 Routes (App Router)
  page.tsx           Landing / role select
  signup/client      Client signup
  signup/driver      Driver signup
  client/            Client dashboard + favorites
  driver/            Driver dashboard
  events/            Events listing + book-to-event
components/          UI primitives, layout, providers, ride card, brand
hooks/use-rides.ts   Realtime ride subscriptions
lib/                 supabase client, types, ride & favorites services, utils
legacy/              The original vanilla-JS prototype (Mark 0.1), kept for reference
PRD.md               Product Requirements Document
```

## Setup

Requires Node 18.18+.

```bash
npm install
```

Environment variables live in `.env.local` (already configured for the prototype Supabase
project):

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Run

```bash
npm run dev
```

The dev server binds to `0.0.0.0` so other devices on your WiFi can connect. It runs on
port 3000 by default (or pass `-- -p 4173`). Open `http://localhost:3000`.

## Test on two phones (driver ↔ customer)

1. Connect your computer and both phones to the same WiFi.
2. `npm run dev` on the computer.
3. Find your computer's WiFi IPv4 address (`ipconfig` on Windows → `IPv4 Address`, e.g. `192.168.8.103`).
4. On **both phones**, open `http://YOUR_COMPUTER_IP:3000`.
5. **Phone A:** tap *I'm a Client* → sign up → book a ride.
6. **Phone B:** tap *I'm a Driver* → sign up → toggle **availability ON**.
7. The request appears on the driver's phone **live**. Accept it → the client's status flips
   to *Accepted* in real time. Mark complete → the client can favorite the driver.

Because data is in Supabase (not just local memory), the two phones do **not** need to be on
the same network for production — only the local dev server does. Deploy (e.g. Vercel) to test
across networks.

## Build

```bash
npm run build && npm start
```

## Security note (prototype)

This is a **no-auth prototype**. Supabase Row-Level Security is enabled but with **permissive
`USING (true)` policies**, so anyone with the anon key can read/write. This is intentional for
fast local testing and is flagged by Supabase's linter. **Before any real launch (Phase 2 –
Accounts):** add real authentication and replace these policies with per-user rules. See
[Supabase RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Roadmap

Payments, real GPS/maps, accounts/auth, distance-based matching, trip history, ratings, admin,
and push notifications — see [PRD.md](PRD.md) §9.
