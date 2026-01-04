'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { User, Search, AlertTriangle, Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GET_ALL_THERAPIST_PATIENTS_QUERY } from '@/graphql/queries/therapists.queries';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { UserByClerkIdResponse, TherapistPatientsResponse } from '@/types/apollo';

interface PatientOption {
  id: string;
  fullname: string;
  email?: string;
  image?: string;
}

interface PatientContextPanelProps {
  /** Nazwa pacjenta wykryta przez AI z dokumentu */
  detectedPatientName?: string;
  /** Obecnie wybrany ID pacjenta */
  selectedPatientId?: string;
  /** Callback przy zmianie wyboru */
  onPatientChange: (patientId: string | undefined) => void;
  /** Czy przypisać zestawy do pacjenta */
  assignSetsToPatient: boolean;
  /** Callback przy zmianie checkboxa przypisania */
  onAssignSetsChange: (assign: boolean) => void;
  /** Liczba notatek do utworzenia */
  notesToCreateCount: number;
  /** Czy panel jest disabled */
  disabled?: boolean;
  className?: string;
}

/**
 * Fuzzy match score - proste porównanie nazw
 */
function fuzzyMatch(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();

  // Exact match
  if (t === q) return 100;

  // Contains
  if (t.includes(q) || q.includes(t)) return 80;

  // Word match
  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);

  let matchedWords = 0;
  for (const qWord of qWords) {
    if (tWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      matchedWords++;
    }
  }

  if (matchedWords > 0) {
    return Math.round((matchedWords / Math.max(qWords.length, tWords.length)) * 70);
  }

  return 0;
}

/**
 * Panel wyboru pacjenta dla importu dokumentów
 * Uproszczony dla użytkowników 45+
 */
export function PatientContextPanel({
  detectedPatientName,
  selectedPatientId,
  onPatientChange,
  assignSetsToPatient,
  onAssignSetsChange,
  notesToCreateCount,
  disabled = false,
  className,
}: PatientContextPanelProps) {
  const { user } = useUser();
  const { currentOrganization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pobierz ID użytkownika z backendu
  const { data: userData } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const therapistId = userData?.userByClerkId?.id;
  const organizationId = currentOrganization?.organizationId;

  // Pobierz listę pacjentów
  const { data: patientsData, loading: patientsLoading } = useQuery<TherapistPatientsResponse>(
    GET_ALL_THERAPIST_PATIENTS_QUERY,
    {
      variables: { therapistId, organizationId },
      skip: !therapistId || !organizationId,
    }
  );

  // Przekształć pacjentów do prostszej formy
  const patients: PatientOption[] = useMemo(() => {
    if (!patientsData?.therapistPatients) return [];

    return patientsData.therapistPatients
      .filter(assignment => assignment.patient && assignment.status !== 'inactive')
      .map(assignment => ({
        id: assignment.patient!.id,
        fullname: assignment.patient!.fullname ||
          `${assignment.patient!.personalData?.firstName || ''} ${assignment.patient!.personalData?.lastName || ''}`.trim() ||
          'Nieznany pacjent',
        email: assignment.patient!.email,
        image: assignment.patient!.image,
      }));
  }, [patientsData]);

  // Znajdź sugerowanego pacjenta na podstawie nazwy z dokumentu
  const suggestedPatient = useMemo(() => {
    if (!detectedPatientName || patients.length === 0) return null;

    let bestMatch: PatientOption | null = null;
    let bestScore = 0;

    for (const patient of patients) {
      const score = fuzzyMatch(detectedPatientName, patient.fullname);
      if (score > bestScore && score >= 50) {
        bestScore = score;
        bestMatch = patient;
      }
    }

    return bestMatch;
  }, [detectedPatientName, patients]);

  // Filtruj pacjentów po wyszukiwaniu
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;

    return patients
      .map(patient => ({
        patient,
        score: fuzzyMatch(searchQuery, patient.fullname) +
               (patient.email ? fuzzyMatch(searchQuery, patient.email) * 0.5 : 0),
      }))
      .filter(item => item.score > 20)
      .sort((a, b) => b.score - a.score)
      .map(item => item.patient);
  }, [patients, searchQuery]);

  // Obecnie wybrany pacjent
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  const handleSelectPatient = (patientId: string) => {
    onPatientChange(patientId);
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onPatientChange(undefined);
  };

  const handleUseSuggested = () => {
    if (suggestedPatient) {
      onPatientChange(suggestedPatient.id);
    }
  };

  // Sprawdź czy pokazać warning
  const showWarning = notesToCreateCount > 0 && !selectedPatientId;

  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors duration-200',
        showWarning && 'border-warning/50 bg-warning/5',
        selectedPatientId && 'border-primary/40 bg-primary/5',
        className
      )}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              showWarning ? 'bg-warning/20' : selectedPatientId ? 'bg-primary/20' : 'bg-surface-light'
            )}
          >
            {showWarning ? (
              <AlertTriangle className="h-6 w-6 text-warning" />
            ) : (
              <User className="h-6 w-6 text-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">
              {showWarning ? 'Wybierz pacjenta dla notatek' : 'Przypisz do pacjenta (opcjonalne)'}
            </h3>

            {showWarning ? (
              <p className="mt-1 text-sm text-warning">
                {notesToCreateCount} {notesToCreateCount === 1 ? 'notatka wymaga' : 'notatki wymagają'} powiązania z pacjentem
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Możesz powiązać import z konkretnym pacjentem
              </p>
            )}
          </div>
        </div>

        {/* AI suggestion */}
        {detectedPatientName && !selectedPatientId && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface-light p-4">
            <Badge variant="secondary" className="shrink-0 bg-blue-500/20 text-blue-600 border-0">
              AI wykryło
            </Badge>
            <span className="text-sm text-foreground truncate flex-1">
              &quot;{detectedPatientName}&quot;
            </span>
            {suggestedPatient && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseSuggested}
                disabled={disabled}
                className="shrink-0 gap-2"
              >
                <Check className="h-4 w-4" />
                Użyj: {suggestedPatient.fullname}
              </Button>
            )}
          </div>
        )}

        {/* Patient selector */}
        <div className="mt-4">
          {selectedPatient ? (
            <div className="flex items-center gap-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedPatient.image} />
                <AvatarFallback className="bg-primary/20 text-primary text-base font-medium">
                  {selectedPatient.fullname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-foreground truncate">
                  {selectedPatient.fullname}
                </p>
                {selectedPatient.email && (
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedPatient.email}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
                className="shrink-0 gap-2"
              >
                <X className="h-4 w-4" />
                Usuń
              </Button>
            </div>
          ) : (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={disabled || patientsLoading}
                  className="w-full justify-between h-12 text-base"
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    {patientsLoading ? 'Ładowanie pacjentów...' : 'Wybierz pacjenta...'}
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <div className="p-3 border-b border-border">
                  <Input
                    placeholder="Szukaj pacjenta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10"
                  />
                </div>
                <ScrollArea className="h-[280px]">
                  {filteredPatients.length === 0 ? (
                    <div className="py-8 text-center">
                      <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Nie znaleziono pacjentów
                      </p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors',
                            'hover:bg-surface-light focus:bg-surface-light focus:outline-none'
                          )}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={patient.image} />
                            <AvatarFallback className="bg-surface-light text-sm">
                              {patient.fullname.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {patient.fullname}
                            </p>
                            {patient.email && (
                              <p className="text-xs text-muted-foreground truncate">
                                {patient.email}
                              </p>
                            )}
                          </div>
                          {suggestedPatient?.id === patient.id && (
                            <Badge variant="secondary" className="shrink-0 text-xs bg-blue-500/20 text-blue-600 border-0">
                              Sugerowany
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Checkbox - przypisz zestawy */}
        {selectedPatientId && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-surface-light">
            <Checkbox
              id="assign-sets"
              checked={assignSetsToPatient}
              onCheckedChange={(checked) => onAssignSetsChange(checked === true)}
              disabled={disabled}
              className="h-5 w-5"
            />
            <Label
              htmlFor="assign-sets"
              className="text-sm text-foreground cursor-pointer"
            >
              Przypisz również zestawy ćwiczeń do tego pacjenta
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
