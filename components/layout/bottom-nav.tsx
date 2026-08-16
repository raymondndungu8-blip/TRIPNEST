"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, CalendarHeart, Route, UserCircle, MessageCircle, Wallet } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { useUnreadCount } from "@/hooks/use-unread";
import { cn } from "@/lib/utils";

const CLIENT_TABS = [
  { href: "/client", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: CalendarHeart },
  { href: "/client/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/client/favorites", label: "Setup", icon: UserCircle },
];

const DRIVER_TABS = [
  { href: "/driver", label: "Home", icon: Home },
  { href: "/driver/trips", label: "Trips", icon: Route },
  { href: "/driver/inbox", label: "Inbox", icon: MessageCircle },
  { href: "/driver/wallet", label: "Earnings", icon: Wallet },
  { href: "/driver/profile", label: "Profile", icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const { role, client, driver } = useSession();

  // Live unread count for the active role, shown on the Inbox tab app-wide.
  const unreadRole = role === "driver" ? "driver" : "client";
  const unreadId = role === "driver" ? (driver?.id ?? "") : (client?.id ?? "");
  const unread = useUnreadCount(unreadRole, unreadId);

  // Hide on landing / signup screens.
  if (
    pathname === "/" ||
    pathname.startsWith("/signup") ||
    !role
  ) {
    return null;
  }

  const tabs = role === "driver" ? DRIVER_TABS : CLIENT_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="flex items-center justify-around rounded-2xl border border-border bg-[#0d1626]/90 px-1.5 py-1.5 shadow-nav backdrop-blur-xl">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.href !== "/client" &&
                tab.href !== "/driver" &&
                pathname.startsWith(tab.href));
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex min-w-[54px] flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold tracking-tight transition-colors",
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-accent/16 shadow-[0_8px_24px_rgba(0,212,255,0.18)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
                  {tab.href.includes("/inbox") && unread > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-white shadow-[0_4px_12px_rgba(220,38,38,0.5)]">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
