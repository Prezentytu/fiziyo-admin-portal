'use client';

import { useState } from 'react';
import { Plus, X, Check, Minus, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExaminationSection, SpecialTest, RangeOfMotionEntry } from '@/types/clinical.types';

// Predefiniowane testy specjalne
const COMMON_TESTS = [
  { name: 'Test Lachmana', category: 'kolano' },
  { name: 'Test McMurraya', category: 'kolano' },
  { name: 'Test szuflady przedniej', category: 'kolano' },
  { name: 'Test Thompsona', category: 'staw skokowy' },
  { name: 'Test Neera', category: 'bark' },
  { name: 'Test Hawkinsa', category: 'bark' },
  { name: 'Test FABER', category: 'biodro' },
  { name: 'Test SLR', category: 'kręgosłup' },
  { name: 'Test Lasegue\'a', category: 'kręgosłup' },
  { name: 'Test Spurlinga', category: 'kręgosłup szyjny' },
];

// Predefiniowane ruchy ROM
const COMMON_ROM = [
  { name: 'Zgięcie', suffix: '°' },
  { name: 'Wyprost', suffix: '°' },
  { name: 'Odwiedzenie', suffix: '°' },
  { name: 'Przywiedzenie', suffix: '°' },
  { name: 'Rotacja wewnętrzna', suffix: '°' },
  { name: 'Rotacja zewnętrzna', suffix: '°' },
];

interface ExaminationSectionFormProps {
  data: ExaminationSection;
  onChange: (data: ExaminationSection) => void;
  disabled?: boolean;
}

export function ExaminationSectionForm({
  data,
  onChange,
  disabled = false,
}: ExaminationSectionFormProps) {
  const [newTestName, setNewTestName] = useState('');
  const [newRomName, setNewRomName] = useState('');
  const [newRomValue, setNewRomValue] = useState('');

  const updateField = <K extends keyof ExaminationSection>(
    field: K,
    value: ExaminationSection[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  // Test handlers
  const addTest = (name: string) => {
    const currentTests = data.specialTests || [];
    if (!currentTests.some((t) => t.name === name)) {
      updateField('specialTests', [...currentTests, { name, result: undefined, notes: '' }]);
    }
    setNewTestName('');
  };

  const updateTestResult = (name: string, result: 'positive' | 'negative' | 'inconclusive' | undefined) => {
    const currentTests = data.specialTests || [];
    updateField(
      'specialTests',
      currentTests.map((t) => (t.name === name ? { ...t, result } : t))
    );
  };

  const updateTestNotes = (name: string, notes: string) => {
    const currentTests = data.specialTests || [];
    updateField(
      'specialTests',
      currentTests.map((t) => (t.name === name ? { ...t, notes } : t))
    );
  };

  const removeTest = (name: string) => {
    const currentTests = data.specialTests || [];
    updateField('specialTests', currentTests.filter((t) => t.name !== name));
  };

  // ROM handlers
  const addRom = (movement: string, value: number) => {
    const currentRom = data.rangeOfMotion || [];
    const newEntry: RangeOfMotionEntry = { movement, value };
    updateField('rangeOfMotion', [...currentRom, newEntry]);
    setNewRomName('');
    setNewRomValue('');
  };

  const updateRom = (index: number, value: number) => {
    const currentRom = data.rangeOfMotion || [];
    updateField(
      'rangeOfMotion',
      currentRom.map((entry, i) => (i === index ? { ...entry, value } : entry))
    );
  };

  const removeRom = (index: number) => {
    const currentRom = data.rangeOfMotion || [];
    updateField('rangeOfMotion', currentRom.filter((_, i) => i !== index));
  };

  const isRomAdded = (movement: string): boolean => {
    return (data.rangeOfMotion || []).some((entry) => entry.movement === movement);
  };

  return (
    <div className="space-y-6">
      {/* Ocena postawy */}
      <div className="space-y-2">
        <Label htmlFor="posture">Ocena postawy ciała</Label>
        <Textarea
          id="posture"
          value={data.posture || ''}
          onChange={(e) => updateField('posture', e.target.value)}
          placeholder="Opisz postawę pacjenta (przodopochylenie miednicy, kifoza, skolioza...)"
          className="min-h-[80px]"
          disabled={disabled}
        />
      </div>

      {/* Zakres ruchu (ROM) */}
      <div className="space-y-3">
        <Label>Zakres ruchu (ROM)</Label>
        
        {/* Istniejące ROM */}
        {(data.rangeOfMotion?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {data.rangeOfMotion?.map((entry, index) => (
              <div key={`${entry.movement}-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-border/40">
                <span className="flex-1 text-sm font-medium">{entry.movement}</span>
                <Input
                  type="number"
                  value={entry.value ?? ''}
                  onChange={(e) => updateRom(index, Number(e.target.value))}
                  className="w-20"
                  disabled={disabled}
                />
                <span className="text-sm text-muted-foreground">°</span>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeRom(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick add ROM */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_ROM.map((rom) => {
            const added = isRomAdded(rom.name);
            return (
              <button
                key={rom.name}
                type="button"
                onClick={() => !added && addRom(rom.name, 0)}
                disabled={disabled || added}
                className={cn(
                  'px-2 py-1 text-xs rounded-lg border transition-all',
                  added
                    ? 'border-primary/30 bg-primary/10 text-primary opacity-50'
                    : 'border-border/60 bg-surface hover:border-primary/50 hover:bg-primary/5'
                )}
              >
                {rom.name}
                {!added && <Plus className="inline-block h-3 w-3 ml-1" />}
              </button>
            );
          })}
        </div>

        {/* Custom ROM */}
        {!disabled && (
          <div className="flex gap-2">
            <Input
              value={newRomName}
              onChange={(e) => setNewRomName(e.target.value)}
              placeholder="Nazwa ruchu..."
              className="flex-1"
            />
            <Input
              type="number"
              value={newRomValue}
              onChange={(e) => setNewRomValue(e.target.value)}
              placeholder="°"
              className="w-20"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => newRomName && addRom(newRomName, Number(newRomValue) || 0)}
              disabled={!newRomName}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Testy specjalne */}
      <div className="space-y-3">
        <Label>Testy specjalne / diagnostyczne</Label>
        
        {/* Istniejące testy */}
        {(data.specialTests?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {data.specialTests?.map((test) => (
              <div key={test.name} className="p-3 rounded-lg bg-surface border border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{test.name}</span>
                  <div className="flex items-center gap-1">
                    {/* Wyniki */}
                    <button
                      type="button"
                      onClick={() => updateTestResult(test.name!, test.result === 'positive' ? undefined : 'positive')}
                      disabled={disabled}
                      className={cn(
                        'p-1.5 rounded-lg transition-all',
                        test.result === 'positive'
                          ? 'bg-red-500/20 text-red-500'
                          : 'hover:bg-surface-light text-muted-foreground'
                      )}
                      title="Pozytywny"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTestResult(test.name!, test.result === 'negative' ? undefined : 'negative')}
                      disabled={disabled}
                      className={cn(
                        'p-1.5 rounded-lg transition-all',
                        test.result === 'negative'
                          ? 'bg-green-500/20 text-green-500'
                          : 'hover:bg-surface-light text-muted-foreground'
                      )}
                      title="Negatywny"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTestResult(test.name!, test.result === 'inconclusive' ? undefined : 'inconclusive')}
                      disabled={disabled}
                      className={cn(
                        'p-1.5 rounded-lg transition-all',
                        test.result === 'inconclusive'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'hover:bg-surface-light text-muted-foreground'
                      )}
                      title="Niejednoznaczny"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-2"
                        onClick={() => removeTest(test.name!)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  value={test.notes || ''}
                  onChange={(e) => updateTestNotes(test.name!, e.target.value)}
                  placeholder="Notatki do testu..."
                  className="text-xs"
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        )}

        {/* Quick add tests */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TESTS.slice(0, 6).map((test) => {
            const isAdded = data.specialTests?.some((t) => t.name === test.name);
            return (
              <button
                key={test.name}
                type="button"
                onClick={() => !isAdded && addTest(test.name)}
                disabled={disabled || isAdded}
                className={cn(
                  'px-2 py-1 text-xs rounded-lg border transition-all',
                  isAdded
                    ? 'border-primary/30 bg-primary/10 text-primary opacity-50'
                    : 'border-border/60 bg-surface hover:border-primary/50 hover:bg-primary/5'
                )}
              >
                {test.name}
                {!isAdded && <Plus className="inline-block h-3 w-3 ml-1" />}
              </button>
            );
          })}
        </div>

        {/* Custom test */}
        {!disabled && (
          <div className="flex gap-2">
            <Input
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              placeholder="Dodaj inny test..."
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => newTestName && addTest(newTestName)}
              disabled={!newTestName}
            >
              <Plus className="h-4 w-4 mr-1" />
              Dodaj
            </Button>
          </div>
        )}
      </div>

      {/* Siła mięśniowa */}
      <div className="space-y-2">
        <Label htmlFor="muscleStrength">Siła mięśniowa</Label>
        <Textarea
          id="muscleStrength"
          value={data.muscleStrength || ''}
          onChange={(e) => updateField('muscleStrength', e.target.value)}
          placeholder="Ocena siły mięśniowej (skala Lovetta 0-5)..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>

      {/* Palpacja */}
      <div className="space-y-2">
        <Label htmlFor="palpation">Badanie palpacyjne</Label>
        <Textarea
          id="palpation"
          value={data.palpation || ''}
          onChange={(e) => updateField('palpation', e.target.value)}
          placeholder="Wyniki badania palpacyjnego..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>

      {/* Obserwacje */}
      <div className="space-y-2">
        <Label htmlFor="observations">Obserwacje</Label>
        <Textarea
          id="observations"
          value={data.observations || ''}
          onChange={(e) => updateField('observations', e.target.value)}
          placeholder="Inne obserwacje z badania..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

