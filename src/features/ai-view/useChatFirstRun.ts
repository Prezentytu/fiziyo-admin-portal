'use client';

import { useSession, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

import { useRoleAccess } from '@/hooks/useRoleAccess';
import { isNewChatAccountSession } from './utils/chatFirstRun';

export type ChatTourStep = 0 | 1 | 2;

const COMPLETED_FIELD = 'portalChatTourFinished';

function storageKey(userId: string): string {
  return `fiziyo:portal-chat-tour:${userId}`;
}

function wasFinishedLocally(userId: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function useChatFirstRun(enabled: boolean) {
  const { user } = useUser();
  const { session } = useSession();
  const { role, isLoading, canManageOrganization } = useRoleAccess();
  const [tour, setTour] = useState<{ sessionId: string; step: ChatTourStep | null } | null>(null);
  const userId = user?.id;
  const sessionId = session?.id;
  const accountCreatedAt = user?.createdAt;
  const sessionCreatedAt = session?.createdAt;
  const finishedOnAccount = user?.unsafeMetadata[COMPLETED_FIELD] === true;
  const canStart = enabled && !isLoading && role !== null && !session?.actor && session?.user?.id === userId;

  useEffect(() => {
    if (!canStart || !userId || !sessionId || !accountCreatedAt || !sessionCreatedAt || tour?.sessionId === sessionId) {
      return;
    }
    if (finishedOnAccount || wasFinishedLocally(userId) || !isNewChatAccountSession(accountCreatedAt, sessionCreatedAt, Date.now())) {
      return;
    }
    const frame = window.requestAnimationFrame(() => setTour({ sessionId, step: 0 }));
    return () => window.cancelAnimationFrame(frame);
  }, [accountCreatedAt, canStart, finishedOnAccount, sessionCreatedAt, sessionId, tour?.sessionId, userId]);

  const step = canStart && !finishedOnAccount && tour?.sessionId === sessionId ? tour?.step ?? null : null;

  const goToStep = (next: ChatTourStep) => {
    if (sessionId) setTour({ sessionId, step: next });
  };

  const dismiss = () => {
    if (!sessionId || !user) return;
    setTour({ sessionId, step: null });
    try {
      window.localStorage.setItem(storageKey(user.id), '1');
    } catch {
      // The account preference still works when browser storage is unavailable.
    }
    void user.updateMetadata({ unsafeMetadata: { [COMPLETED_FIELD]: true } }).catch(() => undefined);
  };

  return { step, canManageOrganization, goToStep, dismiss };
}
