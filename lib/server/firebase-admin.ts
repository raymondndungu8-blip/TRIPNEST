import { initializeApp, getApps, cert, type App } from "firebase-admin/app";

/**
 * Firebase Admin for server-only code (push notification delivery).
 * Credentials come from the service-account JSON passed via
 * FIREBASE_SERVICE_ACCOUNT (single-line JSON) or the classical
 * GOOGLE_APPLICATION_CREDENTIALS / project env vars.
 *
 * Lazy + memoized so API routes that don't need Admin never pay the cost.
 */
export function getAdminApp(): App | null {
  try {
    if (getApps().length > 0) return getApps()[0];

    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw) {
      const creds = JSON.parse(raw);
      return initializeApp({
        credential: cert({
          projectId: creds.project_id,
          clientEmail: creds.client_email,
          privateKey: creds.private_key,
        }),
      });
    }

    const projectId =
      process.env.FIREBASE_PROJECT_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) return null;

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return initializeApp({ projectId });
    }
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }

    return null;
  } catch (err) {
    console.error("[firebase-admin] init failed", err);
    return null;
  }
}