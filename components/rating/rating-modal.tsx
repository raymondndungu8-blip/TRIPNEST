"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";
import { submitRating } from "@/lib/ratings";
import { useToast } from "@/components/providers/toast-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RatingModal({
  open,
  rideId,
  raterId,
  targetId,
  targetRole,
  targetName,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  rideId: string;
  raterId: string;
  targetId: string;
  targetRole: "driver" | "client";
  targetName: string;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const { toast } = useToast();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (busy) return;
    if (stars < 1) {
      toast("Tap a star to rate", "warning");
      return;
    }
    setBusy(true);
    try {
      await submitRating({
        rideId,
        raterId,
        targetId,
        targetRole,
        stars,
        comment: comment.trim() || undefined,
      });
      toast(`Thanks — you rated ${targetName}`, "success");
      setStars(0);
      setComment("");
      onSubmitted?.();
      onClose();
    } catch (err) {
      console.error("[rating] submit failed", err);
      toast("Could not submit rating. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Rate your trip"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                How was your trip?
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 flex flex-col items-center gap-4">
              <Avatar name={targetName} size={64} />
              <div>
                <p className="text-center font-semibold text-foreground">
                  {targetName}
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  {targetRole === "driver" ? "Your driver" : "Your rider"}
                </p>
              </div>

              <div
                className="flex items-center gap-1.5"
                role="radiogroup"
                aria-label="Star rating"
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = n <= (hover || stars);
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={stars === n}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      onClick={() => setStars(n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <Star
                        className={cn(
                          "h-9 w-9 transition-colors",
                          active
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave a comment (optional)"
              maxLength={500}
              rows={3}
              aria-label="Rating comment"
              className="mb-5 w-full resize-none rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent/50 focus:outline-none"
            />

            <Button
              fullWidth
              onClick={handleSubmit}
              loading={busy}
              className="h-12 rounded-full text-sm font-semibold"
            >
              Submit rating
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}