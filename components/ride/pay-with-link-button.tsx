"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/providers/toast-provider";
import { generateCheckoutLink } from "@/lib/checkout";
import { cn, formatKES } from "@/lib/utils";

/**
 * Opens an IntaSend payment page (M-Pesa or card) for the ride. The link is
 * created server-side from the ride's stored amount, so this is safe to reach
 * from any ride card without shipping amount logic to the client.
 */
export function PayWithLinkButton({
  rideId,
  amount,
  className,
  label,
}: {
  rideId: string;
  amount?: number;
  className?: string;
  label?: string;
}) {
  const { toast } = useToast();
  const [state, setState] = useState<"idle" | "loading" | "opened">("idle");

  async function handleClick() {
    if (state !== "idle") return;
    setState("loading");
    const result = await generateCheckoutLink(rideId);
    if (!result.ok || !result.url) {
      setState("idle");
      toast(result.error ?? "Could not create the payment link.", "error");
      return;
    }
    setState("opened");
    window.open(result.url, "_blank", "noopener,noreferrer");
    toast(
      "Payment page opened — pay with M-Pesa or a card in the new tab.",
      "info"
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      fullWidth
      loading={state === "loading"}
      disabled={state === "opened"}
      onClick={handleClick}
      className={cn(
        "border-accent/25 bg-accent/10 text-accent hover:bg-accent/20",
        className
      )}
    >
      <CreditCard className="h-4 w-4" />
      {state === "opened"
        ? "Payment page opened…"
        : label ?? (amount != null ? `Pay now · ${formatKES(amount)}` : "Pay now")}
    </Button>
  );
}