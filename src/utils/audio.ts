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
    synth.resume(); // Ensure it's not paused
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
    // Safari/iOS fix: Voice synthesis often needs a 'kickstart'
    const utterance = new SpeechSynthesisUtterance(" "); 
    utterance.volume = 0.001; 
    utterance.rate = 10.0; 
    
    synth.speak(utterance);
    
    // Explicitly call getVoices to trigger internal loading
    synth.getVoices();
  }
}

// Keep a reference to utterances to prevent garbage collection in Safari
const utteranceCache = new Set<SpeechSynthesisUtterance>();

export async function speak(text: string, withChime: boolean = false): Promise<void> {
  if (withChime && !shouldStopAudio) {
    await playChime();
  }

  if (shouldStopAudio) return;

  const synth = window.speechSynthesis;
  if (!synth) return;

  return new Promise((resolve) => {
    const startSpeaking = () => {
      const voices = synth.getVoices();
      const utterance = new SpeechSynthesisUtterance(text);
      
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
      }

      utterance.rate = 1.0; 
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const cleanup = () => {
        utteranceCache.delete(utterance);
        resolve();
      };

      utterance.onend = cleanup;
      utterance.onerror = cleanup;
      setTimeout(cleanup, 15000);

      if (synth.paused) synth.resume();
      synth.speak(utterance);
    };

    if (synth.getVoices().length === 0) {
      const handler = () => {
        synth.removeEventListener('voiceschanged', handler);
        startSpeaking();
      };
      synth.addEventListener('voiceschanged', handler);
      setTimeout(handler, 1000); // 1s fallback
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
