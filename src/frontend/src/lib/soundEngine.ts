/**
 * soundEngine.ts — Web Audio API based sound engine for B³ Auction.
 * All sounds are generated programmatically (no external audio files needed).
 * localStorage key: 'b3_sound_enabled' (default: true)
 */

const SOUND_KEY = "b3_sound_enabled";

export function isSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_KEY);
    if (val === null) return true; // default on
    return val === "true";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, String(enabled));
    // Dispatch storage event for cross-component reactivity
    window.dispatchEvent(new StorageEvent("storage", { key: SOUND_KEY }));
  } catch {
    // ignore
  }
}

function createAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    return new AudioCtx();
  } catch {
    return null;
  }
}

/** Soft click: 400Hz sine, 80ms, volume 0.3 — plays on each new bid */
export function playBidSound(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        /**/
      }
    };
  } catch {
    // never crash the app
  }
}

/** Stadium chime: C5→E5→G5 sequential tones, 150ms each, volume 0.4 */
export function playChimeSound(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    // C5 = 523.25Hz, E5 = 659.25Hz, G5 = 783.99Hz
    const frequencies = [523.25, 659.25, 783.99];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const startTime = ctx.currentTime + i * 0.15;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
      if (i === frequencies.length - 1) {
        osc.onended = () => {
          try {
            ctx.close();
          } catch {
            /**/
          }
        };
      }
    });
  } catch {
    // never crash
  }
}

/** Countdown beep: 600Hz, 120ms, volume 0.5 — for last 5 seconds */
export function playCountdownBeep(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        /**/
      }
    };
  } catch {
    // never crash
  }
}

/** Gavel sound: low thud (80Hz) fading, 600ms, volume 0.6 — player sold */
export function playSoldSound(): void {
  if (!isSoundEnabled()) return;
  try {
    const ctx = createAudioContext();
    if (!ctx) return;
    // Low thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
    // Add a high click component
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.type = "sine";
    click.frequency.setValueAtTime(800, ctx.currentTime);
    clickGain.gain.setValueAtTime(0.3, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    click.start(ctx.currentTime);
    click.stop(ctx.currentTime + 0.05);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {
        /**/
      }
    };
  } catch {
    // never crash
  }
}
