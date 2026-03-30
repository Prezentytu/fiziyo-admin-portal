'use client';

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flag, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/shared/FileUpload';
import { createExerciseReport } from '@/services/exerciseReportService';
import type { Exercise } from './ExerciseCard';
import type { ExerciseReportReasonCategory } from '@/types/exercise-report.types';

const reportExerciseSchema = z.object({
  reasonCategory: z.enum([
    'WRONG_DESCRIPTION',
    'WRONG_MEDIA',
    'CLINICAL_RISK',
    'DUPLICATE',
    'OUTDATED_CONTENT',
    'OTHER',
  ] as const),
  description: z.string().trim().min(12, 'Opis musi mieć minimum 12 znaków').max(2000, 'Opis jest za długi'),
});

type ReportExerciseFormValues = z.infer<typeof reportExerciseSchema>;

const reasonOptions: Array<{ value: ExerciseReportReasonCategory; label: string }> = [
  { value: 'WRONG_DESCRIPTION', label: 'Błędny opis' },
  { value: 'WRONG_MEDIA', label: 'Błędne lub słabe media' },
  { value: 'CLINICAL_RISK', label: 'Ryzyko kliniczne' },
  { value: 'DUPLICATE', label: 'Duplikat ćwiczenia' },
  { value: 'OUTDATED_CONTENT', label: 'Treść nieaktualna' },
  { value: 'OTHER', label: 'Inny problem' },
];

interface ReportExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  organizationId?: string;
  onSubmitted?: () => void;
}

export function ReportExerciseDialog({
  open,
  onOpenChange,
  exercise,
  organizationId,
  onSubmitted,
}: Readonly<ReportExerciseDialogProps>) {
  const { user } = useUser();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportExerciseFormValues>({
    resolver: zodResolver(reportExerciseSchema),
    defaultValues: {
      reasonCategory: 'WRONG_DESCRIPTION',
      description: '',
    },
  });

  const isDisabled = isSubmitting || !exercise;

  const resetDialog = useCallback(() => {
    form.reset({
      reasonCategory: 'WRONG_DESCRIPTION',
      description: '',
    });
    setFiles([]);
  }, [form]);

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !isSubmitting) {
        resetDialog();
      }
      onOpenChange(nextOpen);
    },
    [isSubmitting, onOpenChange, resetDialog]
  );

  const canSubmit = useMemo(() => {
    return !isDisabled && form.formState.isValid;
  }, [form.formState.isValid, isDisabled]);

  const onSubmit = useCallback(
    async (values: ReportExerciseFormValues) => {
      if (!exercise || !user) {
        toast.error('Brak danych użytkownika lub ćwiczenia');
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await createExerciseReport({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          exerciseScope: exercise.scope,
          exerciseStatus: exercise.status,
          organizationId,
          reasonCategory: values.reasonCategory,
          description: values.description,
          attachments: files.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
          reportedBy: {
            userId: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? 'unknown@email.com',
            name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
          },
        });

        if (!response.success) {
          toast.error(response.error || response.message || 'Nie udało się wysłać zgłoszenia');
          return;
        }

        toast.success('Zgłoszenie przekazane do weryfikacji');
        onSubmitted?.();
        handleClose(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [exercise, files, handleClose, onSubmitted, organizationId, user]
  );

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.handleSubmit(onSubmit)();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl" data-testid="exercise-report-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-500" />
            Zgłoś ćwiczenie do poprawki
          </DialogTitle>
          <DialogDescription>
            {exercise ? `Zgłaszasz: "${exercise.name}"` : 'Wybierz ćwiczenie do zgłoszenia.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleFormKeyDown} className="space-y-4">
            <FormField
              control={form.control}
              name="reasonCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Powód zgłoszenia</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isDisabled}>
                    <FormControl>
                      <SelectTrigger data-testid="exercise-report-reason-select">
                        <SelectValue placeholder="Wybierz powód" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasonOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="Opisz problem i co należy poprawić..."
                      disabled={isDisabled}
                      data-testid="exercise-report-description-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Załączniki</FormLabel>
              <FileUpload
                accept="image/*"
                multiple
                maxFiles={3}
                maxSizeMB={5}
                value={files}
                onChange={setFiles}
                preview
              />
            </div>

            <DialogFooter className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}
                data-testid="exercise-report-cancel-btn"
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={!canSubmit} data-testid="exercise-report-submit-btn">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  'Wyślij zgłoszenie'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
