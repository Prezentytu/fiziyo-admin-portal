'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@apollo/client/react';
import { ChevronDown, History, ListTree, Rows3, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageSheet } from '@/components/shared/page';
import { useSystemRole } from '@/hooks/useSystemRole';
import { VerificationPageHeader } from '@/features/verification/VerificationPageHeader';
import { NAME_REVIEW_GRID, NameReviewRowItem, PILLAR_TOOLTIP } from '@/features/exercise-names/NameReviewRowItem';
import { RecentChangesPanel } from '@/features/exercise-names/RecentChangesPanel';
import { VocabularyEditor } from '@/features/exercise-names/VocabularyEditor';
import {
  GET_EXERCISE_NAME_PROPOSAL_JOB_QUERY,
  GET_EXERCISE_NAME_REVIEW_LOG_QUERY,
  GET_EXERCISE_NAME_REVIEW_ORGANIZATIONS_QUERY,
  GET_EXERCISE_NAME_REVIEWS_QUERY,
} from '@/graphql/queries/exerciseNameReview.queries';
import {
  DECIDE_EXERCISE_NAMES_MUTATION,
  GENERATE_EXERCISE_NAME_PROPOSALS_MUTATION,
  UNDO_EXERCISE_NAME_DECISION_MUTATION,
} from '@/graphql/mutations/exerciseNameReview.mutations';
import type {
  DecideExerciseNamesResponse,
  ExerciseNameReviewRow,
  GenerateExerciseNameProposalsResponse,
  GetExerciseNameProposalJobResponse,
  GetExerciseNameReviewLogResponse,
  GetExerciseNameReviewOrganizationsResponse,
  GetExerciseNameReviewsResponse,
  UndoExerciseNameDecisionResponse,
} from '@/graphql/types/exerciseNameReview.types';
import { getYouTubeEmbedUrl, getVimeoEmbedUrl, isVimeoUrl, isYouTubeUrl } from '@/utils/videoEmbed';
import { NAME_REVIEW_KEY_HINTS, nameReviewKeyAction } from '@/features/exercise-names/utils/nameReviewKeys';
import {
  countRows,
  effectivePillarId,
  familyOptions,
  filterRows,
  groupByPillar,
  initialDraft,
  isDone,
  nextRowId,
  NO_FAMILY_LABEL,
  orderDecisions,
  orderedRows,
  parseNameReviewUrl,
  pillarCandidates,
  serializeNameReviewUrl,
  toDecision,
  type NameReviewDraft,
  type NameReviewUrlState,
} from '@/features/exercise-names/utils/nameReviewRows';

const DEFAULT_ORGANIZATION_NAME = 'Ćwiczenia na PROD';
const ALL_FAMILIES = '__all__';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** BW-FZ-123: fast keyboard review of short names, pillar exercises and variants (FiziYo team only). */
export function NameReviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { canReviewExercises, isLoading: roleLoading } = useSystemRole();

  const [urlState, setUrlState] = useState<NameReviewUrlState>(() => parseNameReviewUrl(new URLSearchParams(searchParams.toString())));
  const [rowOverrides, setRowOverrides] = useState<Record<string, ExerciseNameReviewRow>>({});
  const [drafts, setDrafts] = useState<Record<string, NameReviewDraft>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [previewRow, setPreviewRow] = useState<ExerciseNameReviewRow | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const nameInputs = useRef(new Map<string, HTMLInputElement>());
  const rowElements = useRef(new Map<string, HTMLElement>());

  const organizationId = urlState.organizationId;

  const { data: organizationsData } = useQuery<GetExerciseNameReviewOrganizationsResponse>(
    GET_EXERCISE_NAME_REVIEW_ORGANIZATIONS_QUERY,
    { skip: !canReviewExercises, fetchPolicy: 'cache-and-network' }
  );
  const organizations = useMemo(() => organizationsData?.exerciseNameReviewOrganizations ?? [], [organizationsData]);

  const {
    data: rowsData,
    loading: rowsLoading,
    refetch: refetchRows,
  } = useQuery<GetExerciseNameReviewsResponse>(GET_EXERCISE_NAME_REVIEWS_QUERY, {
    variables: { organizationId: organizationId ?? '' },
    skip: !canReviewExercises || !organizationId,
    fetchPolicy: 'cache-and-network',
  });
  const { data: jobData, refetch: refetchJob, startPolling, stopPolling } = useQuery<GetExerciseNameProposalJobResponse>(
    GET_EXERCISE_NAME_PROPOSAL_JOB_QUERY,
    {
      variables: { organizationId: organizationId ?? '' },
      skip: !canReviewExercises || !organizationId,
      fetchPolicy: 'network-only',
    }
  );
  const { data: logData, loading: logLoading, refetch: refetchLog } = useQuery<GetExerciseNameReviewLogResponse>(
    GET_EXERCISE_NAME_REVIEW_LOG_QUERY,
    {
      variables: { organizationId: organizationId ?? '', take: 30 },
      skip: !canReviewExercises || !organizationId || !logOpen,
      fetchPolicy: 'cache-and-network',
    }
  );

  const [decide] = useMutation<DecideExerciseNamesResponse>(DECIDE_EXERCISE_NAMES_MUTATION);
  const [undo] = useMutation<UndoExerciseNameDecisionResponse>(UNDO_EXERCISE_NAME_DECISION_MUTATION);
  const [generate, { loading: generating }] = useMutation<GenerateExerciseNameProposalsResponse>(
    GENERATE_EXERCISE_NAME_PROPOSALS_MUTATION
  );

  const rows = useMemo(
    () => (rowsData?.exerciseNameReviews ?? []).map((row) => rowOverrides[row.exerciseId] ?? row),
    [rowsData, rowOverrides]
  );
  const rowsById = useMemo(() => new Map(rows.map((row) => [row.exerciseId, row])), [rows]);
  const draftOf = useCallback((row: ExerciseNameReviewRow) => drafts[row.exerciseId] ?? initialDraft(row), [drafts]);
  const allDrafts = useMemo(() => Object.fromEntries(rows.map((row) => [row.exerciseId, draftOf(row)])), [rows, draftOf]);

  const counts = useMemo(() => countRows(rows), [rows]);
  const families = useMemo(() => familyOptions(rows), [rows]);
  const visible = useMemo(() => filterRows(rows, urlState, allDrafts), [rows, urlState, allDrafts]);
  const grouped = useMemo(() => groupByPillar(visible, allDrafts), [visible, allDrafts]);
  const ordered = useMemo(() => (urlState.view === 'families' ? orderedRows(grouped) : visible), [urlState.view, grouped, visible]);
  const orderedIds = useMemo(() => ordered.map((row) => row.exerciseId), [ordered]);
  const activeId = urlState.rowId && orderedIds.includes(urlState.rowId) ? urlState.rowId : (orderedIds[0] ?? null);

  const job = jobData?.exerciseNameProposalJob.job;
  const withoutProposal = jobData?.exerciseNameProposalJob.withoutProposal ?? counts.withoutProposal;
  const jobRunning = job?.state === 'RUNNING';

  const patchUrl = useCallback((patch: Partial<NameReviewUrlState>) => {
    setUrlState((current) => ({ ...current, ...patch }));
  }, []);

  useEffect(() => {
    const query = serializeNameReviewUrl(urlState);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [urlState, pathname, router]);

  useEffect(() => {
    if (organizationId || organizations.length === 0) return;
    const preferred = organizations.find((organization) => organization.name === DEFAULT_ORGANIZATION_NAME);
    if (preferred) patchUrl({ organizationId: preferred.id });
  }, [organizationId, organizations, patchUrl]);

  useEffect(() => {
    if (jobRunning) {
      startPolling(3000);
      return () => stopPolling();
    }
    stopPolling();
    return undefined;
  }, [jobRunning, startPolling, stopPolling]);

  const lastJobState = useRef(job?.state);
  useEffect(() => {
    if (lastJobState.current === 'RUNNING' && job && job.state !== 'RUNNING') {
      void refetchRows();
      if (job.state === 'COMPLETED') {
        toast.success(`Propozycje gotowe: ${job.proposed}${job.failed ? `, bez propozycji ${job.failed}` : ''}.`);
      } else if (job.error) {
        toast.error(job.error);
      }
    }
    lastJobState.current = job?.state;
  }, [job, refetchRows]);

  useEffect(() => {
    if (!activeId) return;
    rowElements.current.get(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);

  const setDraft = (exerciseId: string, draft: NameReviewDraft) => setDrafts((current) => ({ ...current, [exerciseId]: draft }));

  const applyRows = (updated: ReadonlyArray<ExerciseNameReviewRow>) => {
    setRowOverrides((current) => ({ ...current, ...Object.fromEntries(updated.map((row) => [row.exerciseId, row])) }));
    setDrafts((current) => {
      const next = { ...current };
      updated.forEach((row) => delete next[row.exerciseId]);
      return next;
    });
  };

  const markSaving = (ids: ReadonlyArray<string>, saving: boolean) =>
    setSavingIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => (saving ? next.add(id) : next.delete(id)));
      return next;
    });

  const saveDecisions = async (targets: ReadonlyArray<ExerciseNameReviewRow>, keepName: boolean) => {
    const pending = targets.filter((row) => !isDone(row));
    if (!organizationId || pending.length === 0) return;
    const ids = pending.map((row) => row.exerciseId);
    const following = nextRowId(orderedIds, activeId, new Set(urlState.status === 'todo' ? ids : []));
    markSaving(ids, true);
    try {
      const result = await decide({
        variables: {
          organizationId,
          decisions: orderDecisions(pending.map((row) => toDecision(row, draftOf(row), keepName))),
        },
      });
      if (result.data) {
        applyRows(result.data.decideExerciseNames);
        setSelected((current) => new Set([...current].filter((id) => !ids.includes(id))));
        if (urlState.status === 'todo' || ids.length === 1) patchUrl({ rowId: following });
        void refetchJob();
        if (logOpen) void refetchLog();
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Nie udało się zapisać decyzji.'));
    } finally {
      markSaving(ids, false);
    }
  };

  const undoDecision = async (exerciseId: string) => {
    if (!organizationId) return;
    markSaving([exerciseId], true);
    try {
      const result = await undo({ variables: { organizationId, exerciseId } });
      if (result.data) {
        applyRows([result.data.undoExerciseNameDecision]);
        toast.success('Decyzja cofnięta.');
        if (logOpen) void refetchLog();
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Nie udało się cofnąć decyzji.'));
    } finally {
      markSaving([exerciseId], false);
    }
  };

  const startGeneration = async (regenerateTodo: boolean) => {
    if (!organizationId) return;
    try {
      await generate({ variables: { organizationId, regenerateTodo } });
      lastJobState.current = 'RUNNING';
      await refetchJob();
    } catch (error) {
      toast.error(errorMessage(error, 'Nie udało się uruchomić generowania.'));
    }
  };

  const handleKey = useRef<(event: KeyboardEvent) => void>(() => undefined);
  handleKey.current = (event: KeyboardEvent) => {
    if (previewRow || (pickerOpenId && event.key !== 'Escape')) return;
    const action = nameReviewKeyAction({
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
      inTextField: isTextField(event.target),
    });
    const fieldRowId =
      event.target instanceof HTMLInputElement
        ? ([...nameInputs.current.entries()].find(([, input]) => input === event.target)?.[0] ?? null)
        : null;
    if (!action || (isTextField(event.target) && !fieldRowId)) return;
    const active = activeId ? rowsById.get(activeId) : undefined;
    const index = activeId ? orderedIds.indexOf(activeId) : -1;
    event.preventDefault();
    switch (action) {
      case 'next':
        patchUrl({ rowId: orderedIds[Math.min(index + 1, orderedIds.length - 1)] ?? null });
        break;
      case 'previous':
        patchUrl({ rowId: orderedIds[Math.max(index - 1, 0)] ?? null });
        break;
      case 'done':
        if (active) {
          (event.target as HTMLElement | null)?.blur?.();
          void saveDecisions([active], false);
        }
        break;
      case 'keepName':
        if (active) void saveDecisions([active], true);
        break;
      case 'edit':
        if (activeId) nameInputs.current.get(activeId)?.focus();
        break;
      case 'togglePillar':
        if (active && !isDone(active)) {
          const draft = draftOf(active);
          setDraft(active.exerciseId, { ...draft, isPillar: !draft.isPillar, pillarId: draft.isPillar ? draft.pillarId : null });
        }
        break;
      case 'variant':
        if (active && !isDone(active) && !draftOf(active).isPillar) setPickerOpenId(active.exerciseId);
        break;
      case 'undo':
        if (active && isDone(active)) void undoDecision(active.exerciseId);
        break;
      case 'toggleSelect':
        if (activeId) toggleSelected(activeId);
        break;
    }
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKey.current(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const toggleSelected = (exerciseId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });

  const selectedRows = ordered.filter((row) => selected.has(row.exerciseId) && !isDone(row));
  const allVisibleSelected = ordered.length > 0 && ordered.every((row) => selected.has(row.exerciseId));

  if (!roleLoading && !canReviewExercises) {
    return (
      <PageSheet>
        <EmptyState
          icon={ShieldCheck}
          title="Brak dostępu"
          description="Przegląd nazw i ćwiczeń filarowych jest dostępny tylko dla zespołu FiziYo."
        />
      </PageSheet>
    );
  }

  const renderRow = (row: ExerciseNameReviewRow, isVariant: boolean) => (
    <div
      key={row.exerciseId}
      ref={(element) => {
        if (element) rowElements.current.set(row.exerciseId, element);
        else rowElements.current.delete(row.exerciseId);
      }}
    >
      <NameReviewRowItem
        ref={(input) => {
          if (input) nameInputs.current.set(row.exerciseId, input);
          else nameInputs.current.delete(row.exerciseId);
        }}
        row={row}
        draft={draftOf(row)}
        active={row.exerciseId === activeId}
        expanded={row.exerciseId === expandedId}
        selected={selected.has(row.exerciseId)}
        saving={savingIds.has(row.exerciseId)}
        isVariant={isVariant}
        pillarCandidates={pillarCandidates(rows, row.exerciseId, allDrafts)}
        drafts={allDrafts}
        pickerOpen={pickerOpenId === row.exerciseId}
        onPickerOpenChange={(open) => setPickerOpenId(open ? row.exerciseId : null)}
        onActivate={() => patchUrl({ rowId: row.exerciseId })}
        onToggleExpanded={() => setExpandedId((current) => (current === row.exerciseId ? null : row.exerciseId))}
        onToggleSelected={() => toggleSelected(row.exerciseId)}
        onDraftChange={(draft) => setDraft(row.exerciseId, draft)}
        onDone={() => void saveDecisions([row], false)}
        onKeepName={() => void saveDecisions([row], true)}
        onUndo={() => void undoDecision(row.exerciseId)}
        onPreview={() => setPreviewRow(row)}
        onEscapeField={() => nameInputs.current.get(row.exerciseId)?.blur()}
      />
    </div>
  );

  const progress = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
  const previewEmbed =
    previewRow?.videoUrl && isYouTubeUrl(previewRow.videoUrl)
      ? getYouTubeEmbedUrl(previewRow.videoUrl)
      : previewRow?.videoUrl && isVimeoUrl(previewRow.videoUrl)
        ? getVimeoEmbedUrl(previewRow.videoUrl)
        : null;

  return (
    <PageSheet contentClassName="pb-20">
      <div className="flex flex-col gap-4" data-testid="name-review-page">
        <VerificationPageHeader />

        <Collapsible className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                data-testid="name-review-organization-select"
                value={organizationId ?? undefined}
                onValueChange={(value) => {
                  setRowOverrides({});
                  setDrafts({});
                  setSelected(new Set());
                  patchUrl({ organizationId: value, rowId: null, family: null });
                }}
              >
                <SelectTrigger className="w-72" data-testid="name-review-organization">
                  <SelectValue placeholder="Wybierz organizację" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name} ({organization.exerciseCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="tinted"
                size="sm"
                disabled={!organizationId || jobRunning || generating || withoutProposal === 0}
                onClick={() => void startGeneration(false)}
                data-testid="name-review-generate"
              >
                <Sparkles aria-hidden />
                {jobRunning
                  ? `Generuję… ${job?.proposed ?? 0}/${job?.total || withoutProposal}`
                  : `Wygeneruj propozycje (${withoutProposal})`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!organizationId || jobRunning || generating || counts.todo === 0}
                onClick={() => void startGeneration(true)}
                title="Nowe propozycje dla wszystkich wierszy „Do przejrzenia”. Zrobione zostają."
                data-testid="name-review-regenerate"
              >
                Odśwież propozycje do przejrzenia
              </Button>
            </div>
            <div className="flex min-w-60 flex-1 flex-col gap-1.5">
              <p className="text-sm text-foreground" data-testid="name-review-counter">
                Zrobione <span className="font-semibold tabular-nums">{counts.done}</span> /{' '}
                <span className="tabular-nums">{counts.total}</span> · Do przejrzenia{' '}
                <span className="font-semibold tabular-nums">{counts.todo}</span>
              </p>
              <Progress value={progress} aria-label="Postęp przeglądu" />
            </div>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="secondary" size="sm" className="group" data-testid="name-review-vocabulary-toggle">
                Słownik sprzętu
                <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" aria-hidden />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-3 border-t border-border pt-3">
            <VocabularyEditor />
          </CollapsibleContent>
        </Collapsible>

        <section className="flex flex-wrap items-center gap-2" aria-label="Filtry">
          {(['todo', 'done', 'all'] as const).map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={urlState.status === status ? 'default' : 'secondary'}
              onClick={() => patchUrl({ status, rowId: null })}
              data-testid={`name-review-filter-${status}`}
            >
              {status === 'todo' ? 'Do przejrzenia' : status === 'done' ? 'Zrobione' : 'Wszystkie'}
              <Badge
                variant="secondary"
                className={cn('tabular-nums', urlState.status === status && 'bg-background/25 text-current')}
              >
                {status === 'todo' ? counts.todo : status === 'done' ? counts.done : counts.total}
              </Badge>
            </Button>
          ))}
          <label className="ml-2 flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={urlState.pillarsOnly}
              onCheckedChange={(checked) => patchUrl({ pillarsOnly: checked === true, rowId: null })}
              data-testid="name-review-filter-pillars"
            />
            Tylko filarowe
          </label>
          <Select
            data-testid="name-review-family-select"
            value={urlState.family ?? ALL_FAMILIES}
            onValueChange={(value) => patchUrl({ family: value === ALL_FAMILIES ? null : value, rowId: null })}
          >
            <SelectTrigger className="h-8 w-52" data-testid="name-review-filter-family">
              <SelectValue placeholder="Rodzina ruchu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FAMILIES}>Wszystkie rodziny</SelectItem>
              {families.map((family) => (
                <SelectItem key={family} value={family}>
                  {family}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select data-testid="name-review-change-select" value={urlState.change} onValueChange={(value) => patchUrl({ change: value as NameReviewUrlState['change'], rowId: null })}>
            <SelectTrigger className="h-8 w-44" data-testid="name-review-filter-change">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Każda nazwa</SelectItem>
              <SelectItem value="changes">Nazwa się zmienia</SelectItem>
              <SelectItem value="same">Bez zmiany</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={urlState.query}
              placeholder="Szukaj w nazwie, propozycji i aliasach"
              className="h-8 pl-9 text-sm"
              data-testid="name-review-search"
              onChange={(event) => patchUrl({ query: event.target.value, rowId: null })}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') (event.target as HTMLInputElement).blur();
              }}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={urlState.view === 'list' ? 'secondary' : 'ghost'}
              onClick={() => patchUrl({ view: 'list' })}
              data-testid="name-review-view-list"
            >
              <Rows3 aria-hidden />
              Lista
            </Button>
            <Button
              type="button"
              size="sm"
              variant={urlState.view === 'families' ? 'secondary' : 'ghost'}
              onClick={() => patchUrl({ view: 'families' })}
              data-testid="name-review-view-families"
            >
              <ListTree aria-hidden />
              Rodziny
            </Button>
            <Button
              type="button"
              size="sm"
              variant={logOpen ? 'secondary' : 'ghost'}
              onClick={() => setLogOpen((open) => !open)}
              data-testid="name-review-log-toggle"
            >
              <History aria-hidden />
              Ostatnie zmiany
            </Button>
          </div>
        </section>

        {selectedRows.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2" data-testid="name-review-bulk">
            <span className="text-sm text-foreground">Zaznaczone: {selectedRows.length}</span>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())} data-testid="name-review-bulk-clear">
                Odznacz
              </Button>
              <Button type="button" size="sm" onClick={() => void saveDecisions(selectedRows, false)} data-testid="name-review-bulk-done">
                Zrobione dla zaznaczonych
              </Button>
            </div>
          </div>
        )}

        {logOpen && (
          <aside className="max-h-72 overflow-y-auto rounded-xl border border-border bg-card px-4 py-3" data-testid="name-review-log-panel">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Ostatnie zmiany</h2>
            <RecentChangesPanel
              entries={logData?.exerciseNameReviewLog ?? []}
              loading={logLoading}
              undoingId={[...savingIds][0] ?? null}
              pillarName={(id) => {
                const pillar = id ? rowsById.get(id) : undefined;
                return pillar ? pillar.name : null;
              }}
              onUndo={(exerciseId) => void undoDecision(exerciseId)}
            />
          </aside>
        )}

        <div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <div className="min-w-[980px]">
              <div className={`${NAME_REVIEW_GRID} border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground`}>
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) =>
                    setSelected(checked === true ? new Set(ordered.filter((row) => !isDone(row)).map((row) => row.exerciseId)) : new Set())
                  }
                  aria-label="Zaznacz wszystkie widoczne"
                  data-testid="name-review-select-all"
                />
                <span />
                <span>Obecna nazwa</span>
                <span>Propozycja · uzasadnienie AI</span>
                <span title={PILLAR_TOOLTIP}>Filarowe</span>
                <span>Wariant filarowego</span>
                <span>Status</span>
                <span />
              </div>
              {!organizationId && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Wybierz organizację, której ćwiczenia chcesz przejrzeć.</p>
              )}
              {organizationId && rowsLoading && rows.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">Wczytuję ćwiczenia…</p>
              )}
              {organizationId && !rowsLoading && ordered.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground" data-testid="name-review-empty">
                  {counts.total > 0 && counts.todo === 0 && urlState.status === 'todo'
                    ? 'Wszystko przejrzane.'
                    : 'Brak ćwiczeń dla tych filtrów.'}
                </p>
              )}
              {urlState.view === 'families'
                ? grouped.map((family) => (
                    <div key={family.pillar?.exerciseId ?? NO_FAMILY_LABEL} data-testid={`name-review-family-${family.pillar?.exerciseId ?? 'none'}`}>
                      {family.pillar ? (
                        <>
                          {renderRow(family.pillar, false)}
                          <p className="border-b border-border bg-fill-quaternary px-8 py-1 text-xs text-muted-foreground">
                            Warianty: {family.variants.length}
                          </p>
                        </>
                      ) : (
                        <p className="border-b border-border bg-fill-quaternary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                          {NO_FAMILY_LABEL} ({family.variants.length})
                        </p>
                      )}
                      {family.variants.map((row) => renderRow(row, Boolean(family.pillar)))}
                    </div>
                  ))
                : ordered.map((row) => renderRow(row, false))}
            </div>
          </div>
        </div>
      </div>

      <footer
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 py-2 backdrop-blur"
        data-testid="name-review-key-hints"
      >
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {NAME_REVIEW_KEY_HINTS.map((hint) => (
            <li key={hint.keys}>
              <kbd className="rounded border border-border bg-fill-tertiary px-1.5 py-0.5 font-mono text-[11px] text-foreground">{hint.keys}</kbd>{' '}
              {hint.label}
            </li>
          ))}
        </ul>
      </footer>

      <Dialog open={previewRow !== null} onOpenChange={(open) => !open && setPreviewRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewRow?.name ?? ''}</DialogTitle>
          </DialogHeader>
          {previewEmbed ? (
            <iframe src={previewEmbed} title="Wideo ćwiczenia" className="aspect-video w-full rounded-lg" allow="autoplay; fullscreen" />
          ) : previewRow?.videoUrl ? (
            <video src={previewRow.videoUrl} controls autoPlay loop muted className="max-h-[70vh] w-full rounded-lg bg-black/80" />
          ) : previewRow?.imageUrl || previewRow?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external exercise media of any host
            <img src={previewRow.imageUrl ?? previewRow.thumbnailUrl ?? ''} alt="" className="max-h-[70vh] w-full rounded-lg object-contain" />
          ) : (
            <p className="text-sm text-muted-foreground">To ćwiczenie nie ma wideo ani zdjęcia.</p>
          )}
          {previewRow && effectivePillarId(previewRow, allDrafts[previewRow.exerciseId]) && (
            <p className="text-xs text-muted-foreground">
              Wariant: {rowsById.get(effectivePillarId(previewRow, allDrafts[previewRow.exerciseId]) ?? '')?.name ?? '—'}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </PageSheet>
  );
}
