'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const NEAR_BOTTOM_PX = 120;

/**
 * Follows new messages while the therapist is at the bottom; scrolled up, the thread stays put.
 * Another conversation (threadKey) opens at its last message.
 */
export function useStickToBottom(scrollRef: RefObject<HTMLDivElement | null>, threadKey: string, followKey: string) {
  const [isAway, setIsAway] = useState(false);
  const [shownThread, setShownThread] = useState(threadKey);
  const isAwayRef = useRef(false);

  if (shownThread !== threadKey) {
    setShownThread(threadKey);
    setIsAway(false);
  }

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const element = scrollRef.current;
      element?.scrollTo({ top: element.scrollHeight, behavior });
    },
    [scrollRef]
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const handleScroll = () => {
      const away = element.scrollHeight - element.scrollTop - element.clientHeight > NEAR_BOTTOM_PX;
      isAwayRef.current = away;
      setIsAway(away);
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  useEffect(() => {
    isAwayRef.current = false;
    scrollToBottom('auto');
  }, [threadKey, scrollToBottom]);

  useEffect(() => {
    if (!isAwayRef.current) scrollToBottom();
  }, [followKey, scrollToBottom]);

  return { isAway, scrollToBottom };
}
