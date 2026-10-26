import { afterEach, describe, expect, it, vi } from 'vitest';
import { pickChineseVoice, speakChinese, stopSpeaking } from './speech';

const v = (lang: string, name = lang, localService?: boolean) => ({ lang, name, localService });

describe('pickChineseVoice', () => {
  it('returns null when there is no Chinese voice', () => {
    expect(pickChineseVoice([v('en-US'), v('it-IT')])).toBeNull();
    expect(pickChineseVoice([])).toBeNull();
  });
  it('prefers zh-CN, including Android-style underscores', () => {
    expect(pickChineseVoice([v('zh-TW'), v('zh_CN', 'android'), v('en-US')])?.name).toBe('android');
  });
  it('falls back through zh-Hans, bare zh and zh-TW', () => {
    expect(pickChineseVoice([v('zh-TW'), v('zh-Hans-CN', 'hans')])?.name).toBe('hans');
    expect(pickChineseVoice([v('zh-TW'), v('zh', 'bare')])?.name).toBe('bare');
    expect(pickChineseVoice([v('zh-TW', 'tw')])?.name).toBe('tw');
  });
  it('never picks Cantonese', () => {
    expect(pickChineseVoice([v('zh-HK'), v('yue-HK')])).toBeNull();
  });
  it('prefers a device-local voice within the same tier (it works offline)', () => {
    expect(pickChineseVoice([v('zh-CN', 'network', false), v('zh-CN', 'local', true)])?.name).toBe('local');
    expect(pickChineseVoice([v('zh-CN', 'first'), v('zh-CN', 'second')])?.name).toBe('first');
  });
  it('still prefers a better language tier over a local voice of a worse one', () => {
    expect(pickChineseVoice([v('zh-TW', 'tw-local', true), v('zh-CN', 'cn-network', false)])?.name).toBe('cn-network');
  });
});

describe('speakChinese / stopSpeaking', () => {
  class FakeUtterance {
    onend: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    voice: unknown;
    lang = '';
    rate = 1;
    constructor(public text: string) {}
  }
  function setup() {
    const spoken: FakeUtterance[] = [];
    const synth = { cancel: vi.fn(), speak: vi.fn((u: FakeUtterance) => spoken.push(u)) };
    vi.stubGlobal('window', { speechSynthesis: synth });
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    return { synth, spoken };
  }
  const voice = { lang: 'zh-CN', name: 'x' } as SpeechSynthesisVoice;
  afterEach(() => vi.unstubAllGlobals());

  it('cancels what is playing, then speaks with the voice, its language and a slower rate', () => {
    const { synth, spoken } = setup();
    speakChinese('你好', voice);
    expect(synth.cancel).toHaveBeenCalledBefore(synth.speak);
    expect(spoken[0]).toMatchObject({ text: '你好', voice, lang: 'zh-CN', rate: 0.85 });
  });
  it('reports end and error for the current utterance only', () => {
    const { spoken } = setup();
    const first = { onEnd: vi.fn(), onError: vi.fn() };
    const second = { onEnd: vi.fn(), onError: vi.fn() };
    speakChinese('一', voice, first);
    speakChinese('二', voice, second);
    spoken[0].onerror?.({ error: 'interrupted' }); // late event from the utterance we replaced
    expect(first.onError).not.toHaveBeenCalled();
    expect(second.onError).not.toHaveBeenCalled();
    spoken[1].onend?.();
    expect(second.onEnd).toHaveBeenCalledOnce();
    speakChinese('三', voice, second);
    spoken[2].onerror?.({ error: 'network' });
    expect(second.onError).toHaveBeenCalledWith('network');
  });
  it('stopSpeaking cancels and silences late events', () => {
    const { synth, spoken } = setup();
    const h = { onEnd: vi.fn() };
    speakChinese('一', voice, h);
    synth.cancel.mockClear();
    stopSpeaking();
    expect(synth.cancel).toHaveBeenCalledOnce();
    spoken[0].onend?.();
    expect(h.onEnd).not.toHaveBeenCalled();
  });
});
