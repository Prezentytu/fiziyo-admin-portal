'use client';

import { createContext, useContext } from 'react';

/** Puts text in the message field and focuses it; cards use it to start the therapist's answer. */
export const ComposerDraftContext = createContext<(text: string) => void>(() => undefined);

export function useComposerDraft(): (text: string) => void {
  return useContext(ComposerDraftContext);
}
