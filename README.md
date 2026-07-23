<div align="center">
  <img width="1200" alt="TripNest" src="https://raw.githubusercontent.com/raymondndungu8-blip/TRIPNEST/master/src/assets/images/welcome_hero_1780470147799.png" />
  <h1 align="center" style="margin-top: 0;">🚗 TripNest — Better the driver you know</h1>
  <p align="center">
    <strong>Pre-book rides · Flat-rate KES pricing · M-Pesa &amp; Stripe payments</strong>
  </p>
  <p align="center">
    <a href="https://tripnest-puce.vercel.app">Live Demo</a> ·
    <a href="#features">Features</a> ·
    <a href="#tech-stack">Tech Stack</a> ·
    <a href="#environment-variables">Environment Variables</a>
  </p>
</div>

---

TripNest is a ride-booking platform built for Kenya with flat-rate route-based pricing, M-Pesa and card payments, real-time driver tracking, and an admin pricing panel.

## Features

### Passenger Flow
- **Flat-rate KES pricing** — No budget input. System calculates fare from a predefined route table with fallback distance-based pricing.
- **Route table** — 20+ routes (Thika, Nairobi CBD, Westlands, JKIA, Karen, etc.) with Standard / XL / Premium tiers.
- **Shared rides** — 60% of base fare, rounded to nearest 10 KES.
- **M-Pesa STK Push** — Pay via Safaricom M-Pesa directly from the app.
- **Stripe cards** — Saved card payment with Stripe integration.
- **Real-time driver tracking** — Google Maps (fallback SVG) with driver location, ETA, and route polyline.
- **Trip history & wallet** — Transaction history from Firestore.

### Driver Flow
- **Incoming ride requests** — Cascading dispatch algorithm matches the right driver.
- **OTP verification** — Secure 4-digit PIN to start the trip.
- **Fare display** — Shows exact KES fare passenger confirmed (no recalculation).

### Admin Panel
- **Route management** — View, edit, toggle active/inactive, and add new pricing routes.
- **Inline editing** — Change Standard / XL / Premium prices live.
- **No redeploy needed** — Changes save directly to Firestore.

## Flat-Rate Pricing

Prices are calculated server-side via `POST /api/pricing/calculate`:

1. **Route table lookup** — Bidirectional match in Firestore `pricing_routes` collection.
2. **Distance fallback** — Hardcoded distance map with `base + perKm` rates if no route found.
3. **Minimum fare** — Standard: 150 KES, XL: 200 KES, Premium: 300 KES.
4. **Shared discount** — 60% of base price for shared rides.
5. **Always rounded** to nearest 10 KES.

| Route | Standard | XL | Premium |
|---|---|---|---|
| Thika Town → Nairobi CBD | 650 | 850 | 1,100 |
| Thika Town → JKIA Airport | 1,200 | 1,500 | 2,000 |
| Nairobi CBD → Westlands | 280 | 380 | 500 |
| Westlands → JKIA Airport | 700 | 900 | 1,200 |
| ... 16 more routes | | | |

## Screens

| Screen | Description |
|---|---|
| Map View | Full-screen Google Maps with "Where to?" bottom sheet |
| Car Selector | Standard / XL / Premium with price confirmation card |
| Searching | Animated driver matching with progress dots |
| Driver Tracking | Real-time map with ETA, route, and driver info |
| Trip Complete | Payment processing with M-Pesa STK or card |
| Wallet | Payment methods + transaction history |
| Admin Panel | Route table CRUD at Settings → Admin: Pricing Panel |

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend:** Express.js, Firebase Admin SDK
- **Database:** Firebase Firestore
- **Maps:** Google Maps JavaScript API (SVG fallback)
- **Payments:** Safaricom M-Pesa Daraja API, Stripe
- **Auth:** Firebase Authentication (Email/Password + Google)

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `GOOGLE_MAPS_PLATFORM_KEY` | Google Maps API key |
| `MPESA_CONSUMER_KEY` | Safaricom Daraja consumer key |
| `MPESA_CONSUMER_SECRET` | Safaricom Daraja consumer secret |
| `MPESA_PASSKEY` | Safaricom Daraja passkey |
| `MPESA_SHORTCODE` | Safaricom shortcode (default: 174379) |
| `MPESA_CALLBACK_URL` | Public URL for M-Pesa callbacks |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

Firebase config is in `firebase-applet-config.json`.

## Getting Started

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Start the dev server (frontend + API)
npm run dev
```

The app runs on `http://localhost:3000` with the Express backend serving both API and Vite dev middleware.

## Deployment

### Frontend (Vercel)
The app is deployed as a static SPA. API routes require a separate backend deployment:

```bash
npx vercel --prod
```

### Backend (Railway / Render)
The Express server (`server.ts`) needs Node.js hosting with environment variables set.

### Firestore Rules
Deploy security rules:
```bash
firebase deploy --only firestore
```
