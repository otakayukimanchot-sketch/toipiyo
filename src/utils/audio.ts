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

  const playTone = (freq: number, startTime: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, startTime);
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  const now = ctx.currentTime;
  playTone(659.25, now, 0.4); // E5
  playTone(783.99, now + 0.15, 0.4); // G5 

  return new Promise(resolve => setTimeout(resolve, 800));
}

export function cancelAudio() {
  const synth = window.speechSynthesis;
  if (synth) {
    synth.cancel();
  }
  
  if (audioCtx && audioCtx.state !== 'closed') {
    // We don't necessarily want to close it, just stop any future sound
  }
  
  shouldStopAudio = true;
  // Reset after a bit more delay to ensure all async loops have seen it
  setTimeout(() => {
    shouldStopAudio = false;
  }, 500);
}

export async function unlockAudio(): Promise<void> {
  const synth = window.speechSynthesis;
  
  // Unlock Web Audio API
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(err => console.error("AudioContext resume failed:", err));
  }

  // Unlock SpeechSynthesis
  if (synth) {
    // Safari/iOS fix: Must speak something non-empty to unlock
    const utterance = new SpeechSynthesisUtterance("Welcome");
    utterance.volume = 0.001; // Almost silent but not 0
    utterance.rate = 2;
    synth.speak(utterance);
    
    // Warm up voices
    synth.getVoices();
  }
}

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
      reject(new Error("Web Speech API not supported"));
      return;
    }

    const startSpeaking = () => {
      // Final check for cancellation
      if (shouldStopAudio) {
        resolve();
        return;
      }

      const voices = synth.getVoices();
      // Prepend dots/pauses to give Safari a moment to buffer
      const utterance = new SpeechSynthesisUtterance(". . " + text);
      
      // CRITICAL: Set language explicitly to avoid system fallback (e.g. Japanese voice reading English)
      utterance.lang = "en-US";
      
      const enVoices = voices.filter(v => v.lang.startsWith("en"));
      
      // Prioritize natural sounding premium voices over system/compact ones
      const targetVoices = enVoices.filter(v => 
        (v.lang.toLowerCase().includes("en-us") || 
         v.lang.toLowerCase().includes("en-gb") || 
         v.lang.toLowerCase().includes("en-au")) &&
        !v.name.toLowerCase().includes("compact") &&
        !v.name.toLowerCase().includes("low quality")
      );
      
      if (targetVoices.length > 0) {
        // Try to pick a non-default voice if possible, as sometimes defaults glitch on mobile
        utterance.voice = targetVoices.find(v => v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Enhanced")) || targetVoices[0];
      } else if (enVoices.length > 0) {
        utterance.voice = enVoices[0];
      }

      utterance.rate = 1.0; 
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e);
        resolve(); 
      };
      
      // Robust cancel/speak pattern for Mobile Safari
      synth.cancel();
      
      setTimeout(() => {
        if (!shouldStopAudio) {
          synth.speak(utterance);
        } else {
          resolve();
        }
      }, 100); // Increased delay for mobile stability
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
