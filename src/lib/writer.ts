import HanziWriter from 'hanzi-writer';
import { loadStrokeData } from './strokeData';

type Options = NonNullable<Parameters<typeof HanziWriter.create>[2]>;

export interface ManagedWriter {
  writer: HanziWriter;
  /** Stops any quiz or animation, removes the library's global listeners and empties the element. */
  dispose: () => void;
}

/**
 * Creates a Hanzi Writer that reads its data from the bundled stroke files (offline-safe).
 *
 * hanzi-writer registers `mouseup`/`touchend` listeners on `document` in its constructor and never
 * removes them (a TODO in its source). Creating a writer per card would leak a pair each time, so
 * the ones added while it is being constructed are recorded here and removed in `dispose`.
 */
export function createWriter(element: HTMLElement, char: string, options: Options): ManagedWriter {
  const added: [string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined][] = [];
  const original = document.addEventListener;
  document.addEventListener = function (this: Document, type: string, listener: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) {
    if (type === 'mouseup' || type === 'touchend') added.push([type, listener, opts]);
    return original.call(this, type, listener, opts);
  } as typeof document.addEventListener;

  let writer: HanziWriter;
  try {
    writer = HanziWriter.create(element, char, {
      charDataLoader: (c, onLoad, onError) => {
        void loadStrokeData(c).then((data) => (data ? onLoad(data) : onError('no stroke data')));
      },
      ...options,
    });
  } finally {
    // `delete` removes the temporary own property and so restores the prototype's method.
    delete (document as { addEventListener?: unknown }).addEventListener;
  }

  return {
    writer,
    dispose: () => {
      for (const [type, listener, opts] of added) document.removeEventListener(type, listener, opts);
      added.length = 0;
      writer.cancelQuiz();
      element.replaceChildren();
    },
  };
}

/** Writer colours follow the app theme (CSS variables), so dark mode works. */
export function readColors(el: Element) {
  const css = getComputedStyle(el);
  const get = (name: string) => css.getPropertyValue(name).trim();
  return {
    strokeColor: get('--ink'),
    outlineColor: get('--stroke-outline'),
    highlightColor: get('--accent'),
    drawingColor: get('--accent'),
  };
}
