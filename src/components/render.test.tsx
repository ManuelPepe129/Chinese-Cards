import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { groupTags } from '../filter/filter';
import { FilterPanel } from './FilterPanel';
import { BrowseView } from './BrowseView';
import { SpeakButton } from './SpeakButton';
import { DEFAULT_OPTIONS, StudyView } from './StudyView';

const entry = (hanzi: string, ...tags: string[]) => ({ hanzi, pinyin: 'x', italian: ['y'], tags });
const noop = () => {};
// React's server renderer separates adjacent text nodes with <!-- --> markers.
const text = (html: string) => html.replace(/<!-- -->/g, '');

describe('render smoke tests', () => {
  it('FilterPanel shows count, pressed chips and missing tags', () => {
    const entries = [entry('a', 'hsk1', 'verbs'), entry('b', 'hsk1')];
    const html = text(
      renderToString(
      <FilterPanel
        groups={groupTags(entries, ['hsk1', 'hsk9'])}
        selected={['hsk1', 'hsk9']}
        match="all"
        matched={2}
        total={2}
        open={false}
        onToggleTag={noop}
        onMatch={noop}
        onClear={noop}
        onClose={noop}
      />,
      ),
    );
    expect(html).toContain('2 of 2');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-missing="true"');
    expect(html).toContain('Match all');
  });

  it('StudyView renders a card, or the empty slot when there is nothing to show', () => {
    const base = { kind: 'characters' as const, options: DEFAULT_OPTIONS, onOptionsChange: noop };
    expect(text(renderToString(<StudyView {...base} entries={[entry('你', 'hsk1')]} />))).toContain('1 / 1');
    expect(renderToString(<StudyView {...base} entries={[]} empty={<p>nothing here</p>} />)).toContain('nothing here');
  });
});

describe('modes', () => {
  it('BrowseView lists characters and sentences with tags and counts', () => {
    const html = text(
      renderToString(<BrowseView characters={[entry('你', 'hsk1'), entry('好', 'hsk1')]} sentences={[entry('你好', 'greetings')]} />),
    );
    expect(html).toContain('3 entries');
    expect(html).toContain('Characters');
    expect(html).toContain('Sentences');
    expect(html).toContain('greetings');
  });

  it('StudyView offers "Pinyin on front" only for sentences', () => {
    const base = { entries: [entry('你好')], options: DEFAULT_OPTIONS, onOptionsChange: noop };
    expect(renderToString(<StudyView {...base} kind="sentences" />)).toContain('Pinyin on front');
    expect(renderToString(<StudyView {...base} kind="characters" />)).not.toContain('Pinyin on front');
  });

  it('shows pinyin on the front when enabled', () => {
    const e = { ...entry('你好'), pinyin: 'nǐ hǎo' };
    const html = renderToString(<StudyView entries={[e]} kind="sentences" options={{ ...DEFAULT_OPTIONS, showPinyin: true }} onOptionsChange={noop} />);
    expect(html).toContain('front-pinyin');
  });
});

describe('SpeakButton', () => {
  it('describes what it will do, and offers stop while playing', () => {
    const base = { text: '你', failed: false, onSpeak: noop, onStop: noop };
    expect(renderToString(<SpeakButton {...base} speaking={false} />)).toContain('Play pronunciation of 你');
    const playing = renderToString(<SpeakButton {...base} speaking />);
    expect(playing).toContain('Stop audio');
    expect(playing).toContain('data-speaking="true"');
    expect(renderToString(<SpeakButton {...base} speaking={false} failed />)).toContain('Audio failed');
  });
  it('is not rendered by StudyView when the device has no voice (e.g. on the server)', () => {
    const html = renderToString(
      <StudyView kind="characters" options={DEFAULT_OPTIONS} onOptionsChange={noop} entries={[entry('你')]} />,
    );
    expect(html).not.toContain('class="speak"');
  });
});
