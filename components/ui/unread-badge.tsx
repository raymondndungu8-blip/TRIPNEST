"use client";

import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUnreadCount } from "@/hooks/use-unread";
import { cn } from "@/lib/utils";

/**
 * Inbox unread-message count button. Shows a bell/chat icon with a live
 * badge of unread messages for the signed-in user. Fits the app's existing
 * Button + Badge design system.
 */
export function UnreadBadge({
  role,
  userId,
  className,
}: {
  role: "client" | "driver";
  userId: string;
  className?: string;
}) {
  const count = useUnreadCount(role, userId);

  return (
    <Button
      size="icon"
      variant="outline"
      className={cn("relative shrink-0", className)}
      aria-label={`${count} unread messages`}
      title="Unread messages"
    >
      <MessageCircle className="h-5 w-5" />
      {count > 0 && (
        <Badge
          tone="red"
          className="absolute -right-1.5 -top-1.5 min-w-[20px] justify-center px-1 text-[10px] font-bold leading-none shadow-sm"
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </Button>
  );
}
