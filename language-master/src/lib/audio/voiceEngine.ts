// src/lib/audio/voiceEngine.ts

let cachedVoices: SpeechSynthesisVoice[] = [];
let isInitialized = false;

/**
 * Initializes the voice engine by pre-fetching voices and attaching
 * an onvoiceschanged listener for browsers that load voices asynchronously.
 */
export function initVoiceEngine(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (isInitialized) return;
  isInitialized = true;

  const loadVoices = () => {
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        cachedVoices = voices;
      }
    } catch {
      // Ignored in environments where speechSynthesis is restricted
    }
  };

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// Auto-initialize on module evaluation if in browser
if (typeof window !== 'undefined') {
  initVoiceEngine();
}

/**
 * Score and rank voices for a given target language.
 * Highest score wins.
 */
function scoreVoice(voice: SpeechSynthesisVoice, targetLang: 'en-GB' | 'en-US' | 'ja-JP' | 'vi-VN' | 'ko-KR' | string): number {
  const name = voice.name || '';
  const lang = (voice.lang || '').toLowerCase().replace('_', '-');
  let score = 0;

  // Exact regional language match
  if (targetLang === 'en-GB') {
    // Strictly British English
    const isUkLang = lang === 'en-gb' || lang.startsWith('en-gb');
    const isUkName = /united kingdom|uk|britain|british|england/i.test(name);
    const isUsLang = lang === 'en-us' || lang.startsWith('en-us');
    const isUsName = /united states|us\b|american/i.test(name);

    if (isUsLang || isUsName) return -9999; // Disqualify US voices
    if (!isUkLang && !isUkName) return -9999; // Disqualify other regions

    score += 500;
  } else if (targetLang === 'en-US') {
    // Strictly American English
    const isUsLang = lang === 'en-us' || lang.startsWith('en-us');
    const isUsName = /united states|us\b|american/i.test(name);
    const isUkLang = lang === 'en-gb' || lang.startsWith('en-gb');
    const isUkName = /united kingdom|uk|britain|british|england/i.test(name);

    if (isUkLang || isUkName) return -9999; // Disqualify UK voices
    if (!isUsLang && !isUsName) return -9999; // Disqualify other regions

    score += 500;
  } else {
    // For other languages like ja-JP, vi-VN, ko-KR
    const prefix = targetLang.split('-')[0].toLowerCase();
    if (!lang.startsWith(prefix)) return -9999;
    score += 500;
  }

  // Bonus for Natural / Neural online voices (Edge & Chrome)
  if (/natural|neural|online \(natural\)/i.test(name)) {
    score += 1000;
  }

  // Bonus for Google cloud-rendered voices
  if (/google/i.test(name)) {
    score += 600;
  }

  // Top-tier voice names known for excellent pronunciation
  if (/sonia|ryan|libby|maisie|daniel|oliver|serena/i.test(name) && targetLang === 'en-GB') {
    score += 400;
  }
  if (/jenny|guy|aria|christopher|samantha|ava|andrew/i.test(name) && targetLang === 'en-US') {
    score += 400;
  }
  if (/nanami|keita|kyoko|otoya/i.test(name) && targetLang === 'ja-JP') {
    score += 400;
  }
  if (/hoaimy|namminh/i.test(name) && targetLang === 'vi-VN') {
    score += 400;
  }

  // Penalty for legacy / robotic / desktop voices
  if (/desktop/i.test(name)) {
    score -= 200;
  }
  if (/espeak/i.test(name)) {
    score -= 400;
  }

  return score;
}

/**
 * Returns the best available voice for a target accent/language.
 */
export function getBestVoice(targetLang: 'en-GB' | 'en-US' | 'ja-JP' | 'vi-VN' | 'ko-KR' | string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  let voices = cachedVoices;
  if (!voices || voices.length === 0) {
    try {
      voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) cachedVoices = voices;
    } catch {
      return null;
    }
  }

  if (!voices || voices.length === 0) return null;

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = -1;

  for (const v of voices) {
    const s = scoreVoice(v, targetLang);
    if (s > bestScore) {
      bestScore = s;
      bestVoice = v;
    }
  }

  return bestVoice;
}

export interface SpeakOptions {
  lang?: 'en-GB' | 'en-US' | 'ja-JP' | 'vi-VN' | 'ko-KR' | string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * Speaks text using the highest-quality voice matching the requested language.
 */
export function speakWithVoiceEngine(text: string, options?: SpeakOptions): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const cleanText = text ? text.trim() : '';
  if (!cleanText) return;

  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore cancel errors
  }

  const u = new SpeechSynthesisUtterance(cleanText);
  const targetLang = options?.lang || 'en-US';

  const bestVoice = getBestVoice(targetLang);
  if (bestVoice) {
    u.voice = bestVoice;
    u.lang = bestVoice.lang;
  } else {
    u.lang = targetLang;
  }

  u.rate = options?.rate ?? 0.9;
  if (options?.pitch !== undefined) u.pitch = options.pitch;
  if (options?.volume !== undefined) u.volume = options.volume;

  if (options?.onEnd) u.onend = options.onEnd;
  if (options?.onError) u.onerror = options.onError;

  window.speechSynthesis.speak(u);
}
