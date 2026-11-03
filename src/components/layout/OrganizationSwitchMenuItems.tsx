'use client';

import Image from 'next/image';

import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';
import { getInitialsFromName } from '@/utils/textUtils';

interface OrganizationSwitchMenuItemsProps {
  /** Each item gets `${testIdPrefix}-${organizationId}`. */
  readonly testIdPrefix: string;
  readonly onSwitch?: () => void;
}

/** "Przełącz organizację" section of an account menu; renders nothing for a single organization. */
export function OrganizationSwitchMenuItems({ testIdPrefix, onSwitch }: OrganizationSwitchMenuItemsProps) {
  const { hasMultipleOrganizations, currentOrganization, organizations, switchOrganization, isSwitching } =
    useOrganization();

  if (!hasMultipleOrganizations) return null;

  return (
    <>
      <DropdownMenuLabel className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
        Przełącz organizację
      </DropdownMenuLabel>
      {organizations.map((org) => {
        const isActive = org.organizationId === currentOrganization?.organizationId;
        return (
          <DropdownMenuItem
            key={org.organizationId}
            onClick={() => {
              if (!isActive && !isSwitching) {
                switchOrganization(org.organizationId);
                onSwitch?.();
              }
            }}
            data-testid={`${testIdPrefix}-${org.organizationId}`}
            className={cn(
              'gap-3 px-3 py-2 cursor-pointer',
              isActive && 'bg-primary/10',
              isSwitching && 'opacity-50 pointer-events-none'
            )}
          >
            {org.logoUrl ? (
              <span className="relative block h-6 w-6 rounded-md overflow-hidden shrink-0">
                <Image src={org.logoUrl} alt={org.organizationName} fill className="object-cover" sizes="24px" />
              </span>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-light text-[10px] font-semibold text-muted-foreground">
                {getInitialsFromName(org.organizationName)}
              </div>
            )}
            <span className={cn('flex-1 truncate', isActive && 'font-medium')}>{org.organizationName}</span>
            {isActive && <span className="text-[10px] text-primary">Aktywna</span>}
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
    </>
  );
}
