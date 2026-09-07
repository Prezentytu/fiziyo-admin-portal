import { lazy, Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UserPlus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import { AccessibilitySettings } from '@/components/settings/AccessibilitySettings';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHero } from '@/components/shared/page/PageHero';
import { StatTiles } from '@/components/shared/page/StatTiles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDialogShortcuts } from '@/hooks/useDialogShortcuts';
import '@/app/globals.css';

const SelectionPreview = lazy(() => import('./selection'));

function Preview() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('Plan rehabilitacji');
  const handleSave = () => {
    toast.success('Zapisano zmiany');
    setIsOpen(false);
  };
  useDialogShortcuts({ open: isOpen, onClose: () => setIsOpen(false), onSubmit: handleSave });

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <div aria-hidden="true" className="size-9 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/icon.png)' }} />
          <span className="text-xl font-semibold">FiziYo</span>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-6xl space-y-8 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-normal">Ustawienia</h1>
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <AccessibilitySettings />
          <section aria-label="Plany" className="min-w-0 space-y-6 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <PageHero title="Utwórz plan" icon={<UserPlus />} onClick={() => setIsOpen(true)} />
            <StatTiles tiles={[{ id: 'plans', label: 'Plany', value: 12 }, { id: 'exercises', label: 'Ćwiczenia', value: 48 }]} />
            <div className="flex items-center gap-2 text-sm text-success">
              <Check aria-hidden="true" className="size-4" />
              <span>Aktualne dane</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button data-testid="preview-notification" variant="outline" onClick={() => toast.success('Zapisano zmiany')}>Zapisz zmiany</Button>
              <Button data-testid="preview-cancel" variant="ghost" onClick={() => toast('Anulowano')}>Anuluj</Button>
            </div>
          </section>
        </div>
      </main>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent data-testid="preview-dialog">
          <DialogHeader>
            <DialogTitle>Nowy plan</DialogTitle>
            <DialogDescription>Podstawowe parametry</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="preview-plan-name">Nazwa planu</Label>
            <Input data-testid="preview-name-input" id="preview-plan-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <DialogFooter>
            <Button data-testid="preview-dialog-cancel" variant="outline" onClick={() => setIsOpen(false)}>Anuluj</Button>
            <Button data-testid="preview-dialog-save" onClick={handleSave}>Utwórz plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <AccessibilityProvider>
    {new URLSearchParams(window.location.search).get('view') === 'selection' ? <Suspense fallback={<p>Loading</p>}><SelectionPreview /></Suspense> : <Preview />}
    <Toaster />
  </AccessibilityProvider>
);