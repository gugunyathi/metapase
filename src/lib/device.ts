let hapticsEnabled = true;

export const setHapticsEnabled = (enabled: boolean): void => {
  hapticsEnabled = enabled;
};

export const buzz = (pattern: number | number[]): void => {
  if (!hapticsEnabled) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    return;
  }
};

export const getSpeech = (): SpeechSynthesis | null => {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    return window.speechSynthesis ?? null;
  } catch {
    return null;
  }
};

export const speakText = (text: string): void => {
  const speech = getSpeech();
  if (!speech || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    speech.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-ZA';
    speech.speak(utterance);
  } catch {
    return;
  }
};

export const stopSpeech = (): void => {
  try {
    getSpeech()?.cancel();
  } catch {
    return;
  }
};

export const timeoutSignal = (ms: number): AbortSignal | undefined => {
  try {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    }
  } catch {
    return undefined;
  }
  return undefined;
};
