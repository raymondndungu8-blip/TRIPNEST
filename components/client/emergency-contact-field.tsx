"use client";

import { useState } from "react";
import { Phone, Contact } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";
import { pickContact, supportsContactsPicker } from "@/lib/contacts";

/**
 * Emergency contact input. On devices with the Contacts Picker API it shows a
 * "Choose from contacts" button that fills the number straight from the
 * address book; everywhere else the user types the number manually.
 */
export function EmergencyContactField({
  value,
  onChange,
  required,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}) {
  const { toast } = useToast();
  const [picking, setPicking] = useState(false);
  const canPick = supportsContactsPicker();

  async function handlePick() {
    setPicking(true);
    try {
      const contact = await pickContact();
      if (!contact) {
        toast("No contact selected", "info");
        return;
      }
      if (contact.phone) onChange(contact.phone);
      if (contact.name) toast(`Picked ${contact.name}`, "success");
    } finally {
      setPicking(false);
    }
  }

  return (
    <Field
      label="Emergency contact"
      htmlFor="emergency_contact"
      required={required}
      error={error}
      hint="This number is contacted in an emergency during your ride."
    >
      <div className="relative">
        <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="emergency_contact"
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="+254 7XX XXX XXX"
          maxLength={20}
          className={cn("pl-10", canPick && "pr-24")}
          invalid={!!error}
          autoComplete="tel"
        />
        {canPick && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePick}
            loading={picking}
            className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 px-2.5 text-xs"
          >
            {!picking && <Contact className="h-4 w-4" />}
            Contacts
          </Button>
        )}
      </div>
    </Field>
  );
}