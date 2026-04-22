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
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  if (synth) {
    const utterance = new SpeechSynthesisUtterance("");
    utterance.volume = 0;
    synth.speak(utterance);
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

    // Cancel any ongoing speech
    synth.cancel();

    setTimeout(() => {
      if (shouldStopAudio) {
        resolve();
        return;
      }

      let voices = synth.getVoices();
      
      const startSpeaking = () => {
        // Prepend a small delay using punctuation to avoid clipping the start
        const utterance = new SpeechSynthesisUtterance(", , " + text);
        
        // Filter for English voices
        const enVoices = voices.filter(v => v.lang.startsWith("en"));
        
        // Try to find US or UK voices
        const targetVoices = enVoices.filter(v => v.lang.toLowerCase().includes("en-us") || v.lang.toLowerCase().includes("en-gb"));
        
        if (targetVoices.length > 0) {
          // Randomly pick one
          utterance.voice = targetVoices[Math.floor(Math.random() * targetVoices.length)];
        } else if (enVoices.length > 0) {
          utterance.voice = enVoices[0];
        }

        utterance.rate = 1.0; 
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
          console.error("SpeechSynthesis error:", e);
          resolve(); // Resolve anyway to avoid hanging
        };
        
        synth.speak(utterance);
      };

      if (voices.length === 0) {
        // Fallback for browsers where getVoices is async
        const voiceHandler = () => {
          voices = synth.getVoices();
          if (voices.length > 0) {
            synth.removeEventListener('voiceschanged', voiceHandler);
            startSpeaking();
          }
        };
        synth.addEventListener('voiceschanged', voiceHandler);
        
        // Timeout if voices never load
        setTimeout(() => {
          synth.removeEventListener('voiceschanged', voiceHandler);
          if (voices.length === 0) startSpeaking(); 
        }, 1000);
      } else {
        startSpeaking();
      }
    }, 250); // Increased delay to ensure cancellation and readiness
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
