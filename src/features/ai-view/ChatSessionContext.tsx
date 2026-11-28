'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';

import type { ExerciseSet, Patient } from '@/features/assignment/types';
import { CreateSetWizard } from '@/features/exercise-sets/CreateSetWizard';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_AI_CREDITS_STATUS_QUERY } from '@/graphql/queries/billing.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { UserByClerkIdResponse } from '@/types/apollo';
import { useChatData, type ChatPatient } from './useChatData';
import { useChatMode } from './useChatMode';
import { newChatId, useChatThread, type AssistantReply, type ChatThreadMessage } from './useChatThread';
import { openSetDraft, type LiveDraft } from './utils/addToDraft';
import { proposeDraftName, type SetDraftPayload } from './utils/setDraft';
import { clearExerciseDrafts } from './catalog/exerciseDraftStore';
import { conversationPatientId, type ChatCardSpec, type PinnedPatient } from './utils/chatCards';
import {
  conversationStorageKey,
  parseConversations,
  removeConversation,
  restoreConversation,
  upsertConversation,
  type StoredConversation,
} from './utils/conversationStore';
import { selectInactivePatients } from './utils/inactivePatients';

export interface AiCredits {
  remaining: number;
  limit: number;
  monthlyLimit: number;
  monthlyUsed: number;
}

interface CreateSetRequest {
  exerciseIds: string[];
  patient?: Patient;
  name?: string;
  warmupExerciseIds?: string[];
}

export interface ChatSession {
  organizationId: string;
  therapistId?: string;
  firstName?: string;
  isReady: boolean;
  /** The organization or the chat data are still loading; false once loading ends, ready or not. */
  isLoading: boolean;
  useAi: boolean;
  setUseAi: (useAi: boolean) => void;
  patients: readonly ChatPatient[];
  sets: readonly ExerciseSet[];
  /** Every set of the organization, a patient's plan included: what a card may name by id. */
  organizationSets: readonly ExerciseSet[];
  /** The catalog sets have loaded (they load only on the chat home). */
  setsReady: boolean;
  inactiveCount: number;
  credits?: AiCredits;
  refetchCredits: () => void;
  messages: readonly ChatThreadMessage[];
  isBusy: boolean;
  sendMessage: (text: string) => void;
  /** Stops the reply in flight; the question stays in the thread. */
  stopReply: () => void;
  appendAssistant: (reply: AssistantReply) => void;
  appendExchange: (userText: string, reply: AssistantReply, attachmentName?: string) => void;
  /** A patient picked from a choice by id; finishes the question without the model. */
  choosePatient: (patientId: string, label: string) => void;
  /** The rest of a combined request, carried out for the patient the form just added (by id). */
  continueForPatient: (patientId: string, name: string, command: string) => void;
  markChosen: (messageId: string, chosen: string) => void;
  /** A locked set proposal comes back as the newest card; the one active until now locks. */
  restoreDraft: (spec: Extract<ChatCardSpec, { component: 'SetDraft' }>) => void;
  runTask: (
    userText: string,
    task: (signal: AbortSignal) => Promise<AssistantReply>,
    attachmentName?: string
  ) => Promise<boolean>;
  conversations: readonly StoredConversation[];
  /** History is read once the account and organization are known; until then the list is not empty, just unknown. */
  conversationsReady: boolean;
  activeConversationId: string;
  title: string;
  startConversation: () => void;
  /** Back to the chat home (`/`) from any page of the shell. */
  goHome: () => void;
  openConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  /** Undo of a delete: the conversation comes back to the list. */
  restoreDeletedConversation: (conversation: StoredConversation) => void;
  /** Patient the conversation is about (latest card), for the header chip and the context panel. */
  contextPatient?: ChatPatient;
  isContextOpen: boolean;
  setContextOpen: (open: boolean) => void;
  showPatient: (patientId: string) => void;
  /** Escape hatch to the full set editor with what chat already knows. */
  /** `warmupExerciseIds`: rozgrzewka z propozycji (SPEC-061), którą pełny edytor oznacza na start. */
  openCreateSet: (exerciseIds: string[], patient?: Patient, name?: string, warmupExerciseIds?: string[]) => void;
  /**
   * An open set proposal tells the thread what it holds now (null when it closes), so „dodaj ćwiczenie X”
   * typed in the chat adds to it. Kept in memory only, never in the stored history.
   */
  reportLiveDraft: (messageId: string, live: LiveDraft | null) => void;
  /** SPEC-068 (W3): otwarty w bieżącym wątku szkic zestawu bez pacjenta, gotowy do podpięcia nowo dodanej osoby. */
  getOpenUnassignedDraft: () => { messageId: string; draft: SetDraftPayload } | undefined;
}

/**
 * What a card may read and do in the thread. Kept apart from the session so a new message or the
 * busy flag does not re-render every card already in the thread.
 */
export type ChatActions = Pick<
  ChatSession,
  | 'organizationId'
  | 'therapistId'
  | 'patients'
  | 'sets'
  | 'organizationSets'
  | 'setsReady'
  | 'contextPatient'
  | 'sendMessage'
  | 'appendAssistant'
  | 'appendExchange'
  | 'choosePatient'
  | 'continueForPatient'
  | 'markChosen'
  | 'restoreDraft'
  | 'runTask'
  | 'refetchCredits'
  | 'showPatient'
  | 'openCreateSet'
  | 'reportLiveDraft'
  | 'getOpenUnassignedDraft'
>;

const ChatSessionContext = createContext<ChatSession | null>(null);
const ChatActionsContext = createContext<ChatActions | null>(null);
const ChatBusyContext = createContext(false);

export function useChatSession(): ChatSession {
  const session = useContext(ChatSessionContext);
  if (!session) throw new Error('useChatSession must be used inside ChatSessionProvider');
  return session;
}

export function useChatActions(): ChatActions {
  const actions = useContext(ChatActionsContext);
  if (!actions) throw new Error('useChatActions must be used inside ChatSessionProvider');
  return actions;
}

/** A dispatch or a document analysis is running; cards disable their actions meanwhile. */
export function useChatBusy(): boolean {
  return useContext(ChatBusyContext);
}

function readConversations(key: string | undefined): StoredConversation[] {
  if (!key) return [];
  try {
    return parseConversations(window.localStorage.getItem(key));
  } catch {
    return [];
  }
}

function writeConversations(key: string, conversations: StoredConversation[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(conversations));
  } catch {
    // Storage full or blocked: the conversation still works, it is just not remembered.
  }
}

export function toWizardPatient(patient: ChatPatient | undefined): Patient | undefined {
  if (!patient) return undefined;
  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    image: patient.image,
    isShadowUser: patient.isShadowUser,
  };
}

/**
 * Chat-first shell state (DEC-20261029-02): one conversation shared by the home thread, the sidebar
 * ("Ostatnie", "Nowa rozmowa ⌘K") and the patient context panel, kept while the therapist visits
 * other screens and remembered per browser for the signed-in user and organization.
 */
export function ChatSessionProvider({ children }: { readonly children: ReactNode }) {
  const { currentOrganization, isLoading: isOrganizationLoading } = useOrganization();
  const organizationId = currentOrganization?.organizationId ?? '';
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { preference, update } = useChatMode();
  const { patients, sets, organizationSets, setsReady, intentContext, loading } = useChatData(
    organizationId || undefined,
    pathname === '/'
  );
  const isReady = Boolean(organizationId) && !loading;
  // Without an organization nothing is loading: the chat stays unavailable, but must not spin forever.
  const isLoading = isOrganizationLoading || (Boolean(organizationId) && loading);

  const { data: userData } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });
  const therapistId = userData?.userByClerkId?.id;
  const firstName = userData?.userByClerkId?.personalData?.firstName || user?.firstName || undefined;

  const { data: creditsData, refetch: refetchCreditsQuery } = useQuery<{
    aiCreditsStatus?: { monthlyLimit: number; monthlyUsed: number; addonCredits: number; totalRemaining: number };
  }>(GET_AI_CREDITS_STATUS_QUERY, { variables: { organizationId }, skip: !organizationId, errorPolicy: 'all' });
  const creditsStatus = creditsData?.aiCreditsStatus;
  const credits = useMemo<AiCredits | undefined>(
    () =>
      creditsStatus
        ? {
            remaining: creditsStatus.totalRemaining,
            limit: creditsStatus.monthlyLimit + creditsStatus.addonCredits,
            monthlyLimit: creditsStatus.monthlyLimit,
            monthlyUsed: creditsStatus.monthlyUsed,
          }
        : undefined,
    [creditsStatus]
  );
  const refetchCredits = useCallback(() => {
    if (organizationId) void refetchCreditsQuery().catch(() => undefined);
  }, [organizationId, refetchCreditsQuery]);

  useEffect(() => {
    window.addEventListener('ai-credits-changed', refetchCredits);
    return () => window.removeEventListener('ai-credits-changed', refetchCredits);
  }, [refetchCredits]);

  // The chip's patient (set below) is what a model card is checked against when a message is sent.
  const contextPatientIdRef = useRef<string | undefined>(undefined);
  const getContextPatientId = useCallback(() => contextPatientIdRef.current, []);
  const liveDraftsRef = useRef(new Map<string, LiveDraft>());
  const getLiveDraft = useCallback((messageId: string) => liveDraftsRef.current.get(messageId), []);
  const reportLiveDraft = useCallback((messageId: string, live: LiveDraft | null) => {
    if (live) liveDraftsRef.current.set(messageId, live);
    else liveDraftsRef.current.delete(messageId);
  }, []);
  const thread = useChatThread({
    useAi: preference.useAi,
    context: intentContext,
    ready: isReady,
    scopeKey: organizationId,
    getContextPatientId,
    getLiveDraft,
  });
  const { messages, reset, isBusy } = thread;

  const storageKey = user?.id && organizationId ? conversationStorageKey(user.id, organizationId) : undefined;
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState(newChatId);
  const [loadedKey, setLoadedKey] = useState<string | undefined>(undefined);

  // A new account or organization loads its own history and starts from an empty conversation.
  if (loadedKey !== storageKey) {
    setLoadedKey(storageKey);
    setConversations(readConversations(storageKey));
    setActiveConversationId(newChatId());
  }

  // Exercise drafts in memory belong to the previous account or organization.
  useEffect(() => clearExerciseDrafts, [storageKey]);

  const lastSavedRef = useRef<readonly ChatThreadMessage[] | null>(null);
  // Saved once an exchange settles, not on each step of it: the whole history is serialized.
  useEffect(() => {
    if (!storageKey || isBusy || messages === lastSavedRef.current) return;
    lastSavedRef.current = messages;
    if (messages.length === 0) return;
    setConversations((previous) => {
      const next = upsertConversation(previous, activeConversationId, messages);
      writeConversations(storageKey, next);
      return next;
    });
  }, [activeConversationId, isBusy, messages, storageKey]);

  const [isContextOpen, setContextOpen] = useState(false);
  const [pinnedPatient, setPinnedPatient] = useState<PinnedPatient | undefined>(undefined);

  const contextPatientId = useMemo(() => conversationPatientId(messages, pinnedPatient), [messages, pinnedPatient]);
  useEffect(() => {
    contextPatientIdRef.current = contextPatientId;
  }, [contextPatientId]);
  const contextPatient = contextPatientId ? patients.find((patient) => patient.id === contextPatientId) : undefined;

  const goHome = useCallback(() => {
    if (pathname !== '/') router.push('/');
  }, [pathname, router]);

  const startConversation = useCallback(() => {
    reset();
    setActiveConversationId(newChatId());
    setPinnedPatient(undefined);
    setContextOpen(false);
    goHome();
  }, [goHome, reset]);

  const openConversation = useCallback(
    (id: string) => {
      const conversation = conversations.find((candidate) => candidate.id === id);
      if (!conversation) return;
      lastSavedRef.current = conversation.messages;
      reset(conversation.messages);
      setActiveConversationId(id);
      setPinnedPatient(undefined);
      goHome();
    },
    [conversations, goHome, reset]
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((previous) => {
        const next = removeConversation(previous, id);
        if (storageKey) writeConversations(storageKey, next);
        return next;
      });
      if (id === activeConversationId) {
        reset();
        setActiveConversationId(newChatId());
      }
    },
    [activeConversationId, reset, storageKey]
  );

  const restoreDeletedConversation = useCallback(
    (conversation: StoredConversation) => {
      setConversations((previous) => {
        const next = restoreConversation(previous, conversation);
        if (storageKey) writeConversations(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only on the chat home: elsewhere ⌘K must not throw away work in a form or editor.
      if (pathname === '/' && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        startConversation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pathname, startConversation]);

  const [createSetRequest, setCreateSetRequest] = useState<CreateSetRequest | null>(null);

  const messageCountRef = useRef(0);
  const messagesSnapshotRef = useRef(messages);
  useEffect(() => {
    messageCountRef.current = messages.length;
    messagesSnapshotRef.current = messages;
  }, [messages]);
  const getOpenUnassignedDraft = useCallback((): { messageId: string; draft: SetDraftPayload } | undefined => {
    const open = openSetDraft(messagesSnapshotRef.current);
    if (!open) return undefined;
    const live = liveDraftsRef.current.get(open.messageId);
    if (!live || live.draft.patientId || !live.draft.items?.length) return undefined;
    return {
      messageId: open.messageId,
      draft: {
        name: proposeDraftName({ topic: live.draft.note }),
        items: [...live.draft.items],
      },
    };
  }, []);
  const showPatient = useCallback((patientId: string) => {
    setPinnedPatient({ patientId, messageCount: messageCountRef.current });
    setContextOpen(true);
  }, []);

  const inactiveCount = useMemo(
    () => selectInactivePatients(patients, therapistId)?.length ?? 0,
    [patients, therapistId]
  );
  const title = conversations.find((conversation) => conversation.id === activeConversationId)?.title ?? 'Nowa rozmowa';
  const { send, stop: stopReply, appendAssistant, appendExchange, choosePatient: chooseThreadPatient, runTask, markChosen } = thread;
  const { continueForPatient: continueThread, restoreDraft } = thread;
  const choosePatient = useCallback(
    (patientId: string, label: string) => void chooseThreadPatient(patientId, label),
    [chooseThreadPatient]
  );
  const continueForPatient = useCallback(
    (patientId: string, name: string, command: string) => void continueThread(patientId, name, command),
    [continueThread]
  );
  const sendMessage = useCallback((text: string) => void send(text), [send]);
  const openCreateSet = useCallback(
    (exerciseIds: string[], patient?: Patient, name?: string, warmupExerciseIds?: string[]) =>
      setCreateSetRequest({ exerciseIds, patient, name, warmupExerciseIds }),
    []
  );

  const actions = useMemo<ChatActions>(
    () => ({
      organizationId,
      therapistId,
      patients,
      sets,
      organizationSets,
      setsReady,
      contextPatient,
      sendMessage,
      appendAssistant,
      appendExchange,
      choosePatient,
      continueForPatient,
      markChosen,
      restoreDraft,
      runTask,
      refetchCredits,
      showPatient,
      openCreateSet,
      reportLiveDraft,
      getOpenUnassignedDraft,
    }),
    [
      organizationId,
      therapistId,
      patients,
      sets,
      organizationSets,
      setsReady,
      contextPatient,
      sendMessage,
      appendAssistant,
      appendExchange,
      choosePatient,
      continueForPatient,
      markChosen,
      restoreDraft,
      runTask,
      refetchCredits,
      showPatient,
      openCreateSet,
      reportLiveDraft,
      getOpenUnassignedDraft,
    ]
  );
  const setUseAi = useCallback((useAi: boolean) => update({ useAi }), [update]);

  const session = useMemo<ChatSession>(
    () => ({
      organizationId,
      therapistId,
      firstName,
      isReady,
      isLoading,
      useAi: preference.useAi,
      setUseAi,
      patients,
      sets,
      organizationSets,
      setsReady,
      inactiveCount,
      credits,
      refetchCredits,
      messages,
      isBusy,
      sendMessage,
      stopReply,
      appendAssistant,
      appendExchange,
      choosePatient,
      continueForPatient,
      markChosen,
      restoreDraft,
      runTask,
      conversations,
      conversationsReady: storageKey !== undefined || (!isOrganizationLoading && !organizationId),
      activeConversationId,
      title,
      startConversation,
      goHome,
      openConversation,
      deleteConversation,
      restoreDeletedConversation,
      contextPatient,
      isContextOpen,
      setContextOpen,
      showPatient,
      openCreateSet,
      reportLiveDraft,
      getOpenUnassignedDraft,
    }),
    [
      organizationId,
      therapistId,
      firstName,
      isReady,
      isLoading,
      preference.useAi,
      setUseAi,
      patients,
      sets,
      organizationSets,
      setsReady,
      inactiveCount,
      credits,
      refetchCredits,
      messages,
      isBusy,
      sendMessage,
      stopReply,
      appendAssistant,
      appendExchange,
      choosePatient,
      continueForPatient,
      markChosen,
      restoreDraft,
      runTask,
      conversations,
      storageKey,
      isOrganizationLoading,
      activeConversationId,
      title,
      startConversation,
      goHome,
      openConversation,
      deleteConversation,
      restoreDeletedConversation,
      contextPatient,
      isContextOpen,
      showPatient,
      openCreateSet,
      reportLiveDraft,
      getOpenUnassignedDraft,
    ]
  );

  return (
    <ChatSessionContext.Provider value={session}>
      <ChatActionsContext.Provider value={actions}>
        <ChatBusyContext.Provider value={isBusy}>{children}</ChatBusyContext.Provider>
      </ChatActionsContext.Provider>
      {organizationId && (
        <CreateSetWizard
          open={createSetRequest !== null}
          onOpenChange={(open) => !open && setCreateSetRequest(null)}
          organizationId={organizationId}
          initialExerciseIds={createSetRequest?.exerciseIds}
          initialName={createSetRequest?.name}
          initialWarmupExerciseIds={createSetRequest?.warmupExerciseIds}
          patientId={createSetRequest?.patient?.id}
          patientName={createSetRequest?.patient?.name}
          showNextSteps={false}
          onSuccess={(setId: string) => {
            const patientId = createSetRequest?.patient?.id;
            setCreateSetRequest(null);
            appendAssistant({
              text: 'Zestaw zapisany w pełnym edytorze.',
              spec: patientId
                ? { component: 'AssignSummary', patientId, setId }
                : { component: 'SetDraft', setId, exerciseIds: [] },
            });
          }}
        />
      )}
    </ChatSessionContext.Provider>
  );
}
