// Controls that take keys themselves; a Radix checkbox or radio is a button, not an input.
const KEY_TAKING_TARGETS = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="dialog"]',
  '[role="menu"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="listbox"]',
  '[role="option"]',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="tab"]',
].join(', ');

/** A printable key typed outside a control lands in the composer, as in Claude; space still presses the focused button. */
export function shouldTypeIntoComposer(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.key.length !== 1 || event.key === ' ') return false;
  const target = event.target instanceof Element ? event.target : null;
  return !target?.closest(KEY_TAKING_TARGETS);
}
