/**
 * In-app alert sounds generated with the Web Audio API (no asset files), so a
 * driver hears a short chime the instant a new ride request lands — even when
 * the tab is in the background (AudioContext keeps running until suspended).
 */

let ctx: AudioContext | null = null;
let lastPlayedAt = 0;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!("AudioContext" in window) && !("webkitAudioContext" in window)) return null;
  try {
    if (!ctx) {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  startAt: number,
  freq: number,
  duration: number,
  volume: number
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ac.currentTime + startAt);
  gain.gain.setValueAtTime(0.0001, ac.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(volume, ac.currentTime + startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ac.currentTime + startAt + duration
  );
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(ac.currentTime + startAt);
  osc.stop(ac.currentTime + startAt + duration + 0.02);
}

/** Two ascending pings — the classic "you've got a ride" chime. */
export function playRequestChime() {
  const now = Date.now();
  // Throttle: never stack more than one chime per 1.5s of rapid fire requests.
  if (now - lastPlayedAt < 1500) return;
  lastPlayedAt = now;

  const ac = getContext();
  if (!ac) return;
  tone(ac, 0, 880, 0.16, 0.16);
  tone(ac, 0.14, 1320, 0.24, 0.14);

  // Haptic buzz on supported devices (mobile).
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(60);
    } catch {
      /* unsupported */
    }
  }
}

/** A deeper, single blip for less-urgent events (e.g. ride accepted). */
export function playConfirmBlip() {
  const ac = getContext();
  if (!ac) return;
  tone(ac, 0, 660, 0.14, 0.12);
}
