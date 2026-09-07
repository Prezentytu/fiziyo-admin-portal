import { useState } from 'react';
import { SelectSetStep } from '@/features/assignment/SelectSetStep';
import type { ExerciseSet } from '@/features/assignment/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { StatTiles } from '@/components/shared/page/StatTiles';

const fixture: ExerciseSet = {
  id: 'synthetic-set',
  name: 'Syntetyczny zestaw testowy z bardzo dluga nazwa i slowem RehabilitacjaIndywidualna',
  description: 'Dane wylacznie do kontroli ukladu.',
  exerciseMappings: [],
};

export default function SelectionPreview() {
  const [selectedSet, setSelectedSet] = useState<ExerciseSet | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const empty = new URLSearchParams(window.location.search).has('empty');

  return (
    <main className="min-w-0 p-4">
      <StatTiles variant="filters" tiles={[
        { id: 'all', label: 'Wszyscy pacjenci', value: 10, active: activeFilter === 'all', onClick: () => setActiveFilter('all') },
        { id: 'attention', label: 'Wymagaja uwagi', value: 3, active: activeFilter === 'attention', onClick: () => setActiveFilter('attention') },
      ]} />
      <Tabs defaultValue="overview" className="mt-4 min-w-0">
        <TabsList variant="underline" aria-label="Widok pacjenta">
          <TabsTrigger value="overview" activeVariant="underline" data-testid="preview-overview-tab">Przeglad</TabsTrigger>
          <TabsTrigger value="visit" activeVariant="underline" data-testid="preview-visit-tab">Wizyta</TabsTrigger>
          <TabsTrigger value="activity" activeVariant="underline" data-testid="preview-activity-tab">Aktywnosc</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" forceMount className="h-[70dvh] min-h-0 overflow-y-auto data-[state=inactive]:hidden">
          <SelectSetStep exerciseSets={empty ? [] : [fixture]} selectedSet={selectedSet} onSelectSet={setSelectedSet} onCreateSet={() => setSelectedSet(fixture)} patientName="Syntetyczny Pacjent" />
        </TabsContent>
        <TabsContent value="visit" forceMount className="data-[state=inactive]:hidden">
          <Textarea aria-label="Syntetyczny transkrypt" data-testid="preview-transcript" />
        </TabsContent>
        <TabsContent value="activity" forceMount className="data-[state=inactive]:hidden">Brak aktywnosci</TabsContent>
      </Tabs>
    </main>
  );
}