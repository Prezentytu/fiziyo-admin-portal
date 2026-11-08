'use client';

import { useEffect, useState } from 'react';

import { useRoleAccess } from '@/hooks/useRoleAccess';

import { AiCreditsRequestDialog } from './AiCreditsRequestDialog';
import { CREDITS_REQUEST_OPEN_EVENT } from './utils/creditsRequest';

/** One dialog for the whole dashboard; the sidebar, chat note and toasts open it by event. */
export function AiCreditsRequestHost() {
  const { canManageOrganization } = useRoleAccess();
  const [open, setOpen] = useState(false);
  // Zmiana organizacji na rolę bez prawa prośby zamyka dialog, żeby nie otworzył się sam po powrocie.
  const [allowed, setAllowed] = useState(canManageOrganization);
  if (allowed !== canManageOrganization) {
    setAllowed(canManageOrganization);
    setOpen(false);
  }

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(CREDITS_REQUEST_OPEN_EVENT, show);
    return () => window.removeEventListener(CREDITS_REQUEST_OPEN_EVENT, show);
  }, []);

  if (!canManageOrganization) return null;
  return <AiCreditsRequestDialog open={open} onOpenChange={setOpen} />;
}
