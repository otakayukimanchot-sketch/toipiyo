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
  
  // We don't close AudioContext but we ensure shouldStopAudio is handled
  shouldStopAudio = true;
  // Reset after a bit more delay to ensure all async loops have seen it
  setTimeout(() => {
    shouldStopAudio = false;
  }, 500);
}

export async function unlockAudio(): Promise<void> {
  const synth = window.speechSynthesis;
  
  // Unlock Web Audio API by playing a tiny bit of silence
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(err => console.error("AudioContext resume failed:", err));
  }
  
  // Create a tiny silent buffer and play it to truly unlock audio output
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  // Unlock SpeechSynthesis
  if (synth) {
    // Safari/iOS fix: Must speak something non-empty to unlock
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 0;
    synth.speak(utterance);
    
    // Warm up voices
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
      reject(new Error("Web Speech API not supported"));
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
      
      utterance.onend = () => {
        utteranceCache.delete(utterance);
        resolve();
      };
      
      utterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e);
        utteranceCache.delete(utterance);
        resolve(); 
      };
      
      // Safari/iOS fix: Multiple calls to speak() can fail if not preceded by cancel()
      // but if we are already speaking, cancel() might break the gesture.
      // We use a shorter timeout or immediate call for better Safari stability.
      if (synth.speaking) {
        synth.cancel();
      }
      
      // Reduced delay to keep user gesture context active
      const delay = (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) ? 20 : 50;
      
      setTimeout(() => {
        if (!shouldStopAudio) {
          synth.speak(utterance);
          
          // Safari hack: If it doesn't start speaking within 100ms, try a resume
          setTimeout(() => {
            if (!synth.speaking && !shouldStopAudio) {
              synth.resume();
            }
          }, 100);
        } else {
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
