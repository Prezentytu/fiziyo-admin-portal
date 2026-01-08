'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type PatientFilterType = 'all' | 'my' | 'unassigned';

interface PatientFilterProps {
  value: PatientFilterType;
  onChange: (value: PatientFilterType) => void;
  counts?: {
    all: number;
    my: number;
    unassigned: number;
  };
  className?: string;
}

const STORAGE_KEY = 'fiziyo-patient-filter';

const filterOptions: Array<{
  value: PatientFilterType;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  {
    value: 'my',
    label: 'Moi pacjenci',
    icon: UserCheck,
    description: 'Pacjenci przypisani do mnie',
  },
  {
    value: 'all',
    label: 'Wszyscy',
    icon: Users,
    description: 'Wszyscy pacjenci w organizacji',
  },
  {
    value: 'unassigned',
    label: 'Nieprzypisani',
    icon: UserX,
    description: 'Pacjenci bez przypisanego fizjoterapeuty',
  },
];

export function PatientFilter({ value, onChange, counts, className }: PatientFilterProps) {
  const [mounted, setMounted] = useState(false);

  // Load saved filter from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY) as PatientFilterType | null;
    if (saved && ['all', 'my', 'unassigned'].includes(saved)) {
      onChange(saved);
    }
  }, [onChange]);

  // Save filter to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, value);
    }
  }, [value, mounted]);

  const currentOption = filterOptions.find((opt) => opt.value === value) || filterOptions[0];
  const Icon = currentOption.icon;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as PatientFilterType)}>
      <SelectTrigger
        className={cn('w-[200px] bg-surface border-border/60', className)}
        data-testid="patient-filter-dropdown"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Wybierz filtr" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {filterOptions.map((option) => {
          const OptionIcon = option.icon;
          const count = counts?.[option.value];
          return (
            <SelectItem
              key={option.value}
              value={option.value}
              data-testid={`patient-filter-option-${option.value}`}
            >
              <div className="flex items-center gap-2">
                <OptionIcon className="h-4 w-4 text-muted-foreground" />
                <span>{option.label}</span>
                {count !== undefined && (
                  <span className="ml-auto text-xs text-muted-foreground">({count})</span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function usePatientFilter(defaultValue: PatientFilterType = 'my') {
  const [filter, setFilter] = useState<PatientFilterType>(defaultValue);
  return { filter, setFilter };
}
