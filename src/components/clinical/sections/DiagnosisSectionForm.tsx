'use client';

import { useState, useMemo } from 'react';
import { Plus, X, Search, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DiagnosisSection, ICD10Code, ICFCode } from '@/types/clinical.types';

// Import pełnych baz danych kodów
import { ICD10_CODES, POPULAR_ICD10_CODES as POPULAR_ICD10_CODE_STRINGS, searchICD10Codes } from '@/data/icd10-codes';
import { ICF_CODES, POPULAR_ICF_CODES as POPULAR_ICF_CODE_STRINGS, searchICFCodes, ICF_CATEGORY_COLORS } from '@/data/icf-codes';

interface DiagnosisSectionFormProps {
  data: DiagnosisSection;
  onChange: (data: DiagnosisSection) => void;
  disabled?: boolean;
}

export function DiagnosisSectionForm({
  data,
  onChange,
  disabled = false,
}: DiagnosisSectionFormProps) {
  const [icd10Search, setIcd10Search] = useState('');
  const [icfSearch, setIcfSearch] = useState('');

  const updateField = <K extends keyof DiagnosisSection>(
    field: K,
    value: DiagnosisSection[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  // ICD-10 handlers
  const addIcd10Code = (code: ICD10Code) => {
    const currentCodes = data.icd10Codes || [];
    if (!currentCodes.some((c) => c.code === code.code)) {
      // Jeśli to pierwszy kod, ustaw jako primary
      const isPrimary = currentCodes.length === 0;
      updateField('icd10Codes', [...currentCodes, { ...code, isPrimary }]);
    }
    setIcd10Search('');
  };

  const removeIcd10Code = (code: string) => {
    const currentCodes = data.icd10Codes || [];
    updateField('icd10Codes', currentCodes.filter((c) => c.code !== code));
  };

  const setPrimaryIcd10 = (code: string) => {
    const currentCodes = data.icd10Codes || [];
    updateField(
      'icd10Codes',
      currentCodes.map((c) => ({ ...c, isPrimary: c.code === code }))
    );
  };

  // ICF handlers
  const addIcfCode = (code: ICFCode) => {
    const currentCodes = data.icfCodes || [];
    if (!currentCodes.some((c) => c.code === code.code)) {
      updateField('icfCodes', [...currentCodes, code]);
    }
    setIcfSearch('');
  };

  const removeIcfCode = (code: string) => {
    const currentCodes = data.icfCodes || [];
    updateField('icfCodes', currentCodes.filter((c) => c.code !== code));
  };

  // Filtrowanie kodów z pełnej bazy danych
  const filteredIcd10 = useMemo(() => {
    if (icd10Search && icd10Search.length >= 2) {
      return searchICD10Codes(icd10Search, 15).map(c => ({
        code: c.code,
        description: c.description,
        isPrimary: false,
      }));
    }
    // Pokaż popularne kody gdy nie ma wyszukiwania
    return POPULAR_ICD10_CODE_STRINGS.slice(0, 8).map(code => {
      const found = ICD10_CODES.find(c => c.code === code);
      return found ? { code: found.code, description: found.description, isPrimary: false } : null;
    }).filter(Boolean) as ICD10Code[];
  }, [icd10Search]);

  const filteredIcf = useMemo(() => {
    if (icfSearch && icfSearch.length >= 2) {
      return searchICFCodes(icfSearch, 15).map(c => ({
        code: c.code,
        description: c.description,
        category: c.category,
      }));
    }
    // Pokaż popularne kody gdy nie ma wyszukiwania
    return POPULAR_ICF_CODE_STRINGS.slice(0, 8).map(code => {
      const found = ICF_CODES.find(c => c.code === code);
      return found ? { code: found.code, description: found.description, category: found.category } : null;
    }).filter(Boolean) as ICFCode[];
  }, [icfSearch]);

  return (
    <div className="space-y-6">
      {/* Kody ICD-10 */}
      <div className="space-y-3">
        <Label>Rozpoznanie ICD-10</Label>

        {/* Wybrane kody */}
        {(data.icd10Codes?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {data.icd10Codes?.map((code) => (
              <Badge
                key={code.code}
                variant={code.isPrimary ? 'default' : 'secondary'}
                className={cn(
                  'pl-2 pr-1 py-1.5 gap-1.5',
                  code.isPrimary && 'bg-primary'
                )}
              >
                {code.isPrimary && <Star className="h-3 w-3 fill-current" />}
                <span className="font-mono font-semibold">{code.code}</span>
                <span className="text-xs opacity-80">- {code.description}</span>
                {!code.isPrimary && !disabled && (
                  <button
                    type="button"
                    onClick={() => setPrimaryIcd10(code.code)}
                    className="ml-1 p-0.5 hover:bg-white/20 rounded"
                    title="Ustaw jako główne"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeIcd10Code(code.code)}
                    className="ml-1 p-0.5 hover:bg-white/20 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Wyszukiwarka */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={icd10Search}
            onChange={(e) => setIcd10Search(e.target.value)}
            placeholder="Wpisz min. 2 znaki, np. M54, ból, kolano..."
            className="pl-9"
            disabled={disabled}
          />
        </div>

        {/* Info o wynikach */}
        {icd10Search && icd10Search.length >= 2 && (
          <p className="text-xs text-muted-foreground">
            Znaleziono {filteredIcd10.length} kodów dla &quot;{icd10Search}&quot;
          </p>
        )}
        {(!icd10Search || icd10Search.length < 2) && (
          <p className="text-xs text-muted-foreground">
            Popularne kody ICD-10 w fizjoterapii:
          </p>
        )}

        {/* Sugestie */}
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {filteredIcd10.map((code) => {
            const isAdded = data.icd10Codes?.some((c) => c.code === code.code);
            return (
              <button
                key={code.code}
                type="button"
                onClick={() => !isAdded && addIcd10Code(code)}
                disabled={disabled || isAdded}
                className={cn(
                  'px-2 py-1 text-xs rounded-lg border transition-all',
                  isAdded
                    ? 'border-primary/30 bg-primary/10 text-primary opacity-50 cursor-not-allowed'
                    : 'border-border/60 bg-surface hover:border-primary/50 hover:bg-primary/5'
                )}
              >
                <span className="font-mono font-semibold">{code.code}</span>
                <span className="text-muted-foreground ml-1">- {code.description}</span>
                {!isAdded && <Plus className="inline-block h-3 w-3 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kody ICF */}
      <div className="space-y-3">
        <Label>Kody ICF (klasyfikacja funkcjonowania)</Label>

        {/* Wybrane kody */}
        {(data.icfCodes?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {data.icfCodes?.map((code) => {
              const colorClass = code.category ? ICF_CATEGORY_COLORS[code.category] : '';
              return (
                <Badge
                  key={code.code}
                  variant="outline"
                  className={cn('pl-2 pr-1 py-1.5 gap-1.5', colorClass)}
                >
                  <span className="font-mono font-semibold">{code.code}</span>
                  <span className="text-xs opacity-80">- {code.description}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeIcfCode(code.code)}
                      className="ml-1 p-0.5 hover:bg-white/20 rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Wyszukiwarka */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={icfSearch}
            onChange={(e) => setIcfSearch(e.target.value)}
            placeholder="Wpisz min. 2 znaki, np. b710, siła, chodzenie..."
            className="pl-9"
            disabled={disabled}
          />
        </div>

        {/* Info o wynikach */}
        {icfSearch && icfSearch.length >= 2 && (
          <p className="text-xs text-muted-foreground">
            Znaleziono {filteredIcf.length} kodów dla &quot;{icfSearch}&quot;
          </p>
        )}
        {(!icfSearch || icfSearch.length < 2) && (
          <p className="text-xs text-muted-foreground">
            Popularne kody ICF w fizjoterapii (b=funkcje, s=struktury, d=aktywność):
          </p>
        )}

        {/* Sugestie */}
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {filteredIcf.map((code) => {
            const isAdded = data.icfCodes?.some((c) => c.code === code.code);
            const colorClass = code.category ? ICF_CATEGORY_COLORS[code.category] : '';
            return (
              <button
                key={code.code}
                type="button"
                onClick={() => !isAdded && addIcfCode(code)}
                disabled={disabled || isAdded}
                className={cn(
                  'px-2 py-1 text-xs rounded-lg border transition-all',
                  isAdded
                    ? cn(colorClass, 'opacity-50 cursor-not-allowed')
                    : 'border-border/60 bg-surface hover:border-info/50 hover:bg-info/5'
                )}
              >
                <span className="font-mono font-semibold">{code.code}</span>
                <span className="text-muted-foreground ml-1 truncate max-w-[200px]">- {code.description}</span>
                {!isAdded && <Plus className="inline-block h-3 w-3 ml-1 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Diagnostyka różnicowa */}
      <div className="space-y-2">
        <Label htmlFor="differentialDiagnosis">Diagnostyka różnicowa</Label>
        <Textarea
          id="differentialDiagnosis"
          value={data.differentialDiagnosis || ''}
          onChange={(e) => updateField('differentialDiagnosis', e.target.value)}
          placeholder="Inne rozważane rozpoznania..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>

      {/* Rozumowanie kliniczne */}
      <div className="space-y-2">
        <Label htmlFor="clinicalReasoning">Rozumowanie i dodatkowe uwagi</Label>
        <Textarea
          id="clinicalReasoning"
          value={data.clinicalReasoning || ''}
          onChange={(e) => updateField('clinicalReasoning', e.target.value)}
          placeholder="Uzasadnienie rozpoznania..."
          className="min-h-[60px]"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
