export async function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      reject(new Error("Web Speech API not supported"));
      return;
    }

    // Wait for voices to be loaded
    let voices = synth.getVoices();
    if (voices.length === 0) {
      synth.onvoiceschanged = () => {
        voices = synth.getVoices();
        startSpeaking();
      };
    } else {
      startSpeaking();
    }

    function startSpeaking() {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Filter for English voices
      const enVoices = voices.filter(v => v.lang.startsWith("en"));
      
      // Try to find US or UK voices
      const targetVoices = enVoices.filter(v => v.lang === "en-US" || v.lang === "en-GB");
      
      if (targetVoices.length > 0) {
        // Randomly pick one
        utterance.voice = targetVoices[Math.floor(Math.random() * targetVoices.length)];
      } else if (enVoices.length > 0) {
        utterance.voice = enVoices[0];
      }

      utterance.rate = 1.0; // Fixed speed
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);
      
      synth.speak(utterance);
    }
  });
}

export async function speakMultiple(texts: string[]): Promise<void> {
  for (const text of texts) {
    await speak(text);
    // Small pause between options (1 second)
    await new Promise(r => setTimeout(r, 1000));
  }
}
