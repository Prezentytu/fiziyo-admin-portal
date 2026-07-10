import { useCallback, useMemo, useState } from 'react';

export interface VerificationSelectionState {
  selectedIds: string[];
  selectedVisibleIds: string[];
  selectedCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  isSelected: (exerciseId: string) => boolean;
  toggle: (exerciseId: string) => void;
  toggleVisible: () => void;
  clear: () => void;
  remove: (exerciseIds: string[]) => void;
  pruneToVisible: () => void;
}

export function getSelectedVisibleIds(selectedIds: string[], visibleIds: string[]): string[] {
  const visibleIdSet = new Set(visibleIds);
  return selectedIds.filter((exerciseId) => visibleIdSet.has(exerciseId));
}

export function toggleVisibleSelection(selectedIds: string[], visibleIds: string[]): string[] {
  const selectedVisibleIds = getSelectedVisibleIds(selectedIds, visibleIds);
  const hasAllVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  if (hasAllVisibleSelected) {
    const visibleIdSet = new Set(visibleIds);
    return selectedIds.filter((exerciseId) => !visibleIdSet.has(exerciseId));
  }

  return Array.from(new Set([...selectedIds, ...visibleIds]));
}

export function removeSelectedIds(selectedIds: string[], exerciseIds: string[]): string[] {
  const removedIdSet = new Set(exerciseIds);
  return selectedIds.filter((exerciseId) => !removedIdSet.has(exerciseId));
}

export function useVerificationSelection(visibleIds: string[]): VerificationSelectionState {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedVisibleIds = useMemo(() => getSelectedVisibleIds(selectedIds, visibleIds), [selectedIds, visibleIds]);

  const toggle = useCallback((exerciseId: string) => {
    setSelectedIds((currentIds) =>
      currentIds.includes(exerciseId)
        ? currentIds.filter((currentId) => currentId !== exerciseId)
        : [...currentIds, exerciseId]
    );
  }, []);

  const toggleVisible = useCallback(() => {
    setSelectedIds((currentIds) => toggleVisibleSelection(currentIds, visibleIds));
  }, [visibleIds]);

  const clear = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const remove = useCallback((exerciseIds: string[]) => {
    setSelectedIds((currentIds) => removeSelectedIds(currentIds, exerciseIds));
  }, []);

  const pruneToVisible = useCallback(() => {
    setSelectedIds((currentIds) => getSelectedVisibleIds(currentIds, visibleIds));
  }, [visibleIds]);

  return {
    selectedIds,
    selectedVisibleIds,
    selectedCount: selectedIds.length,
    allVisibleSelected: visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length,
    someVisibleSelected: selectedVisibleIds.length > 0 && selectedVisibleIds.length < visibleIds.length,
    isSelected: (exerciseId: string) => selectedIds.includes(exerciseId),
    toggle,
    toggleVisible,
    clear,
    remove,
    pruneToVisible,
  };
}
