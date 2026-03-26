/** Web Speech API wrapper for character TTS. SSR-safe. */

export function isSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function cancelSpeech(): void {
  if (!isSpeechAvailable()) return;
  window.speechSynthesis.cancel();
}

/**
 * Speak a character using TTS.
 * @param text  The character or word to speak
 * @param locale  'ja-JP' for hiragana/katakana, 'en-US' for alphabet
 */
export function speakChar(text: string, locale: 'ja-JP' | 'en-US'): void {
  if (!isSpeechAvailable()) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = locale;
  utter.rate = 0.85;
  utter.pitch = 1.1;
  utter.volume = 1;

  // Try to pick a voice matching the locale
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const match =
      voices.find((v) => v.lang === locale) ??
      voices.find((v) => v.lang.startsWith(locale.split('-')[0]));
    if (match) utter.voice = match;
  }

  // Voices may not be loaded yet; retry after voiceschanged fires once
  if (voices.length === 0) {
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      const loaded = window.speechSynthesis.getVoices();
      const match =
        loaded.find((v) => v.lang === locale) ??
        loaded.find((v) => v.lang.startsWith(locale.split('-')[0]));
      if (match) utter.voice = match;
      window.speechSynthesis.speak(utter);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return;
  }

  window.speechSynthesis.speak(utter);
}
