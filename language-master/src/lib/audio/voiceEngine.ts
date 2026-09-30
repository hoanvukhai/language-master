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
  if (targetLang === 'en-GB' || targetLang === 'en-US' || targetLang.startsWith('en')) {
    const isEnglish = lang.startsWith('en') || /english/i.test(name);
    if (!isEnglish) return -9999; // Disqualify non-English voices (e.g. Vietnamese, Japanese)

    if (targetLang === 'en-GB') {
      const isUk = lang === 'en-gb' || lang.startsWith('en-gb') || /united kingdom|uk\b|britain|british|england/i.test(name);
      if (isUk) {
        score += 800;
      } else {
        // Fallback to other English voices (US, AU, etc.) with lower score so we never get null
        score += 100;
      }
    } else {
      const isUs = lang === 'en-us' || lang.startsWith('en-us') || /united states|us\b|american/i.test(name);
      if (isUs) {
        score += 800;
      } else {
        // Fallback to other English voices (UK, AU, etc.) with lower score so we never get null
        score += 100;
      }
    }
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

  // Robust safety fallback: If target is English but bestVoice is null,
  // pick ANY voice that speaks English to ensure Vietnamese TTS never reads English words!
  if (!bestVoice && targetLang.startsWith('en')) {
    bestVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith('en')) ||
                voices.find(v => /english/i.test(v.name)) || null;
  }

  if (!bestVoice && targetLang.startsWith('ja')) {
    bestVoice = voices.find(v => (v.lang || '').toLowerCase().startsWith('ja')) ||
                voices.find(v => /japanese/i.test(v.name)) || null;
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

  if (!cachedVoices || cachedVoices.length === 0) {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) cachedVoices = v;
    } catch {}
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
