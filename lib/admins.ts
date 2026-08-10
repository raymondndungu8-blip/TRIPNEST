import { getDocument, docs } from "./db";

/**
 * Grant a Firebase UID admin access (provisioning helper).
 * Only callable from tooling/server code — the client SDK cannot
 * self-grant because Firestore rules restrict the admins collection
 * to the matching admin uid after the first grant.
 */
export async function grantAdmin(
  uid: string,
  email?: string
): Promise<void> {
  const { setDocument } = await import("./db");
  await setDocument(docs.admin(uid), {
    role: "admin",
    email: email ?? null,
    grantedAt: new Date().toISOString(),
  });
}

/** True when the given Firebase UID has an admin record. */
export async function isAdminUser(uid: string): Promise<boolean> {
  const record = await getDocument<{ role?: string }>(docs.admin(uid));
  return record?.role === "admin";
}