export interface VoiceLike {
  lang: string;
  /** True for voices installed on the device (they also work offline). */
  localService?: boolean;
}

const norm = (lang: string) => lang.replace(/_/g, '-').toLowerCase();

/**
 * Best Mandarin voice, or null. Cantonese (zh-HK, yue) is never chosen.
 * Order: zh-CN, zh-Hans, bare zh, zh-TW. Within the same tier a device-local voice wins,
 * because network voices fail offline.
 */
export function pickChineseVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const tiers: ((l: string) => boolean)[] = [
    (l) => l === 'zh-cn' || l === 'cmn-cn' || l === 'cmn-hans-cn',
    (l) => l.startsWith('zh-hans') || l.startsWith('cmn-hans'),
    (l) => l === 'zh' || l === 'cmn',
    (l) => l === 'zh-tw' || l === 'cmn-tw' || l.startsWith('zh-hant-tw'),
  ];
  for (const inTier of tiers) {
    const matches = voices.filter((v) => inTier(norm(v.lang)));
    if (matches.length > 0) return matches.find((v) => v.localService) ?? matches[0];
  }
  return null;
}

export const isSpeechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export interface SpeakHandlers {
  onEnd?: () => void;
  /** `error` is the SpeechSynthesisErrorEvent code, e.g. "network" or "synthesis-failed". */
  onError?: (error: string) => void;
}

// The latest utterance. Also keeps a reference to it: Chrome can garbage-collect a playing
// utterance and then never fire `end`. Events from older, interrupted utterances are ignored.
let current: SpeechSynthesisUtterance | null = null;

export function speakChinese(text: string, voice: SpeechSynthesisVoice, handlers: SpeakHandlers = {}): void {
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.85; // a little slower than natural speech, for learners
  u.onend = () => {
    if (current !== u) return;
    current = null;
    handlers.onEnd?.();
  };
  u.onerror = (e) => {
    if (current !== u) return;
    current = null;
    handlers.onError?.(e.error);
  };
  current = u;
  synth.speak(u);
}

export function stopSpeaking(): void {
  current = null;
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
