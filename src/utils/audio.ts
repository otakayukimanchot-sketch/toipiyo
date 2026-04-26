let shouldStopAudio = false;
let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export async function playChime(): Promise<void> {
  const ctx = getAudioContext();
  
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const playChimeTone = (freq: number, startTime: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Use triangle for a softer, more musical body
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(freq, startTime);

    // Add a sine overtone for that 'chime' clarity
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * 2.01, startTime); // Slightly off for thickness

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gainNode);
    overtone.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    overtone.start(startTime);
    oscillator.stop(startTime + duration);
    overtone.stop(startTime + duration);
  };

  const now = ctx.currentTime;
  const start = now + 0.05;
  
  // A simple pleasant chime sequence (Arpeggio)
  playChimeTone(523.25, start, 0.6);        // C5
  playChimeTone(659.25, start + 0.12, 0.6); // E5
  playChimeTone(783.99, start + 0.24, 0.8); // G5 

  return new Promise(resolve => setTimeout(resolve, 1000));
}

export function cancelAudio() {
  const synth = window.speechSynthesis;
  if (synth) {
    synth.cancel();
  }
  
  // Clear the cache to allow GC
  utteranceCache.clear();
  
  // Set flag to stop current loops
  shouldStopAudio = true;
  // Reset flag after delay
  setTimeout(() => {
    shouldStopAudio = false;
  }, 1000);
}

export async function unlockAudio(): Promise<void> {
  const synth = window.speechSynthesis;
  if (synth) {
    synth.cancel(); 
  }
  
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(err => console.error("AudioContext resume failed:", err));
  }
  
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  if (synth) {
    const utterance = new SpeechSynthesisUtterance("a"); 
    utterance.volume = 0.01; // Tiny volume instead of 0 for some browser compatibility
    utterance.rate = 10.0; // Extremely fast
    
    setTimeout(() => {
      synth.cancel();
    }, 300);

    synth.speak(utterance);
    synth.getVoices();
  }
}

// Keep a reference to utterances to prevent garbage collection in Safari
const utteranceCache = new Set<SpeechSynthesisUtterance>();

export async function speak(text: string, withChime: boolean = false): Promise<void> {
  if (withChime && !shouldStopAudio) {
    await playChime();
  }

  return new Promise((resolve, reject) => {
    if (shouldStopAudio) {
      resolve();
      return;
    }

    const synth = window.speechSynthesis;
    if (!synth) {
      resolve(); // Don't hang if no synth
      return;
    }

    const startSpeaking = () => {
      // Final check for cancellation
      if (shouldStopAudio) {
        resolve();
        return;
      }

      // Safari Fix: Resume if paused (sometimes gets stuck)
      if (synth.paused) {
        synth.resume();
      }

      const voices = synth.getVoices();
      // Use the text directly to avoid reading punctuation aloud
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Prevent GC on Safari
      utteranceCache.add(utterance);
      
      utterance.lang = "en-US";
      
      const enVoices = voices.filter(v => v.lang.startsWith("en"));
      const targetVoices = enVoices.filter(v => 
        (v.lang.toLowerCase().includes("en-us") || 
         v.lang.toLowerCase().includes("en-gb") || 
         v.lang.toLowerCase().includes("en-au")) &&
        !v.name.toLowerCase().includes("compact") &&
        !v.name.toLowerCase().includes("low quality")
      );
      
      if (targetVoices.length > 0) {
        utterance.voice = targetVoices.find(v => v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Enhanced")) || targetVoices[0];
      } else if (enVoices.length > 0) {
        utterance.voice = enVoices[0];
      }

      utterance.rate = 1.0; 
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const utteranceTimeout = setTimeout(() => {
        console.warn("SpeechSynthesis timeout - forcing resolve");
        utteranceCache.delete(utterance);
        resolve();
      }, 20000); // 20s absolute limit for any single utterance

      utterance.onend = () => {
        clearTimeout(utteranceTimeout);
        utteranceCache.delete(utterance);
        resolve();
      };
      
      utterance.onerror = (e) => {
        clearTimeout(utteranceTimeout);
        console.error("SpeechSynthesis error:", e);
        utteranceCache.delete(utterance);
        resolve(); 
      };
      
      // Reduced delay to keep user gesture context active
      const delay = (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) ? 20 : 50;
      
      setTimeout(() => {
        if (!shouldStopAudio) {
          // If already speaking, it might be stuck or queued.
          // For sequential speak(), we rely on browser queue or our manual await.
          // In Safari, if we don't cancel, it might hang. But if we do cancel, we lose queue.
          // Since we use manual async queue (awaiting each speak), we can call cancel once per speak
          // to ensure it starts immediately.
          if (navigator.userAgent.includes('Safari')) {
             synth.cancel(); 
          }
          
          synth.speak(utterance);
          
          // Safari hack: If it doesn't start speaking within 100ms, try a resume
          setTimeout(() => {
            if (!synth.speaking && !shouldStopAudio) {
              synth.resume();
            }
          }, 100);
        } else {
          clearTimeout(utteranceTimeout);
          utteranceCache.delete(utterance);
          resolve();
        }
      }, delay);
    };

    // Wait for voices if needed (common in Chrome but also Safari)
    if (synth.getVoices().length === 0) {
      const voiceHandler = () => {
        if (synth.getVoices().length > 0) {
          synth.removeEventListener('voiceschanged', voiceHandler);
          startSpeaking();
        }
      };
      synth.addEventListener('voiceschanged', voiceHandler);
      setTimeout(() => {
        synth.removeEventListener('voiceschanged', voiceHandler);
        startSpeaking();
      }, 500);
    } else {
      startSpeaking();
    }
  });
}

export async function speakMultiple(texts: string[]): Promise<void> {
  for (const text of texts) {
    if (shouldStopAudio) break;
    await speak(text);
    if (shouldStopAudio) break;
    // Small pause between options (1 second)
    await new Promise(r => setTimeout(r, 1000));
  }
}
