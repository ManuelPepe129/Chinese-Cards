import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnswerButtons, ReviewCounts, ReviewView } from './ReviewView';

const noop = () => {};
const text = (html: string) => html.replace(/<!-- -->/g, '');

describe('Review mode pieces', () => {
  it('AnswerButtons shows the four answers with when the card would return', () => {
    const html = text(
      renderToString(<AnswerButtons labels={{ again: '1m', hard: '6m', good: '10m', easy: '4d' }} onGrade={noop} />),
    );
    for (const word of ['Again', 'Hard', 'Good', 'Easy', '1m', '6m', '10m', '4d']) expect(html).toContain(word);
    expect(html.match(/class="grade"/g)).toHaveLength(4);
  });
  it('ReviewCounts highlights where the current card comes from', () => {
    const html = text(renderToString(<ReviewCounts counts={{ new: 8, learning: 2, review: 14 }} kind="learning" />));
    expect(html).toContain('New <b>8</b>');
    expect(html).toContain('Due <b>14</b>');
    expect(html.match(/data-active="true"/g)).toHaveLength(1);
  });
  it('ReviewView renders (on the server it is still loading its saved progress)', () => {
    const html = renderToString(<ReviewView items={[{ key: 'character:你:hanzi-italian', entry: { hanzi: '你', pinyin: 'nǐ', italian: ['tu'], tags: [] } }]} />);
    expect(html).toContain('Loading your progress');
  });
});
