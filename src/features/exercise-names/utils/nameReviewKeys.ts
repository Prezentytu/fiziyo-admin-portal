export type NameReviewKeyAction =
  | 'next'
  | 'previous'
  | 'done'
  | 'edit'
  | 'togglePillar'
  | 'variant'
  | 'keepName'
  | 'undo'
  | 'toggleSelect';

/**
 * Where the key went: a button or switch owns Enter (its own click), an open list, picker or dialog owns every key
 * (typeahead, arrows, Enter on an option). Without this a focused „Cofnij” or a family option saves the active row.
 */
export type NameReviewKeyFocus = 'none' | 'control' | 'popup';

export interface NameReviewKeyEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  inTextField: boolean;
  focus?: NameReviewKeyFocus;
}

const POPUP_SELECTOR = '[role="listbox"], [role="option"], [role="combobox"], [role="menu"], [role="menuitem"], [role="dialog"], [role="alertdialog"]';
const CONTROL_SELECTOR = 'button, a[href], summary, [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"]';

export function nameReviewKeyFocus(target: EventTarget | null): NameReviewKeyFocus {
  if (!(target instanceof Element)) return 'none';
  if (target.closest(POPUP_SELECTOR)) return 'popup';
  if (target.closest(CONTROL_SELECTOR)) return 'control';
  return 'none';
}

const REPEATABLE: ReadonlySet<NameReviewKeyAction> = new Set(['next', 'previous']);

const KEYS: Readonly<Record<string, NameReviewKeyAction>> = {
  j: 'next',
  ArrowDown: 'next',
  k: 'previous',
  ArrowUp: 'previous',
  Enter: 'done',
  e: 'edit',
  f: 'togglePillar',
  w: 'variant',
  n: 'keepName',
  u: 'undo',
  x: 'toggleSelect',
};

/** Inside a text field only Enter is a shortcut, so typing never triggers an action. */
export function nameReviewKeyAction(event: NameReviewKeyEvent): NameReviewKeyAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.focus === 'popup') {
    return null;
  }
  const action = event.inTextField ? (event.key === 'Enter' ? 'done' : null) : (KEYS[event.key] ?? null);
  if (!action || (event.repeat && !REPEATABLE.has(action))) {
    return null;
  }
  if (event.focus === 'control' && event.key === 'Enter') {
    return null;
  }
  return action;
}

export const NAME_REVIEW_KEY_HINTS: ReadonlyArray<{ keys: string; label: string }> = [
  { keys: 'j / k', label: 'następny / poprzedni' },
  { keys: 'Enter', label: 'Zrobione' },
  { keys: 'e', label: 'edytuj nazwę' },
  { keys: 'f', label: 'Filarowe' },
  { keys: 'w', label: 'wariant' },
  { keys: 'n', label: 'zostaw nazwę' },
  { keys: 'u', label: 'cofnij' },
  { keys: 'x', label: 'zaznacz' },
  { keys: 'Esc', label: 'wyjdź z pola' },
];
