"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ZoomIn, ZoomOut, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCroppedImageBlob } from "@/lib/crop-image";

export function AvatarCropper({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCropArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!cropArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, cropArea);
      onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onCancel}
          className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-foreground">
          Position your photo
        </p>
        <button
          onClick={handleConfirm}
          disabled={processing}
          className="grid h-10 w-10 place-items-center rounded-xl text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
          aria-label="Confirm"
        >
          <Check className="h-5 w-5" />
        </button>
      </div>

      {/* Crop area — circular, matches the round avatar */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Zoom controls + confirm */}
      <div className="space-y-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Drag to reposition · Pinch or slide to zoom
        </p>
        <Button
          size="lg"
          fullWidth
          loading={processing}
          onClick={handleConfirm}
        >
          {processing ? "Saving…" : "Use this photo"}
        </Button>
      </div>
    </div>
  );
}
