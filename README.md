# TripNest

![TripNest UI](tripnest%20ui.jpeg)

> **Live:** [tripnest-puce.vercel.app](https://tripnest-puce.vercel.app)

TripNest is a **mobile-first ride-booking & event-transport marketplace**. Customers
pre-order drivers for **scheduled rides, airport pickups, event travel, and shared rides**;
drivers go online and accept/reject requests in real time.

See [PRD.md](PRD.md) for the full product spec and roadmap.

## Leadership

- **Andrew Dames** — Chief Executive Officer / Chief Financial Officer
- **Raymond Ndungu** — Chief Financial Officer / Chief Technology Officer

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** — custom design system (deep navy + electric blue `#2563EB`, glassmorphism)
- **Framer Motion** — spring micro-interactions
- **Firebase** — Auth, Firestore, Storage (live request routing & chat)
- Sora (display) + Inter (body) via `next/font`

## Project structure

```text
app/                 Routes (App Router)
  page.tsx           Landing / role select
  signup/client      Client signup
  signup/driver      Driver signup
  client/            Client dashboard + inbox + favorites
  driver/            Driver dashboard + inbox + trips + profile
  events/            Events listing + book-to-event
  airport/           Airport transfers + flight board
components/          UI primitives, layout, providers, ride card, brand
hooks/use-rides.ts   Realtime ride subscriptions
lib/                 firebase client, auth, firestore, types, ride & favorites services, utils
legacy/              The original vanilla-JS prototype (Mark 0.1), kept for reference
PRD.md               Product Requirements Document
```

## Setup

Requires Node 18.18+.

```bash
npm install
```

Environment variables live in `.env.local` (already configured for the Firebase project):

```text
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
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

Because data is in Firebase Firestore (not just local memory), the two phones do **not** need to
be on the same network for production — only the local dev server does. Deploy (e.g. Vercel) to
test across networks.

## Build

```bash
npm run build && npm start
```

## Security

Authentication is handled by Firebase Auth (email/phone), with role-based access for clients and
drivers. Production deployments must keep Firebase Security Rules locked down so users can only
read/write their own data.

## Roadmap

Ratings, push notifications, live GPS tracking, distance-based matching, surge pricing, admin
dashboard, and PWA support — see [PRD.md](PRD.md) §11.
