let audioCtx: AudioContext | null = null;
let currentAudioSession = 0;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function startAudioSession(): number {
  currentAudioSession++;
  return currentAudioSession;
}

export function isAudioSessionActive(sessionId: number): boolean {
  return sessionId === currentAudioSession;
}

export async function playChime(sessionId?: number): Promise<void> {
  if (sessionId !== undefined && !isAudioSessionActive(sessionId)) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (e) {
    console.warn("AudioContext resume error:", e);
  }

  if (sessionId !== undefined && !isAudioSessionActive(sessionId)) return;

  const playChimeTone = (freq: number, startTime: number, duration: number) => {
    try {
      const oscillator = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Soft musical body
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, startTime);

      // Chime clarity overtone
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freq * 2.01, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.connect(gainNode);
      overtone.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      overtone.start(startTime);
      oscillator.stop(startTime + duration);
      overtone.stop(startTime + duration);
    } catch (e) {
      console.warn("Chime tone error:", e);
    }
  };

  const now = ctx.currentTime;
  const start = now + 0.05;

  playChimeTone(523.25, start, 0.5);        // C5
  playChimeTone(659.25, start + 0.12, 0.5); // E5
  playChimeTone(783.99, start + 0.24, 0.7); // G5 

  return new Promise(resolve => setTimeout(resolve, 800));
}

// Keep a reference to utterances to prevent garbage collection in Safari / WebKit
const utteranceCache = new Set<SpeechSynthesisUtterance>();

export function cancelAudio() {
  // Invalidate any active session immediately so ongoing loops exit
  currentAudioSession++;

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  if (synth) {
    try {
      synth.cancel();
    } catch (e) {
      console.warn("SpeechSynthesis cancel error:", e);
    }
  }

  // Clear cache to allow GC
  utteranceCache.clear();
}

export async function unlockAudio(): Promise<void> {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  if (synth) {
    try {
      if (synth.paused) {
        synth.resume();
      }
      // Populate voices cache early
      synth.getVoices();
    } catch (e) {
      console.warn("SpeechSynthesis unlock error:", e);
    }
  }

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(err => console.warn("AudioContext unlock resume failed:", err));
  }
}

export async function speak(
  text: string, 
  withChime: boolean = false, 
  sessionId?: number
): Promise<void> {
  if (sessionId !== undefined && !isAudioSessionActive(sessionId)) return;

  if (withChime) {
    await playChime(sessionId);
    if (sessionId !== undefined && !isAudioSessionActive(sessionId)) return;
  }

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  if (!synth) return;

  return new Promise((resolve) => {
    if (sessionId !== undefined && !isAudioSessionActive(sessionId)) {
      resolve();
      return;
    }

    const startSpeaking = () => {
      if (sessionId !== undefined && !isAudioSessionActive(sessionId)) {
        resolve();
        return;
      }

      try {
        if (synth.paused) {
          synth.resume();
        }

        const voices = synth.getVoices();
        const utterance = new SpeechSynthesisUtterance(text);

        utteranceCache.add(utterance);
        utterance.lang = "en-US";

        const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith("en"));
        const targetVoices = enVoices.filter(v =>
          (v.lang.toLowerCase().includes("en-us") ||
           v.lang.toLowerCase().includes("en-gb") ||
           v.lang.toLowerCase().includes("en-au")) &&
          !v.name.toLowerCase().includes("compact") &&
          !v.name.toLowerCase().includes("low quality")
        );

        if (targetVoices.length > 0) {
          utterance.voice = targetVoices.find(v =>
            v.name.includes("Samantha") ||
            v.name.includes("Google") ||
            v.name.includes("Natural") ||
            v.name.includes("Enhanced")
          ) || targetVoices[0];
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        let hasEnded = false;
        const finish = () => {
          if (hasEnded) return;
          hasEnded = true;
          utteranceCache.delete(utterance);
          resolve();
        };

        utterance.onend = finish;
        utterance.onerror = (e) => {
          console.warn("Utterance error or cancelled:", e);
          finish();
        };

        // Safety fallback timeout based on utterance length
        const wordCount = text.trim().split(/\s+/).length;
        const safetyTimeout = Math.max(5000, wordCount * 1200 + 3000);
        setTimeout(finish, safetyTimeout);

        synth.speak(utterance);
      } catch (err) {
        console.error("Failed to speak utterance:", err);
        resolve();
      }
    };

    if (synth.getVoices().length === 0) {
      const onVoicesChanged = () => {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        startSpeaking();
      };
      synth.addEventListener('voiceschanged', onVoicesChanged);
      setTimeout(onVoicesChanged, 250);
    } else {
      startSpeaking();
    }
  });
}

export async function speakMultiple(texts: string[], sessionId?: number): Promise<void> {
  for (const text of texts) {
    if (sessionId !== undefined && !isAudioSessionActive(sessionId)) break;
    await speak(text, false, sessionId);
    if (sessionId !== undefined && !isAudioSessionActive(sessionId)) break;
    await new Promise(r => setTimeout(r, 800));
  }
}
