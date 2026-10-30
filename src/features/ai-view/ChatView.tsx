'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { FolderPlus, Sparkles, SquarePen, UserPlus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AssignmentWizard } from '@/features/assignment/AssignmentWizard';
import type { ExerciseSet, Patient } from '@/features/assignment/types';
import { CreateSetWizard } from '@/features/exercise-sets/CreateSetWizard';
import { PatientDialog } from '@/features/patients/PatientDialog';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { UserByClerkIdResponse } from '@/types/apollo';
import { polishPlural } from '@/utils/polishPlural';
import { ChatActionsContext, type ChatActions } from './ChatActionsContext';
import { ChatComposer } from './ChatComposer';
import { ChatSpecRenderer } from './catalog/ChatSpecRenderer';
import { useChatData } from './useChatData';
import { useChatMode } from './useChatMode';
import { useChatThread, type ChatThreadMessage } from './useChatThread';
import type { DispatchFailure } from './utils/resolveReply';

interface CreateSetRequest {
  exerciseIds: string[];
  patient?: Patient;
}

interface AssignRequest {
  set?: ExerciseSet;
  patient?: Patient;
}

const FALLBACK_NOTES: Record<DispatchFailure, string> = {
  unavailable: 'Asystent AI teraz nie odpowiada, więc ta odpowiedź jest bez AI.',
  insufficient_credits: 'Skończyły się kredyty AI, więc ta odpowiedź jest bez AI.',
  unauthorized: 'Sesja wygasła, więc ta odpowiedź jest bez AI. Odśwież stronę, żeby wrócić do AI.',
};

function AssistantFoot({ message }: { readonly message: Extract<ChatThreadMessage, { role: 'assistant' }> }) {
  if (message.fallbackReason) {
    return <p className="text-[12px] text-label-tertiary">{FALLBACK_NOTES[message.fallbackReason]}</p>;
  }
  if (message.creditsUsed > 0) {
    return (
      <p className="text-[12px] tabular-nums text-label-tertiary">
        −{message.creditsUsed} {polishPlural(message.creditsUsed, 'kredyt', 'kredyty', 'kredytów')} AI
      </p>
    );
  }
  return null;
}

/** Chat-first home (DEC-20261029-02, DEC-20261030-01): one conversation, cards instead of free text. */
export function ChatView() {
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId ?? '';
  const { preference, update } = useChatMode();
  const { patients, sets, intentContext, loading } = useChatData(organizationId || undefined);
  const isReady = Boolean(organizationId) && !loading;
  const { messages, isBusy, send, appendSpec, reset } = useChatThread({
    useAi: preference.useAi,
    context: intentContext,
    ready: isReady,
    scopeKey: organizationId,
  });

  const [assignRequest, setAssignRequest] = useState<AssignRequest | null>(null);
  const [createSetRequest, setCreateSetRequest] = useState<CreateSetRequest | null>(null);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: userData } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });
  const therapistId = userData?.userByClerkId?.id;
  const firstName = userData?.userByClerkId?.personalData?.firstName || user?.firstName;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isBusy]);

  const sendMessage = useCallback((text: string) => void send(text), [send]);

  const actions = useMemo<ChatActions>(
    () => ({
      organizationId,
      therapistId,
      patients,
      sets,
      openAssign: (set, patient) => setAssignRequest({ set, patient }),
      openCreateSet: (exerciseIds, patient) => setCreateSetRequest({ exerciseIds, patient }),
      openAddPatient: () => setIsPatientDialogOpen(true),
      sendMessage,
      appendSpec,
    }),
    [organizationId, therapistId, patients, sets, sendMessage, appendSpec]
  );

  const handleSetCreated = (setId: string) => {
    const patientId = createSetRequest?.patient?.id;
    setCreateSetRequest(null);
    appendSpec(
      patientId ? { component: 'AssignSummary', patientId, setId } : { component: 'SetDraft', setId, exerciseIds: [] }
    );
  };

  const isEmpty = messages.length === 0;

  const shortcuts = (
    <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Skróty">
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendMessage('Utwórz zestaw')}
        disabled={!isReady}
        data-testid="common-chat-shortcut-set-btn"
      >
        <FolderPlus aria-hidden="true" />
        Utwórz zestaw
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsPatientDialogOpen(true)}
        data-testid="common-chat-shortcut-patient-btn"
      >
        <UserPlus aria-hidden="true" />
        Dodaj pacjenta
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendMessage('Pokaż, kto nie ćwiczy')}
        disabled={!isReady}
        data-testid="common-chat-shortcut-inactive-btn"
      >
        <Users aria-hidden="true" />
        Kto nie ćwiczy
      </Button>
    </div>
  );

  return (
    <ChatActionsContext.Provider value={actions}>
      <div data-testid="common-chat-view" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-card">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
          <button
            type="button"
            onClick={() => update({ useAi: !preference.useAi })}
            aria-pressed={preference.useAi}
            data-testid="common-chat-ai-toggle-btn"
            title={
              preference.useAi
                ? 'Wyłącz AI: odpowiedzi tylko z reguł, nic nie wychodzi do modelu'
                : 'Włącz asystenta AI'
            }
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              preference.useAi ? 'bg-tint-muted text-tint' : 'bg-fill-tertiary text-label-secondary'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {preference.useAi ? 'AI włączone' : 'Bez AI'}
          </button>
          {!isEmpty && (
            <Button variant="ghost" size="sm" onClick={reset} data-testid="common-chat-new-btn">
              <SquarePen aria-hidden="true" />
              Nowa rozmowa
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              'mx-auto flex w-full max-w-[760px] flex-col px-4 sm:px-6',
              isEmpty ? 'min-h-full justify-center gap-7 pb-[12vh]' : 'gap-7 pb-8 pt-4'
            )}
          >
            {isEmpty ? (
              <>
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-tint-fill text-on-tint">
                    <Sparkles className="h-[22px] w-[22px]" aria-hidden="true" />
                  </span>
                  <h1 className="text-[26px] font-bold leading-8 tracking-tight text-foreground sm:text-[32px] sm:leading-[38px]">
                    {firstName ? `Dzień dobry, ${firstName}` : 'Dzień dobry'}
                  </h1>
                  <p className="text-[16px] text-label-secondary">
                    Napisz, co zrobić: przypisz zestaw, znajdź ćwiczenia albo sprawdź, kto nie ćwiczy.
                  </p>
                </div>
                <ChatComposer onSend={sendMessage} disabled={isBusy || !isReady} large />
                {shortcuts}
              </>
            ) : (
              <ol className="flex flex-col gap-7" aria-live="polite" data-testid="common-chat-thread">
                {messages.map((message) =>
                  message.role === 'user' ? (
                    <li key={message.id} className="flex justify-end">
                      <p className="max-w-[min(80%,560px)] whitespace-pre-wrap break-words rounded-[22px] bg-fill-tertiary px-4 py-2.5 text-[16px] leading-6 text-foreground">
                        {message.text}
                      </p>
                    </li>
                  ) : (
                    <li key={message.id} className="flex flex-col gap-2">
                      <ChatSpecRenderer spec={message.spec} testId={`common-chat-reply-${message.id}`} />
                      <AssistantFoot message={message} />
                    </li>
                  )
                )}
                {isBusy && (
                  <li
                    className="flex items-center gap-2.5 text-[15px] text-label-secondary"
                    data-testid="common-chat-thinking"
                  >
                    <Sparkles
                      className="h-4 w-4 animate-pulse text-tint motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    Asystent pracuje…
                  </li>
                )}
              </ol>
            )}
          </div>
        </div>

        {!isEmpty && (
          <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6">
            <div className="mx-auto w-full max-w-[760px]">
              <ChatComposer onSend={sendMessage} disabled={isBusy || !isReady} />
            </div>
          </div>
        )}
      </div>

      {organizationId && (
        <AssignmentWizard
          open={assignRequest !== null}
          onOpenChange={(open) => !open && setAssignRequest(null)}
          mode={assignRequest?.set ? 'from-set' : 'from-patient'}
          organizationId={organizationId}
          therapistId={therapistId}
          preselectedSet={assignRequest?.set}
          preselectedPatient={assignRequest?.patient}
          onSuccess={() => setAssignRequest(null)}
        />
      )}

      {organizationId && (
        <CreateSetWizard
          open={createSetRequest !== null}
          onOpenChange={(open) => !open && setCreateSetRequest(null)}
          organizationId={organizationId}
          initialExerciseIds={createSetRequest?.exerciseIds}
          patientId={createSetRequest?.patient?.id}
          patientName={createSetRequest?.patient?.name}
          onSuccess={handleSetCreated}
        />
      )}

      {organizationId && therapistId && (
        <PatientDialog
          open={isPatientDialogOpen}
          onOpenChange={setIsPatientDialogOpen}
          organizationId={organizationId}
          therapistId={therapistId}
        />
      )}
    </ChatActionsContext.Provider>
  );
}
