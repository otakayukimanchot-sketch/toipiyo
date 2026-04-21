let shouldStopAudio = false;

export function cancelAudio() {
  const synth = window.speechSynthesis;
  if (synth) {
    synth.cancel();
  }
  
  shouldStopAudio = true;
  // Reset after a bit more delay to ensure all async loops have seen it
  setTimeout(() => {
    shouldStopAudio = false;
  }, 500);
}

export async function unlockAudio(): Promise<void> {
  const synth = window.speechSynthesis;
  if (synth) {
    const utterance = new SpeechSynthesisUtterance("");
    utterance.volume = 0;
    synth.speak(utterance);
  }
}

export async function speak(text: string): Promise<void> {
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
