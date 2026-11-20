'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';

import { useOrganization } from '@/contexts/OrganizationContext';
import { ACCEPT_INVITATION_MUTATION } from '@/graphql/mutations/organizations.mutations';
import type { AcceptInvitationResponse } from '@/graphql/types/organization.types';

type JoinState =
  | { status: 'idle' | 'accepting' | 'switching' | 'joined' }
  | { status: 'switch-failed'; organizationId: string };

export function useAcceptOrganizationInvitation(onJoined?: () => void) {
  const { enterOrganization } = useOrganization();
  const [acceptInvitation] = useMutation<AcceptInvitationResponse>(ACCEPT_INVITATION_MUTATION);
  const [state, setState] = useState<JoinState>({ status: 'idle' });
  const inFlight = useRef(false);

  async function activate(organizationId: string) {
    setState({ status: 'switching' });
    try {
      await enterOrganization(organizationId);
    } catch {
      setState({ status: 'switch-failed', organizationId });
      return;
    }
    setState({ status: 'joined' });
    toast.success('Dołączyłeś do organizacji!');
    onJoined?.();
  }

  async function join(invitationToken: string) {
    if (inFlight.current || state.status !== 'idle') return;
    inFlight.current = true;
    setState({ status: 'accepting' });

    try {
      const result = await acceptInvitation({ variables: { invitationToken } }).catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Nie udało się przyjąć zaproszenia');
        return null;
      });
      if (!result) {
        setState({ status: 'idle' });
        return;
      }
      const organizationId = result.data?.acceptInvitation?.organizationId;
      if (!organizationId) {
        toast.error('Nie udało się potwierdzić dołączenia do organizacji');
        setState({ status: 'idle' });
        return;
      }
      await activate(organizationId);
    } finally {
      inFlight.current = false;
    }
  }

  async function retrySwitch() {
    if (inFlight.current || state.status !== 'switch-failed') return;
    inFlight.current = true;
    try {
      await activate(state.organizationId);
    } finally {
      inFlight.current = false;
    }
  }

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { status: state.status, join, retrySwitch, reset };
}
