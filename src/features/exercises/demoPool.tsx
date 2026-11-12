'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';

import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { GET_DEMO_EXERCISE_IDS_QUERY } from '@/graphql/queries/demoPool.queries';
import { GET_ORGANIZATION_DEMO_POOL_QUERY } from '@/graphql/queries/organizations.queries';
import { cn } from '@/lib/utils';

export interface DemoPool {
  /** true dopiero, gdy API potwierdzi dostęp gabinetu do puli demo; API bez tego pola = false. */
  readonly enabled: boolean;
  /** Ćwiczenia z puli demo widoczne w bibliotece gabinetu. */
  readonly demoExerciseIds: ReadonlySet<string>;
}

interface DemoPoolContextValue extends DemoPool {
  /** Zleca pobranie identyfikatorów demo (jednorazowo na sesję panelu); bez puli nic nie robi. */
  readonly requestDemoExerciseIds: () => void;
}

const NO_DEMO_POOL: DemoPoolContextValue = {
  enabled: false,
  demoExerciseIds: new Set<string>(),
  requestDemoExerciseIds: () => undefined,
};

const DemoPoolContext = createContext<DemoPoolContextValue>(NO_DEMO_POOL);

interface DemoPoolResponse {
  organizationById?: { id: string; demoPoolEnabled?: boolean | null } | null;
}

interface DemoExerciseIdsResponse {
  firstWindow?: ReadonlyArray<{ id: string; availability?: string | null }> | null;
  secondWindow?: ReadonlyArray<{ id: string; availability?: string | null }> | null;
}

/**
 * Pula demo gabinetu dla biblioteki i wybieraków. Oba zapytania są poza zapytaniami ekranów i z errorPolicy
 * 'ignore': API bez pól puli demo (przed fizjo-app#388) daje „brak puli”, a ekrany działają jak dotąd.
 */
export function DemoPoolQueryProvider({
  organizationId,
  children,
}: Readonly<{ organizationId: string | null | undefined; children: ReactNode }>) {
  const { data: poolData } = useQuery<DemoPoolResponse>(GET_ORGANIZATION_DEMO_POOL_QUERY, {
    variables: { id: organizationId ?? '' },
    skip: !organizationId,
    errorPolicy: 'ignore',
  });
  const enabled = poolData?.organizationById?.demoPoolEnabled === true;
  // Identyfikatory (do 10 000 par) idą dopiero, gdy jakiś ekran pokazuje znaczki: samo wejście do panelu ich nie pobiera.
  const [idsRequested, setIdsRequested] = useState(false);
  const requestDemoExerciseIds = useCallback(() => setIdsRequested(true), []);

  const { data: idsData } = useQuery<DemoExerciseIdsResponse>(GET_DEMO_EXERCISE_IDS_QUERY, {
    variables: { organizationId: organizationId ?? '' },
    skip: !organizationId || !enabled || !idsRequested,
    errorPolicy: 'ignore',
  });

  const value = useMemo<DemoPoolContextValue>(() => {
    if (!enabled) return NO_DEMO_POOL;
    const demoExerciseIds = new Set<string>();
    for (const exercise of [...(idsData?.firstWindow ?? []), ...(idsData?.secondWindow ?? [])]) {
      if (exercise.availability === 'DEMO') demoExerciseIds.add(exercise.id);
    }
    return { enabled, demoExerciseIds, requestDemoExerciseIds };
  }, [enabled, idsData, requestDemoExerciseIds]);

  return <DemoPoolContext.Provider value={value}>{children}</DemoPoolContext.Provider>;
}

export function DemoPoolProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { currentOrganization } = useOrganization();
  return <DemoPoolQueryProvider organizationId={currentOrganization?.organizationId}>{children}</DemoPoolQueryProvider>;
}

/** Czy gabinet ma pulę demo. Poza providerem (testy, ekrany spoza panelu): brak puli demo. Nie pobiera identyfikatorów. */
export function useDemoPool(): DemoPool {
  const { enabled, demoExerciseIds } = useContext(DemoPoolContext);
  return { enabled, demoExerciseIds };
}

/** Pula demo wraz z identyfikatorami demo; wywołanie zleca ich pobranie (leniwie, raz na sesję panelu). */
export function useDemoPoolWithIds(): DemoPool {
  const { enabled, demoExerciseIds, requestDemoExerciseIds } = useContext(DemoPoolContext);
  useEffect(() => {
    if (enabled) requestDemoExerciseIds();
  }, [enabled, requestDemoExerciseIds]);
  return { enabled, demoExerciseIds };
}

/** Znaczek „Demo” przy ćwiczeniu w wybierakach; nic, gdy ćwiczenie nie jest z puli demo. */
export function ExerciseDemoBadge({
  exerciseId,
  testId,
  className,
}: Readonly<{ exerciseId: string; testId: string; className?: string }>) {
  const { demoExerciseIds } = useDemoPoolWithIds();
  if (!demoExerciseIds.has(exerciseId)) return null;
  return (
    <Badge
      variant="outline"
      data-testid={testId}
      title="Ćwiczenie z puli demo. Widzą je tylko gabinety z dostępem do puli demo."
      className={cn(
        'shrink-0 border-status-warning/30 bg-status-warning-muted text-[9px] text-status-warning',
        className
      )}
    >
      Demo
    </Badge>
  );
}
