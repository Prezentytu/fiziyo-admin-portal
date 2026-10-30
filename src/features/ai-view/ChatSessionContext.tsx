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
import { cardPatientId } from './utils/chatCards';
import {
  conversationStorageKey,
  parseConversations,
  removeConversation,
  upsertConversation,
  type StoredConversation,
} from './utils/conversationStore';
import { selectInactivePatients } from './utils/inactivePatients';

export interface AiCredits {
  remaining: number;
  limit: number;
}

interface CreateSetRequest {
  exerciseIds: string[];
  patient?: Patient;
}

export interface ChatSession {
  organizationId: string;
  therapistId?: string;
  firstName?: string;
  isReady: boolean;
  useAi: boolean;
  setUseAi: (useAi: boolean) => void;
  patients: readonly ChatPatient[];
  sets: readonly ExerciseSet[];
  inactiveCount: number;
  credits?: AiCredits;
  refetchCredits: () => void;
  messages: readonly ChatThreadMessage[];
  isBusy: boolean;
  sendMessage: (text: string) => void;
  appendAssistant: (reply: AssistantReply) => void;
  appendExchange: (userText: string, reply: AssistantReply, attachmentName?: string) => void;
  markChosen: (messageId: string, chosen: string) => void;
  runTask: (userText: string, task: () => Promise<AssistantReply>, attachmentName?: string) => Promise<boolean>;
  conversations: readonly StoredConversation[];
  activeConversationId: string;
  title: string;
  startConversation: () => void;
  openConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  /** Patient the conversation is about (latest card), for the header chip and the context panel. */
  contextPatient?: ChatPatient;
  isContextOpen: boolean;
  setContextOpen: (open: boolean) => void;
  showPatient: (patientId: string) => void;
  /** Escape hatch to the full set editor with what chat already knows. */
  openCreateSet: (exerciseIds: string[], patient?: Patient) => void;
}

const ChatSessionContext = createContext<ChatSession | null>(null);

export function useChatSession(): ChatSession {
  const session = useContext(ChatSessionContext);
  if (!session) throw new Error('useChatSession must be used inside ChatSessionProvider');
  return session;
}

/** Same as `useChatSession` for cards: one name for what a card may do in the thread. */
export const useChatActions = useChatSession;

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
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.organizationId ?? '';
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { preference, update } = useChatMode();
  const { patients, sets, intentContext, loading } = useChatData(organizationId || undefined);
  const isReady = Boolean(organizationId) && !loading;

  const { data: userData } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });
  const therapistId = userData?.userByClerkId?.id;
  const firstName = userData?.userByClerkId?.personalData?.firstName || user?.firstName || undefined;

  const { data: creditsData, refetch: refetchCreditsQuery } = useQuery<{
    aiCreditsStatus?: { monthlyLimit: number; addonCredits: number; totalRemaining: number };
  }>(GET_AI_CREDITS_STATUS_QUERY, { variables: { organizationId }, skip: !organizationId, errorPolicy: 'all' });
  const creditsStatus = creditsData?.aiCreditsStatus;
  const credits = useMemo<AiCredits | undefined>(
    () =>
      creditsStatus
        ? { remaining: creditsStatus.totalRemaining, limit: creditsStatus.monthlyLimit + creditsStatus.addonCredits }
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

  const thread = useChatThread({
    useAi: preference.useAi,
    context: intentContext,
    ready: isReady,
    scopeKey: organizationId,
  });
  const { messages, reset } = thread;

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

  const lastSavedRef = useRef<readonly ChatThreadMessage[] | null>(null);
  useEffect(() => {
    if (!storageKey || messages === lastSavedRef.current) return;
    lastSavedRef.current = messages;
    if (messages.length === 0) return;
    setConversations((previous) => {
      const next = upsertConversation(previous, activeConversationId, messages);
      writeConversations(storageKey, next);
      return next;
    });
  }, [activeConversationId, messages, storageKey]);

  const [isContextOpen, setContextOpen] = useState(false);
  const [pinnedPatientId, setPinnedPatientId] = useState<string | undefined>(undefined);

  const latestPatientId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== 'assistant') continue;
      const patientId = cardPatientId(message.spec);
      if (patientId) return patientId;
    }
    return undefined;
  }, [messages]);
  const contextPatientId = pinnedPatientId ?? latestPatientId;
  const contextPatient = contextPatientId ? patients.find((patient) => patient.id === contextPatientId) : undefined;

  const goHome = useCallback(() => {
    if (pathname !== '/') router.push('/');
  }, [pathname, router]);

  const startConversation = useCallback(() => {
    reset();
    setActiveConversationId(newChatId());
    setPinnedPatientId(undefined);
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
      setPinnedPatientId(undefined);
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

  const showPatient = useCallback((patientId: string) => {
    setPinnedPatientId(patientId);
    setContextOpen(true);
  }, []);

  const inactiveCount = useMemo(
    () => selectInactivePatients(patients, therapistId)?.length ?? 0,
    [patients, therapistId]
  );
  const title = conversations.find((conversation) => conversation.id === activeConversationId)?.title ?? 'Nowa rozmowa';
  const { send, appendAssistant, appendExchange, runTask, markChosen, isBusy } = thread;
  const sendMessage = useCallback((text: string) => void send(text), [send]);
  const setUseAi = useCallback((useAi: boolean) => update({ useAi }), [update]);

  const session = useMemo<ChatSession>(
    () => ({
      organizationId,
      therapistId,
      firstName,
      isReady,
      useAi: preference.useAi,
      setUseAi,
      patients,
      sets,
      inactiveCount,
      credits,
      refetchCredits,
      messages,
      isBusy,
      sendMessage,
      appendAssistant,
      appendExchange,
      markChosen,
      runTask,
      conversations,
      activeConversationId,
      title,
      startConversation,
      openConversation,
      deleteConversation,
      contextPatient,
      isContextOpen,
      setContextOpen,
      showPatient,
      openCreateSet: (exerciseIds, patient) => setCreateSetRequest({ exerciseIds, patient }),
    }),
    [
      organizationId,
      therapistId,
      firstName,
      isReady,
      preference.useAi,
      setUseAi,
      patients,
      sets,
      inactiveCount,
      credits,
      refetchCredits,
      messages,
      isBusy,
      sendMessage,
      appendAssistant,
      appendExchange,
      markChosen,
      runTask,
      conversations,
      activeConversationId,
      title,
      startConversation,
      openConversation,
      deleteConversation,
      contextPatient,
      isContextOpen,
      showPatient,
    ]
  );

  return (
    <ChatSessionContext.Provider value={session}>
      {children}
      {organizationId && (
        <CreateSetWizard
          open={createSetRequest !== null}
          onOpenChange={(open) => !open && setCreateSetRequest(null)}
          organizationId={organizationId}
          initialExerciseIds={createSetRequest?.exerciseIds}
          patientId={createSetRequest?.patient?.id}
          patientName={createSetRequest?.patient?.name}
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
