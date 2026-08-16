# TripNest — Product Requirements Document (PRD)

**Version:** 1.0 (Working Prototype)
**Owner:** Raymond Ndungu — raymondndungu8@gmail.com
**Last updated:** 2026-07-01
**Status:** Deployed prototype — fully functional at https://tripnest-puce.vercel.app
**Tech lead:** Claude Sonnet 4.6 (Anthropic)

---

## 1. Vision

TripNest is a **ride-booking and event-transport marketplace** built for the Kenyan market.
Customers pre-order drivers for scheduled rides, airport pickups, event travel, and shared
rides instead of hailing on demand. Drivers receive structured, planned requests they can
accept or reject.

**Differentiators vs. generic ride-hailing:**
- Planning-first: schedule rides ahead of time, not just now
- Event travel: book transport straight to festivals, concerts, runs
- Airport transfers: timed to flight departures — see the flight board, book a ride
- Trusted network: save favourite drivers; they appear first next time
- Direct communication: chat with your driver from the Inbox before pickup
- M-Pesa native: STK push payment triggered on arrival — no card needed

---

## 2. Personas

| Persona | Key needs | Primary actions |
|---|---|---|
| **Client** | Plan rides ahead, control budget, ride with trusted drivers, reach events, pay via M-Pesa | Sign up, book, track live, chat with drivers, favourite drivers |
| **Driver** | Steady planned work, control availability, clear trip details, confirm payment on arrival | Sign up with vehicle, toggle online, accept/reject requests, start via OTP, confirm arrival for payment |

---

## 3. Feature inventory (built & deployed)

### 3.1 Authentication

#### Clients
- **Email + password signup** — collects name, email, phone, password (min 6 chars)
- **Google OAuth signup/login** — one-tap, auto-creates client profile from Google metadata
- **Login page** — email + password, forgot password (reset link via email), lockout after 5 failed attempts (30-second cooldown), password show/hide eye toggle
- **Password strength indicator** — 4-segment visual bar on signup
- **Reset password page** — set new password after email reset link, confirm field, eye toggles
- **Auto-profile creation** — client/driver profile docs are created on signup (client-side, scoped by Firestore rules to the caller's own uid)
- **Email verification** — Firebase Auth sends a confirmation email; redirect URL configured to `/login`

#### Drivers
- **Phone OTP login** — WhatsApp OTP delivered via Twilio (or Africa's Talking SMS fallback)
- **Driver profile setup** — multi-field form: name, phone, vehicle type, plate number, current location, frequent location, vehicle category (Standard / XL / Premium)

---

### 3.2 Landing page
- Splash screen: TRIPNEST logo + tagline "better the driver you know."
- "Get Started" → client home (or signup if not logged in)
- "Join as a Driver" → driver signup
- **Onboarding carousel** — 5 auto-scrolling slides explaining how the app works:
  1. Book & schedule rides
  2. Book rides to events
  3. Airport transfers
  4. Chat with your drivers (Inbox)
  5. Save favourite drivers
- Version footer

---

### 3.3 Client home (booking screen)

**Top bar:** menu icon | TRIPNEST | profile avatar

**Ride Now / Schedule tabs:** toggle between immediate and scheduled booking

**Location fields:**
- Current Location (editable) — max 200 characters
- Where to? destination — max 200 characters

**Ride type selector:** Private | Cost sharing
- Transport budget field only appears when Cost sharing is selected

**Nearby drivers panel:** shows available drivers filtered by selected vehicle category (favourites first)

**Vehicle selection cards (3 options):**
| Vehicle | ETA | Seats | Est. fare |
|---|---|---|---|
| Luxury Sedan | 4 min | 4 | Ksh 1,850 |
| Premium SUV | 7 min | 6 | Ksh 3,200 |
| Executive Van | 12 min | 8 | Ksh 5,400 |

**Confirm Booking** button — creates the ride, sends WhatsApp verification code to client's phone

**Active ride tracker** (shown when a ride is in progress):
- ETA badge, Emergency/SOS button (calls 999 / 112)
- Real-time Google Maps-based map (dark mode via CSS filter) with animated route line + moving car marker
- Distance (km) and time-left (min) stats
- Status progress bar: Searching → Driver on the way → Trip in progress
- Driver card: name, vehicle, rating, message + call buttons
- Plate number badge
- OTP verification code display (Ride Now: shown immediately on booking, Schedule: shown on booking)
- M-Pesa payment status (pending PIN / paid with receipt)
- Share Status + Cancel Trip actions

---

### 3.4 Ride lifecycle & OTP flow

```
Client books → ride is `requested` → OTP code shown to client immediately
                                   → OTP also sent to client's WhatsApp
Driver accepts → ride is `accepted` → OTP message updates to "show driver at pickup"
Driver enters OTP at pickup → ride moves to `in_progress`
Driver confirms arrival at destination → M-Pesa STK push sent to client's phone
Client enters PIN → payment confirmed → ride marked `completed`
```

**Race safety:** two drivers accepting simultaneously is handled by a conditional UPDATE — only one succeeds because the row must still be `requested` with `driver_id IS NULL`.

---

### 3.5 Events page

- Top bar with search field
- **Airport Transfers** entry card → links to Airport page
- **Upcoming Events** list:
  - Large banner image, "Trending" badge
  - Event name, location (MapPin icon)
  - DATE / DRIVERS columns
  - EST. BUDGET (cyan)
  - Driver avatar stack + overflow count
  - "Book Ride" button → booking panel (same vehicle/ride-type/budget/schedule form)

Seeded events (from Firestore — see `scripts/seed.mjs`):
- Summertides Festival — Mombasa, Watamu Coastal Arena
- Diani Beach Festival — Diani Beach
- Nairobi Night Run — Nairobi

---

### 3.6 Airport page

Accessed from Events page → Airport Transfers card.

- "Book a ride to the airport" general booking card
- **Upcoming Departures** — mock flight board (7 flights):
  - Kenya Airways, Emirates, Qatar Airways, Ethiopian Airlines, KLM, Turkish Airlines, South African Airways
  - Shows: airline, flight number, departure time, destination city + country, terminal
  - "Book ride for this flight" → booking panel with:
    - Destination locked to `JKIA Terminal 1, Nairobi`
    - Pickup time defaulted to **3 hours before departure**

---

### 3.7 Inbox (client-driver chat)

- **Conversation list:** all drivers you've ridden with or favourited, sorted by last message, showing last message preview + time ago
- **Chat view:**
  - Message bubbles (cyan = you, dark = driver)
  - Timestamps on each message
  - Real-time updates via Firestore subscriptions
  - Message input (max 2000 characters) + send button
  - DB-level rate limit: max 20 messages per sender per 60 seconds

---

### 3.8 Setup / Profile page

**Profile header:** avatar (editable — take photo or choose from gallery, with circular crop tool), name, email, "Premium" badge, stats (Trips / Rating / Joined year)

**Menu items:**
- Personal Information → edit name, email, phone (saved to DB)
- Payment Methods → M-Pesa (active, shows linked phone), Credit/Debit Card (coming soon), PayPal (coming soon)
- Ride History → all past rides with pickup/destination, driver, status, fare
- Safety Settings → emergency contact number, share-rides toggle (enables automatic status sharing with emergency contact), safety tips
- Help & Support → contact info (email, phone, WhatsApp hours), FAQ (6 expandable items)

**Favourite Drivers list** — tap heart to remove, shown with vehicle/plate/location

**Log Out** button

---

### 3.9 Driver dashboard

- Welcome header + "Your performance index is up this week"
- **Active Alerts** — incoming ride requests (with ACCEPT / DECLINE)
- Availability card (toggle online/offline)
- Stats: TODAY'S REVENUE | TOTAL RIDES | Completed
- Your trips (accepted / in-progress) — includes OTP entry to start ride, "Confirm arrival & request payment" button
- History — completed trips with payment status

---

### 3.10 Driver signup multi-step form

Fields: Full name (max 100) | Vehicle type (max 60) | Car plate (max 20) | Current location | Frequent operating location | Vehicle category (Standard / XL / Premium)

---

## 4. Data model

> **Note:** the live app stores data in **Firebase Firestore** under the same
> logical model below (each "table" is a collection; each row is a document keyed
> by the owning user's Firebase UID). This section documents the logical schema.

### Core collections

```
clients
  id uuid PK
  user_id uuid FK auth.users (unique)
  name text (1–100 chars)
  phone text (≤20 chars)
  email text (valid email format)
  avatar_url text
  emergency_contact text
  share_rides boolean default false
  created_at timestamptz

drivers
  id uuid PK
  user_id uuid FK auth.users (unique)
  name text (1–100 chars)
  phone text
  vehicle_type text (1–60 chars)
  plate_number text (1–20 chars)
  current_location text
  frequent_location text
  vehicle_category enum(standard|xl|premium)
  is_available boolean default false
  created_at timestamptz

events
  id uuid PK
  name text
  location text
  event_date date
  estimated_budget numeric
  image_url text
  created_at timestamptz

rides
  id uuid PK
  client_id uuid FK clients
  driver_id uuid FK drivers (nullable)
  event_id uuid FK events (nullable)
  pickup text (1–200 chars)
  destination text (1–200 chars)
  scheduled_at timestamptz
  vehicle_category enum(standard|xl|premium)
  ride_type enum(private|cost_sharing)
  budget numeric (1–1,000,000)
  status enum(requested|accepted|in_progress|rejected|completed|cancelled)
  rejected_by uuid[]
  verification_code text (4-digit, generated on insert)
  payment_status enum(unpaid|pending|paid|failed)
  mpesa_receipt text
  created_at timestamptz

favorites
  id uuid PK
  client_id uuid FK clients
  driver_id uuid FK drivers
  created_at timestamptz
  UNIQUE (client_id, driver_id)

messages
  id uuid PK
  client_id uuid FK clients
  driver_id uuid FK drivers
  sender_type enum(client|driver)
  content text (1–2,000 chars)
  created_at timestamptz

payments
  id uuid PK
  ride_id uuid FK rides
  client_id uuid FK clients
  amount numeric
  phone text
  merchant_request_id text
  checkout_request_id text
  status enum(pending|success|failed)
  mpesa_receipt text
  result_code integer
  result_desc text
  created_at timestamptz
```

### Realtime
`rides`, `drivers`, `favorites`, `messages` are subscribed via Firestore `onSnapshot`.

---

## 5. Serverless functions

> The live app runs on Firebase + Next.js. WhatsApp ride-code and M-Pesa
> flows target standalone functions under `supabase/functions/` (kept for
> reference; M-Pesa is currently deferred). The web-push path uses a native
> Next.js route at `app/api/push/notify`.

| Function | Purpose | Auth |
|---|---|---|
| `mpesa-stk` | Trigger M-Pesa STK push. Validates caller is the assigned driver, amount taken from DB (not client input), phone validated against client's record | JWT required |
| `mpesa-callback` | Receives Safaricom webhook, marks ride paid/failed | Public (Safaricom webhook) |
| `send-ride-code` | Sends WhatsApp verification code to client on booking | JWT required |
| `send-sms` | Auth hook — delivers OTP for driver phone login | Webhook-signature verified |
| `app/api/push/notify` | Sends a web push (VAPID) to a user's stored subscription | Server-only (uses admin SDK) |

---

## 6. Security model

### Database
> Enforced in the live app by **Firestore Security Rules** (`firestore.rules`).
> The Supabase-era policy language below is kept for reference.

- **Auth-gated access** — every collection requires a signed-in user
- **Scoped policies**: clients see their own data; drivers see theirs; any signed-in user can read the open request feed (acceptance is transaction-guarded so only one driver claims a ride)
- **Payment/status writes protected** — rules restrict ride updates to the owning client or the assigned driver; sensitive fields are only mutated by server-side code
- **Rate limiting** enforced in the edge/client layer
- **Input validation** on all user-supplied text fields (length bounds, email format)
- **Avatar storage scoped** — users can only write to their own avatar path

### Serverless
- All secrets stored as environment variables (Vercel / function env) — no hardcoded credentials in source
- `send-sms` auth hook: signature verification is mandatory (fails closed if `SEND_SMS_HOOK_SECRET` not configured)
- `mpesa-stk`: driver ownership, ride state, and phone/amount all re-derived from DB server-side

### Frontend / HTTP
- **Security headers** (set via `next.config.mjs`):
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), geolocation=(self), microphone=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Content-Security-Policy` (restricts scripts, styles, connections, frames)
- **Login brute-force protection**: client-side lockout after 5 failed attempts (30-second cooldown with countdown)
- **No dangerouslySetInnerHTML** usage — all user content rendered via React (XSS-safe by default)

---

## 7. Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v3 — dark cyan theme (`#00d4ff` accent, `#060a13` background) |
| Animation | Framer Motion (spring micro-interactions, drag gestures) |
| Map | MapLibre GL with Google Maps raster tiles (dark mode via CSS filter) |
| Image crop | react-easy-crop (circular avatar cropper) |
| Backend / DB | Firebase — Firestore (realtime) + Storage + serverless web-push |
| Auth | Firebase Auth — email/password + Google OAuth (clients), Phone OTP via Twilio SMS (drivers) |
| Payments | M-Pesa Daraja STK Push (Safaricom Kenya) |
| Messaging | Twilio WhatsApp API / Africa's Talking SMS |
| Hosting | Vercel (auto-deploys from CLI) |
| Fonts | Inter (body) + Manrope (display headings) |

---

## 8. Design system

- **Colour:** Dark navy backgrounds (`#060a13` / `#0c1222`), cyan accent `#00d4ff`
- **Typography:** Manrope for headings (display), Inter for body text
- **Cards:** glass-morphism surfaces, `1.25rem` border radius, subtle cyan border tint
- **Motion:** spring physics transitions (stiffness 120–350, damping 16–30)
- **Mobile-first:** 375px baseline, max-width 448px container, 44px touch targets
- **Bottom navigation:** 4 tabs — Home | Events | Inbox | Setup
- **Accessibility:** 4.5:1 contrast minimum, reduced-motion respected, visible focus rings

---

## 9. User flows

### Client booking
```
Land on splash → Get Started → Log in (email/password or Google)
→ Home screen → Enter destination → Select vehicle
→ Choose ride type (Private or Cost sharing)
→ [Cost sharing only] Enter budget
→ Confirm Booking
→ WhatsApp receives OTP code
→ Active ride tracker shows: map, ETA, driver info
→ At pickup: share OTP with driver
→ Driver enters OTP → ride starts
→ Driver confirms arrival → M-Pesa PIN prompt on phone
→ Enter PIN → ride completed → option to favourite driver
```

### Driver flow
```
Sign up (phone OTP) → fill vehicle form → offline by default
→ Toggle availability ON
→ New request appears (pickup, destination, budget, type)
→ ACCEPT (locks ride) or DECLINE (passes to next driver)
→ Navigate to pickup → ask client for OTP code
→ Enter OTP → ride starts (in_progress)
→ Arrive at destination → "Confirm arrival & request KES X"
→ Client's M-Pesa PIN prompt fires → payment confirmed
→ Ride marked completed
```

---

## 10. Live deployment

| Resource | URL / ID |
|---|---|
| Production app | https://tripnest-puce.vercel.app |
| Vercel project | tripnest (raymondndungu8-1154s-projects) |
| Firebase project | tripnest (Firestore + Firebase Auth + Storage) |

---

## 11. Roadmap

| Phase | Adds |
|---|---|
| **P1 — done** | Auth, booking, realtime accept/reject, OTP verification, events, airport, inbox, favourites, setup/profile, security hardening |
| **P2 — done** | Driver chat — inbox views for drivers and riders |
| **P3 — done** | Ratings — post-ride star ratings both ways; displayed on driver cards |
| **P4 — done** | Push notifications — web push (VAPID) for new ride requests, messages, payment confirmation |
| **P5 — done** | GPS & live tracking — live driver location on map, real distance/time from routing API |
| **P6 — done** | Matching — distance-based dispatch (closest available driver first), demand surge pricing |
| **P7 — done** | Admin dashboard — ride analytics, revenue reporting, driver roster, event management |
| **P8 — done** | PWA / mobile app — installable PWA, push notifications, offline support |

---

## 12. Environment variables required

### Vercel (Next.js)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_VAPID_PUBLIC_KEY    (web push)
VAPID_PRIVATE_KEY               (web push)
```

### M-Pesa — currently deferred (toggled last)
```
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_SHORTCODE          (default: 174379 in sandbox)
MPESA_ENV                (sandbox | production)
MPESA_CALLBACK_URL
```

---

*TripNest — better the driver you know.*