'use client';

import { createContext, useCallback, useContext, useState } from 'react';

import { CreateOrganizationDialog } from './CreateOrganizationDialog';

const OpenCreateOrganizationContext = createContext<(() => void) | null>(null);

/**
 * Hosts the single "Nowa organizacja" dialog above the views that open it. Entering the new
 * organization puts the organization context into loading, which swaps the switcher and the
 * settings page for skeletons; a dialog mounted there would unmount mid-submit.
 */
export function CreateOrganizationDialogProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const openDialog = useCallback(() => setOpen(true), []);

  return (
    <OpenCreateOrganizationContext.Provider value={openDialog}>
      {children}
      <CreateOrganizationDialog open={open} onOpenChange={setOpen} />
    </OpenCreateOrganizationContext.Provider>
  );
}

export function useOpenCreateOrganization(): () => void {
  const openDialog = useContext(OpenCreateOrganizationContext);
  if (!openDialog) {
    throw new Error('useOpenCreateOrganization must be used within a CreateOrganizationDialogProvider');
  }
  return openDialog;
}
