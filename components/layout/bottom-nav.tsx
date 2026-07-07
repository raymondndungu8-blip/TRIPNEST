"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, CalendarHeart, Route, UserCircle, Car, Clock, Wallet } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";

const CLIENT_TABS = [
  { href: "/client", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: CalendarHeart },
  { href: "/client/wallet", label: "Inbox", icon: Route },
  { href: "/client/favorites", label: "Setup", icon: UserCircle },
];

const DRIVER_TABS = [
  { href: "/driver", label: "Home", icon: Home },
  { href: "/driver/trips", label: "Trips", icon: Route },
  { href: "/events", label: "Events", icon: CalendarHeart },
  { href: "/driver/profile", label: "Profile", icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useSession();

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
        <div className="glass flex items-center justify-around rounded-2xl px-2 py-1.5 shadow-card">
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
                  "relative flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-primary-soft"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
