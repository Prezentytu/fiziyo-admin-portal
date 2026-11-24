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

export interface NameReviewKeyEvent {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  inTextField: boolean;
}

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
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  if (event.inTextField) {
    return event.key === 'Enter' ? 'done' : null;
  }
  return KEYS[event.key] ?? null;
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
