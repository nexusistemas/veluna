const SOUND_MUTED_KEY = 'veluna_sound_muted';

type AudioContextCtor = typeof AudioContext;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_MUTED_KEY, muted ? 'true' : 'false');
  } catch {
    // Ignora falha de armazenamento em modo privado
  }
}

function scheduleTone(ctx: AudioContext, freq: number, start: number, duration: number, peakGain: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playNewOrderChime(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  scheduleTone(ctx, 880, now, 0.18, 0.18);
  scheduleTone(ctx, 1174, now + 0.16, 0.28, 0.2);
  window.setTimeout(() => {
    void ctx.close().catch(() => {});
  }, 650);
}

export function playScanBeep(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  scheduleTone(ctx, 1320, ctx.currentTime, 0.09, 0.15);
  window.setTimeout(() => {
    void ctx.close().catch(() => {});
  }, 200);
}
