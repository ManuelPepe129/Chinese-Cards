import { useCallback, useEffect, useState } from 'react';
import { isSpeechSupported, pickChineseVoice, speakChinese, stopSpeaking } from './speech';

/** Text-to-speech with a Mandarin voice. `available` is false when the device has none. */
export function useSpeech() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSpeechSupported()) return;
    const synth = window.speechSynthesis;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      const found = pickChineseVoice(synth.getVoices());
      setVoice(found);
      // Voices load late, and some browsers never fire `voiceschanged`: poll for a few seconds.
      if (!found && tries++ < 6) timer = setTimeout(update, 500);
    };
    update();
    synth.addEventListener?.('voiceschanged', update);
    return () => {
      clearTimeout(timer);
      synth.removeEventListener?.('voiceschanged', update);
      stopSpeaking();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voice) return;
      setFailed(false);
      setSpeaking(true);
      speakChinese(text, voice, {
        onEnd: () => setSpeaking(false),
        onError: (error) => {
          setSpeaking(false);
          // "interrupted" / "canceled" just mean we stopped it ourselves.
          if (error !== 'interrupted' && error !== 'canceled') setFailed(true);
        },
      });
    },
    [voice],
  );

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);

  return { available: voice !== null, speaking, failed, speak, stop };
}
