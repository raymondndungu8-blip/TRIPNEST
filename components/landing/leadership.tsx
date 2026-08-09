"use client";

import { LogoMark } from "@/components/brand/logo";

const LEADERS = [
  {
    name: "Andrew Dames",
    roles: ["Co-Founder", "Chief Executive Officer"],
  },
  {
    name: "Raymond Ndungu",
    roles: ["Co-Founder", "Chief Technology Officer"],
  },
];

export function LeadershipSection() {
  return (
    <section className="relative overflow-hidden bg-background px-5 py-16 sm:px-6 sm:py-24 md:px-12">
      {/* soft glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-blue-500/10 blur-[90px]"
      />

      <div className="relative mx-auto w-full max-w-3xl">
        <div className="text-center">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.3em] text-accent">
            Leadership
          </h2>
          <p className="mt-3 font-display text-2xl font-semibold text-foreground">
            Built to serve the sophisticated traveler.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {LEADERS.map((leader) => (
            <div key={leader.name} className="glass flex items-center gap-4 rounded-2xl p-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary-soft">
                <LogoMark size={32} />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-foreground">
                  {leader.name}
                </p>
                <p className="text-xs leading-snug text-muted-foreground">
                  {leader.roles.join(" · ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}