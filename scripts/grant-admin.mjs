/**
 * Provision a TripNest admin from an email address.
 *
 * Resolves the Firebase UID for the given email (creating the Auth user if it
 * doesn't exist yet) and then writes `admins/<uid>` so the /admin dashboard
 * unlocks for that account. Safe to re-run: updates instead of duplicating.
 *
 * Usage:
 *   node scripts/grant-admin.mjs tripnest254@gmail.com        (temp password auto-set)
 *   node scripts/grant-admin.mjs me@x.app mypAssw0rd          (explicit password)
 *
 * Reads credentials from .env.local (FIREBASE_SERVICE_ACCOUNT +
 * FIREBASE_PROJECT_ID). Runs standalone with Node, not part of the Next build.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, cert, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
const email = process.argv[2];
const explicitPassword = process.argv[3];

if (!email) {
  console.error("Usage: node scripts/grant-admin.mjs <email> [password]");
  process.exit(1);
}

const raw = env.FIREBASE_SERVICE_ACCOUNT;
const projectId =
  env.FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!raw || !projectId) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT or project ID in .env.local");
  process.exit(1);
}

const app = initializeApp({ credential: cert(JSON.parse(raw)), projectId });
const auth = getAuth(app);
const db = getFirestore(app);

function tempPassword() {
  return "Tp_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function main() {
  let user = null;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`user found: ${user.uid}`);
  } catch {
    try {
      const pw = explicitPassword ?? tempPassword();
      user = await auth.createUser({
        email,
        emailVerified: true,
        password: pw,
      });
      console.log(`user created: ${user.uid}`);
      console.log(`temporary password: ${pw}`);
      await auth.generatePasswordResetLink(email);
      console.log(`password-reset email sent to ${email}`);
    } catch (createErr) {
      console.error("Could not create user:", createErr.message);
      process.exit(1);
    }
  }

  await db.doc(`admins/${user.uid}`).set({
    role: "admin",
    email,
    grantedAt: new Date().toISOString(),
  });
  console.log(`admin granted: admins/${user.uid} (${email})`);

  await deleteApp(app);
}

main().catch((err) => {
  console.error("grant failed:", err);
  process.exit(1);
});