import { clearStoredConversations } from '@/features/ai-view/utils/conversationStore';

/**
 * localStorage keys holding clinic data or one user's organization choice.
 * The next person at the same computer must not inherit them.
 */
export const LAST_ORGANIZATION_KEY = 'fizyo_last_organization_id';
export const EXERCISE_BUILDER_KEY_PREFIX = 'fizyo_exercise_builder';

/** The builder cart holds an organization's private exercises, so each organization has its own. */
export function exerciseBuilderKey(organizationId: string | null | undefined): string | null {
  return organizationId ? `${EXERCISE_BUILDER_KEY_PREFIX}:${organizationId}` : null;
}

type ClearableStorage = Pick<Storage, 'length' | 'key' | 'removeItem'>;

export function clearUserBrowserState(storage?: ClearableStorage): void {
  try {
    const target = storage ?? window.localStorage;
    const keys: string[] = [];
    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);
      if (key === LAST_ORGANIZATION_KEY || key?.startsWith(EXERCISE_BUILDER_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => target.removeItem(key));
    clearStoredConversations(target);
  } catch {
    // Storage may be unavailable (private mode); then there is nothing to clear.
  }
}
