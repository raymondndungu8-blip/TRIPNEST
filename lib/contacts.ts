/**
 * Device address-book access via the Web Contacts Picker API
 * (Chromium browsers on Android, secure contexts, user gesture required).
 * Falls back gracefully — callers should keep manual entry as the baseline.
 *
 * https://developer.chrome.com/articles/contact-picker/
 */

interface ContactsNav {
  contacts?: {
    getProperties: () => Promise<string[]>;
    select: (
      properties: string[],
      options?: { multiple?: boolean }
    ) => Promise<Array<{ name?: string; tel?: string[] }>>;
  };
}

function contactsNav(): ContactsNav {
  return navigator as unknown as ContactsNav;
}

/** True when the device can open a system contact picker. */
export function supportsContactsPicker(): boolean {
  return typeof navigator !== "undefined" && !!contactsNav().contacts?.select;
}

/** Opened contact entry picked from the device address book, if supported. */
export interface PickedContact {
  name?: string;
  phone?: string;
}

/**
 * Opens the system contacts picker and returns the chosen name + phone.
 * Returns null when cancelled, unsupported, or permission denied — the caller
 * should then fall back to manual entry.
 */
export async function pickContact(): Promise<PickedContact | null> {
  if (!supportsContactsPicker()) return null;
  try {
    const results = await contactsNav().contacts!.select(["name", "tel"], {
      multiple: false,
    });
    const contact = results[0];
    if (!contact) return null;
    return {
      name: contact.name ?? "",
      phone: contact.tel?.[0] ?? "",
    };
  } catch {
    // Dismissed by the user or permission denied — treat as "not picked".
    return null;
  }
}