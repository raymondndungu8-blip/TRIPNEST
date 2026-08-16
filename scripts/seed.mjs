/**
 * Seed TripNest Firestore with demo data so a first-time visitor sees a full,
 * professional app instead of empty states:
 *   - 8 upcoming Kenyan events (with image URLs, budgets, dates)
 *   - 6 demo drivers (online/offline, vehicle categories, base ratings)
 *
 * Run with:
 *   FIREBASE_SERVICE_ACCOUNT='{...service-account-json...}' node scripts/seed.mjs
 *
 * The script is idempotent-ish: it seeds docs with stable IDs (e.g. event-001)
 * using setDoc, so re-running updates rather than duplicates.
 */
import { initializeApp, cert, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");

function loadDotenv() {
  const file = join(root, ".env.local");
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return out;
}

const env = loadDotenv();
const credsRaw =
  process.env.FIREBASE_SERVICE_ACCOUNT ?? env.FIREBASE_SERVICE_ACCOUNT;
const projectId =
  process.env.FIREBASE_PROJECT_ID ??
  env.FIREBASE_PROJECT_ID ??
  env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!credsRaw || !projectId) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID");
  process.exit(1);
}

const app = initializeApp({ credential: cert(JSON.parse(credsRaw)), projectId });
const db = getFirestore(app);

const now = new Date().toISOString();
const events = [
  {
    id: "event-001",
    name: "Africa Food Show Kenya 2026",
    location: "KICC, Nairobi",
    eventDate: "2026-08-19T09:00:00+03:00",
    estimatedBudget: 1800,
    imageUrl: "/images/events-real/africa-food-show-kenya-2026.jpg",
    created: now,
  },
  {
    id: "event-002",
    name: "Driftwood Rugby 7s 2026",
    location: "Mombasa Sports Club, Mombasa",
    eventDate: "2026-08-21T09:00:00+03:00",
    estimatedBudget: 2600,
    imageUrl: "/images/events-real/driftwood-rugby-7s-2026.jpg",
    created: now,
  },
  {
    id: "event-003",
    name: "Afrocoast Festival 2026 with Monaco Laurèn",
    location: "Wild Waters, Mombasa",
    eventDate: "2026-08-22T18:00:00+03:00",
    estimatedBudget: 2800,
    imageUrl: "/images/events-real/afrocoast-festival-2026.jpg",
    created: now,
  },
  {
    id: "event-004",
    name: "Redsan @ 30",
    location: "Carnivore Gardens, Nairobi",
    eventDate: "2026-08-29T18:00:00+03:00",
    estimatedBudget: 1700,
    imageUrl: "/images/events-real/redsan-at-30-2026.jpg",
    created: now,
  },
  {
    id: "event-005",
    name: "Mombasa International Show 2026",
    location: "Mombasa Agricultural Showground, Mkomani",
    eventDate: "2026-09-02T09:00:00+03:00",
    estimatedBudget: 3000,
    imageUrl: "/images/events-real/mombasa-international-show-2026.jpg",
    created: now,
  },
  {
    id: "event-006",
    name: "Nairobi International Trade Fair 2026",
    location: "Jamhuri Park Showground, Nairobi",
    eventDate: "2026-09-28T09:00:00+03:00",
    estimatedBudget: 1600,
    imageUrl: "/images/events-real/nairobi-international-trade-fair-2026.jpg",
    created: now,
  },
];

const drivers = [
  {
    id: "demo-driver-001",
    userId: "demo-driver-001",
    name: "Kevin Otieno",
    phone: "+254712345678",
    vehicleType: "Toyota Crown Royal",
    plateNumber: "KCX 221B",
    currentLocation: "Westlands",
    frequentLocation: "Nairobi CBD",
    vehicleCategory: "premium",
    isAvailable: true,
    ratingAvg: 4.9,
    ratingCount: 128,
    createdAt: now,
  },
  {
    id: "demo-driver-002",
    userId: "demo-driver-002",
    name: "Dennis Mwangi",
    phone: "+254723456789",
    vehicleType: "Mazda Demio",
    plateNumber: "KDH 882X",
    currentLocation: "Kilimani",
    frequentLocation: "Kilimani",
    vehicleCategory: "standard",
    isAvailable: true,
    ratingAvg: 4.7,
    ratingCount: 86,
    createdAt: now,
  },
  {
    id: "demo-driver-003",
    userId: "demo-driver-003",
    name: "Grace Achieng",
    phone: "+254734567890",
    vehicleType: "Toyota Voxy 7-seater",
    plateNumber: "KDA 550M",
    currentLocation: "South B",
    frequentLocation: "Nairobi CBD",
    vehicleCategory: "xl",
    isAvailable: true,
    ratingAvg: 4.8,
    ratingCount: 201,
    createdAt: now,
  },
  {
    id: "demo-driver-004",
    userId: "demo-driver-004",
    name: "Samuel Kiprop",
    phone: "+254745678901",
    vehicleType: "Nissan Juke",
    plateNumber: "KCV 908Y",
    currentLocation: "Karen",
    frequentLocation: "Karen",
    vehicleCategory: "standard",
    isAvailable: true,
    ratingAvg: 4.6,
    ratingCount: 54,
    createdAt: now,
  },
  {
    id: "demo-driver-005",
    userId: "demo-driver-005",
    name: "Lilian Waithera",
    phone: "+254756789012",
    vehicleType: "Land Rover Discovery",
    plateNumber: "KDG 300Z",
    currentLocation: "Westlands",
    frequentLocation: "Westlands",
    vehicleCategory: "premium",
    isAvailable: true,
    ratingAvg: 5.0,
    ratingCount: 42,
    createdAt: now,
  },
  {
    id: "demo-driver-006",
    userId: "demo-driver-006",
    name: "Brian Kamau",
    phone: "+254767890123",
    vehicleType: "Toyota Hiace Executive",
    plateNumber: "KCE 115N",
    currentLocation: "Rongai",
    frequentLocation: "Rongai",
    vehicleCategory: "xl",
    isAvailable: false,
    ratingAvg: 4.5,
    ratingCount: 77,
    createdAt: now,
  },
];

async function main() {
  console.log(`Seeding project ${projectId} ...`);

  // Admin account (optional): TRIPNEST_ADMIN_UID=<firebase-uid> TRIPNEST_ADMIN_EMAIL=you@x.app
  const adminUid = process.env.TRIPNEST_ADMIN_UID;
  if (adminUid) {
    await db.doc(`admins/${adminUid}`).set({
      role: "admin",
      email: process.env.TRIPNEST_ADMIN_EMAIL ?? null,
      grantedAt: now,
    });
    console.log(`admins: 1 doc (${adminUid})`);
  } else {
    console.log("admins: skipped (set TRIPNEST_ADMIN_UID to grant admin access)");
  }

  const evtBatch = db.batch();
  for (const e of events) {
    evtBatch.set(db.doc(`events/${e.id}`), e, { merge: true });
  }
  await evtBatch.commit();
  console.log(`events: ${events.length} docs`);
  console.log("events seeded:");
  for (const e of events) console.log(`  - ${e.id}: ${e.name} @ ${e.location} (KES ${e.estimatedBudget})`);

  const drvBatch = db.batch();
  for (const d of drivers) {
    drvBatch.set(db.doc(`drivers/${d.id}`), d, { merge: true });
  }
  await drvBatch.commit();
  console.log(`drivers: ${drivers.length} docs`);
  for (const d of drivers) {
    console.log(
      `  - ${d.id}: ${d.name} (${d.vehicleType} ${d.plateNumber}) online=${d.isAvailable} rating=${d.ratingAvg}`
    );
  }

  console.log("\nDone. Re-deploy rules (firebase deploy --only firestore:rules) if not already live.");
  await deleteApp(app);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});