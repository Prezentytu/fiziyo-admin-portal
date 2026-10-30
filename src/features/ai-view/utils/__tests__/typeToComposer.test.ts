import { describe, expect, it } from 'vitest';

import { shouldTypeIntoComposer } from '../typeToComposer';

function keydown(key: string, target: Element, modifiers: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}

function mount(html: string): Element {
  document.body.innerHTML = html;
  return document.querySelector('[data-focus]') ?? document.body;
}

describe('shouldTypeIntoComposer', () => {
  it('sends a letter typed on the page or on a card button to the composer', () => {
    expect(shouldTypeIntoComposer(keydown('a', document.body))).toBe(true);
    expect(shouldTypeIntoComposer(keydown('k', mount('<button data-focus>Zatwierdź</button>')))).toBe(true);
  });

  it('leaves shortcuts, named keys and space alone', () => {
    expect(shouldTypeIntoComposer(keydown('k', document.body, { metaKey: true }))).toBe(false);
    expect(shouldTypeIntoComposer(keydown('Enter', document.body))).toBe(false);
    expect(shouldTypeIntoComposer(keydown(' ', mount('<button data-focus>Zatwierdź</button>')))).toBe(false);
  });

  it('leaves keys on text fields and on card controls that are not native inputs', () => {
    expect(shouldTypeIntoComposer(keydown('a', mount('<input data-focus />')))).toBe(false);
    expect(shouldTypeIntoComposer(keydown('a', mount('<button role="checkbox" data-focus></button>')))).toBe(false);
    expect(
      shouldTypeIntoComposer(
        keydown('a', mount('<div role="radiogroup"><button role="radio" data-focus></button></div>'))
      )
    ).toBe(false);
    expect(
      shouldTypeIntoComposer(keydown('a', mount('<div role="listbox"><div role="option" data-focus></div></div>')))
    ).toBe(false);
    expect(shouldTypeIntoComposer(keydown('a', mount('<button role="combobox" data-focus></button>')))).toBe(false);
  });
});
