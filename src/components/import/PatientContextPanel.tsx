'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useUser } from '@clerk/nextjs';
import { User, Search, AlertTriangle, Check, X } from 'lucide-react';
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
 * Pokazuje się gdy są notatki do zaimportowania
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
        'overflow-hidden transition-all',
        showWarning && 'border-warning/50 bg-warning/5',
        selectedPatientId && 'border-primary/30 bg-primary/5',
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header z ikoną */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              showWarning ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'
            )}
          >
            {showWarning ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-foreground">
              {showWarning ? 'Wybierz pacjenta dla notatek' : 'Pacjent (opcjonalnie)'}
            </h3>

            {showWarning ? (
              <p className="mt-1 text-sm text-warning">
                {notesToCreateCount} {notesToCreateCount === 1 ? 'notatka wymaga' : 'notatki wymagają'} powiązania z pacjentem
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Powiąż import z pacjentem
              </p>
            )}
          </div>
        </div>

        {/* AI suggestion */}
        {detectedPatientName && !selectedPatientId && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface-light p-3">
            <Badge variant="secondary" className="shrink-0">
              AI wykryło
            </Badge>
            <span className="text-sm text-foreground truncate">
              &quot;{detectedPatientName}&quot;
            </span>
            {suggestedPatient && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseSuggested}
                disabled={disabled}
                className="ml-auto shrink-0 gap-1"
              >
                <Check className="h-3 w-3" />
                Użyj: {suggestedPatient.fullname}
              </Button>
            )}
          </div>
        )}

        {/* Patient selector */}
        <div className="mt-4">
          {selectedPatient ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedPatient.image} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {selectedPatient.fullname.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">
                  {selectedPatient.fullname}
                </p>
                {selectedPatient.email && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedPatient.email}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                disabled={disabled}
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
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
                  className="w-full justify-start gap-2 text-muted-foreground"
                >
                  <Search className="h-4 w-4" />
                  {patientsLoading ? 'Ładowanie...' : 'Wybierz pacjenta...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <div className="p-2 border-b border-border">
                  <Input
                    placeholder="Szukaj pacjenta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9"
                  />
                </div>
                <ScrollArea className="h-[250px]">
                  {filteredPatients.length === 0 ? (
                    <div className="py-6 text-center">
                      <User className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Nie znaleziono pacjentów
                      </p>
                    </div>
                  ) : (
                    <div className="p-1">
                      {filteredPatients.map((patient) => (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors',
                            'hover:bg-surface-light focus:bg-surface-light focus:outline-none'
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={patient.image} />
                            <AvatarFallback className="bg-surface-light text-xs">
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
                            <Badge variant="secondary" className="shrink-0 text-xs">
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
          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id="assign-sets"
              checked={assignSetsToPatient}
              onCheckedChange={(checked) => onAssignSetsChange(checked === true)}
              disabled={disabled}
            />
            <Label
              htmlFor="assign-sets"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Przypisz również zestawy ćwiczeń do tego pacjenta
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
