"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const inputBase =
  "w-full rounded-xl border border-border bg-surface-2/70 px-4 text-[15px] text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:bg-surface-2 disabled:opacity-50 [color-scheme:dark]";

export const PasswordInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn(
          inputBase,
          "h-12 pr-12",
          invalid && "border-destructive/60 focus:ring-destructive/30",
          className
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="h-[18px] w-[18px]" />
        ) : (
          <Eye className="h-[18px] w-[18px]" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
