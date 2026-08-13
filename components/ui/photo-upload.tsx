"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Trash2, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarCropper } from "@/components/ui/avatar-cropper";

/**
 * Tap-to-photo picker used across profile/onboarding. Supports taking a photo
 * with the device camera or choosing from the gallery. When `crop` is "round"
 * the image flows through the circular avatar cropper first.
 */
export function PhotoUpload({
  label,
  hint,
  required,
  value,
  onChange,
  crop = "none",
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** External preview (e.g. an uploaded URL when editing). */
  value?: string | null;
  onChange: (blob: Blob | null) => void;
  crop?: "round" | "none";
  className?: string;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Tear down object URLs we create in this component.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  function handleFile(file: File) {
    if (file.size > 8 * 1024 * 1024) return; // too big — silently ignored
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleConfirmCropped(blob: Blob) {
    setCropSrc(null);
    setPreview(URL.createObjectURL(blob));
    onChange(blob);
  }

  function handleConfirmRaw(file: File) {
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }

  function clear() {
    onChange(null);
    setPreview(null);
  }

  const hasImage = !!preview || !!value;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setShowMenu(true)}
        className={cn(
          "relative grid w-full place-items-center overflow-hidden rounded-2xl border border-dashed transition-colors",
          hasImage
            ? "border-border bg-surface-2/40"
            : "border-white/15 bg-white/[0.03] hover:border-accent/50 hover:bg-accent/5",
          crop === "round" ? "h-28 w-28 rounded-full border-2" : "h-36"
        )}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview ?? value ?? ""}
            alt={label}
            className={cn(
              "h-full w-full object-cover",
              crop === "round" ? "rounded-full" : "rounded-2xl"
            )}
          />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Camera className="h-6 w-6" />
            <span className="text-xs font-medium">Add {label.toLowerCase()}</span>
          </span>
        )}

        {/* Camera badge */}
        <span
          className={cn(
            "absolute grid place-items-center rounded-full bg-accent text-background",
            crop === "round"
              ? "-bottom-1 -right-1 h-8 w-8"
              : "bottom-2 right-2 h-8 w-8"
          )}
        >
          <Camera className="h-4 w-4" />
        </span>
      </button>

      {hint && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      {/* Hidden inputs */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Action sheet */}
      {showMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <p className="mb-3 text-center text-sm font-semibold text-foreground">
              {label}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                cameraRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2">
                <Camera className="h-5 w-5 text-accent" />
              </span>
              <span className="text-sm font-medium text-foreground">
                Take a photo
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                galleryRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2">
                <ImageIcon className="h-5 w-5 text-accent" />
              </span>
              <span className="text-sm font-medium text-foreground">
                Choose from gallery
              </span>
            </button>
            {hasImage && (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  clear();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-destructive/10"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </span>
                <span className="text-sm font-medium text-destructive">
                  Remove photo
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowMenu(false)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Round cropper */}
      {cropSrc && (
        <div className="fixed inset-0 z-[60] bg-background">
          {crop === "round" ? (
            <AvatarCropper
              imageSrc={cropSrc}
              onCancel={() => setCropSrc(null)}
              onConfirm={handleConfirmCropped}
            />
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCropSrc(null)}
                  className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground"
                  aria-label="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold text-foreground">
                  Review {label.toLowerCase()}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const file = new File([cropSrc], "image.jpg", {
                      type: "image/jpeg",
                    });
                    setCropSrc(null);
                    handleConfirmRaw(file);
                  }}
                  className="grid h-10 w-10 place-items-center rounded-xl text-accent"
                  aria-label="Use photo"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cropSrc}
                alt=""
                className="flex-1 object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}