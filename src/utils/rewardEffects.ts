interface RewardCueOptions {
  xpEarned: number;
  leveledUp?: boolean;
  questCompleted?: boolean;
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    try {
      audioContext = new Ctx();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

function toneAt(ctx: AudioContext, frequency: number, delaySeconds: number, durationSeconds: number, gain: number): void {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = frequency;
  gainNode.gain.value = 0;

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  const startAt = ctx.currentTime + delaySeconds;
  const endAt = startAt + durationSeconds;
  gainNode.gain.setValueAtTime(0, startAt);
  gainNode.gain.linearRampToValueAtTime(gain, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

  osc.start(startAt);
  osc.stop(endAt + 0.01);
}

function playRewardTones(options: RewardCueOptions): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  const strength = Math.max(1, Math.min(3, Math.round(options.xpEarned / 110) + 1));
  const base = options.leveledUp ? 320 : options.questCompleted ? 280 : 240;

  for (let i = 0; i < strength; i += 1) {
    toneAt(ctx, base + i * 70, i * 0.07, 0.1, 0.06);
  }

  if (options.questCompleted || options.leveledUp) {
    toneAt(ctx, base + 260, 0.24, 0.18, 0.08);
  }
}

export function triggerRewardCue(options: RewardCueOptions): void {
  const hasBigWin = Boolean(options.questCompleted || options.leveledUp);
  if (options.hapticsEnabled !== false) {
    if (hasBigWin) {
      vibrate([35, 22, 35]);
    } else {
      vibrate(24);
    }
  }

  if (options.soundEnabled !== false) {
    playRewardTones(options);
  }
}