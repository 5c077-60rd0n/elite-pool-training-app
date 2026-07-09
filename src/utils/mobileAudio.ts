let sharedAudioContext: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export function getSharedAudioContext(): AudioContext | null {
  const AudioCtx = getAudioContextCtor();
  if (!AudioCtx) return null;
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new AudioCtx();
    } catch {
      return null;
    }
  }
  return sharedAudioContext;
}

export async function unlockAppAudio(): Promise<void> {
  if (typeof window === 'undefined') return;

  const ctx = getSharedAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // Ignore; some browsers keep audio suspended until another gesture.
    }
  }

  if ('speechSynthesis' in window) {
    try {
      // Trigger voice list hydration for mobile Safari/Chrome.
      window.speechSynthesis.getVoices();
    } catch {
      // Ignore unsupported speech synthesis behavior.
    }
  }

  audioUnlocked = true;
}

export function installAudioUnlockListeners(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (audioUnlocked) return () => undefined;

  const onFirstGesture = () => {
    void unlockAppAudio();
  };

  window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true, passive: true });
  window.addEventListener('keydown', onFirstGesture, { once: true });

  return () => {
    window.removeEventListener('pointerdown', onFirstGesture);
    window.removeEventListener('touchstart', onFirstGesture);
    window.removeEventListener('keydown', onFirstGesture);
  };
}
