"use client";

import { cn } from "@/lib/utils";

type Strength = 0 | 1 | 2 | 3 | 4;

function scorePassword(password: string): Strength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4) as Strength;
}

const LABELS: Record<Strength, string> = {
  0: "",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

const COLORS: Record<Strength, string> = {
  0: "bg-muted",
  1: "bg-destructive",
  2: "bg-warning",
  3: "bg-accent",
  4: "bg-success",
};

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const strength = scorePassword(password);

  return (
    <div className="mt-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              bar <= strength ? COLORS[strength] : "bg-muted"
            )}
          />
        ))}
      </div>
      {strength > 0 && (
        <p
          className={cn(
            "mt-1 text-[11px] font-medium",
            strength === 1 && "text-destructive",
            strength === 2 && "text-warning",
            strength === 3 && "text-accent",
            strength === 4 && "text-success"
          )}
        >
          {LABELS[strength]} password
        </p>
      )}
    </div>
  );
}