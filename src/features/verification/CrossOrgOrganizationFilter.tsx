'use client';

import { useMemo, useState } from 'react';
import { Building2, ChevronDown, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CrossOrgVerificationOrganization } from '@/graphql/types/adminExercise.types';
import { cn } from '@/lib/utils';

interface CrossOrgOrganizationFilterProps {
  readonly organizations: readonly CrossOrgVerificationOrganization[];
  /** Puste = wszystkie organizacje. */
  readonly selectedIds: readonly string[];
  readonly onChange: (nextSelectedIds: string[]) => void;
  readonly isLoading?: boolean;
}

const SEARCH_THRESHOLD = 8;

function triggerLabel(
  organizations: readonly CrossOrgVerificationOrganization[],
  selectedIds: readonly string[]
): string {
  if (selectedIds.length === 0) {
    return 'Wszystkie organizacje';
  }
  if (selectedIds.length === 1) {
    return (
      organizations.find((organization) => organization.organizationId === selectedIds[0])?.organizationName ??
      '1 organizacja'
    );
  }
  return `Wybrane: ${selectedIds.length}`;
}

/** Wybór organizacji w kolejce „Organizacje klientów”: wszystkie albo dowolny podzbiór. */
export function CrossOrgOrganizationFilter({
  organizations,
  selectedIds,
  onChange,
  isLoading = false,
}: CrossOrgOrganizationFilterProps) {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleOrganizations = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pl');
    if (!normalized) {
      return organizations;
    }
    return organizations.filter((organization) =>
      organization.organizationName.toLocaleLowerCase('pl').includes(normalized)
    );
  }, [organizations, query]);

  const toggle = (organizationId: string, checked: boolean) => {
    const next = checked
      ? [...selectedIds, organizationId]
      : selectedIds.filter((selectedId) => selectedId !== organizationId);
    onChange(Array.from(new Set(next)));
  };

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery('')}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'max-w-full gap-2 bg-surface border-border/60',
            selectedIds.length > 0 && 'border-primary/40 bg-primary/5'
          )}
          aria-label="Organizacje"
          data-testid="cross-org-verification-organization-filter"
        >
          <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{triggerLabel(organizations, selectedIds)}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        {organizations.length > SEARCH_THRESHOLD && (
          <div className="relative p-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              // Radix przechwytuje litery do nawigacji po elementach menu; pole ma dostać je samo.
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Szukaj organizacji..."
              aria-label="Szukaj organizacji"
              className="h-8 pl-8"
              data-testid="cross-org-verification-organization-search"
            />
          </div>
        )}
        <DropdownMenuCheckboxItem
          checked={selectedIds.length === 0}
          onCheckedChange={() => onChange([])}
          onSelect={(event) => event.preventDefault()}
          data-testid="cross-org-verification-organization-all"
        >
          Wszystkie organizacje
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <div className="max-h-72 overflow-y-auto">
          {isLoading && organizations.length === 0 ? (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">Ładowanie...</div>
          ) : visibleOrganizations.length === 0 ? (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">Brak organizacji</div>
          ) : (
            visibleOrganizations.map((organization) => (
              <DropdownMenuCheckboxItem
                key={organization.organizationId}
                checked={selectedSet.has(organization.organizationId)}
                onCheckedChange={(checked) => toggle(organization.organizationId, checked === true)}
                onSelect={(event) => event.preventDefault()}
                data-testid={`cross-org-verification-organization-option-${organization.organizationId}`}
              >
                <span className="min-w-0 flex-1 truncate">{organization.organizationName}</span>
                <span
                  className="ml-3 shrink-0 tabular-nums text-xs text-muted-foreground"
                  title={`Oczekujące: ${organization.pendingCount}, wszystkie wysłane: ${organization.totalCount}`}
                >
                  {organization.pendingCount}
                </span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
