'use client';

import { useEffect, type KeyboardEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  createOrganizationFormSchema,
  ORGANIZATION_DESCRIPTION_MAX_LENGTH,
  ORGANIZATION_NAME_MAX_LENGTH,
  toCreateOrganizationVariables,
  type CreateOrganizationFormValues,
} from './createOrganizationForm';
import { useCreateOrganization } from './useCreateOrganization';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_VALUES: CreateOrganizationFormValues = { name: '', description: '' };

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const { createAndEnter, isSubmitting } = useCreateOrganization();
  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationFormSchema),
    defaultValues: EMPTY_VALUES,
  });
  const name = useWatch({ control: form.control, name: 'name' }) ?? '';

  useEffect(() => {
    if (open) form.reset(EMPTY_VALUES);
  }, [open, form]);

  const handleOpenChange = (next: boolean) => {
    if (!next && isSubmitting) return;
    onOpenChange(next);
  };

  const onSubmit = async (values: CreateOrganizationFormValues) => {
    form.clearErrors('root');
    const outcome = await createAndEnter(toCreateOrganizationVariables(values));

    if (outcome.status === 'entered') {
      toast.success(`Utworzono organizację ${outcome.organizationName}`, {
        description: 'Jesteś jej właścicielem. Panel pokazuje teraz tę organizację.',
      });
      onOpenChange(false);
    } else if (outcome.status === 'created') {
      toast.warning(`Utworzono organizację ${outcome.organizationName}`, {
        description: 'Nie udało się na nią przełączyć. Wybierz ją w przełączniku organizacji.',
      });
      onOpenChange(false);
    } else if (outcome.status === 'failed') {
      form.setError('root', { message: 'Nie udało się utworzyć organizacji. Spróbuj ponownie.' });
    }
  };

  const submit = form.handleSubmit(onSubmit);

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
        data-testid="org-create-dialog"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>Nowa organizacja</DialogTitle>
              <DialogDescription>Osobni pacjenci, katalog i zespół. Zostaniesz jej właścicielem.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} onKeyDown={handleKeyDown} className="space-y-5" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-baseline justify-between">
                    <FormLabel>Nazwa organizacji</FormLabel>
                    <span className="text-xs tabular-nums text-muted-foreground" aria-hidden="true">
                      {name.length}/{ORGANIZATION_NAME_MAX_LENGTH}
                    </span>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="np. Fizjoterapia Kowalski"
                      autoComplete="organization"
                      autoFocus
                      maxLength={ORGANIZATION_NAME_MAX_LENGTH}
                      className="h-11"
                      data-testid="org-create-name-input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Nazwę zmienisz później w ustawieniach organizacji.</FormDescription>
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
                      placeholder="np. Gabinet rehabilitacji sportowej w Krakowie"
                      className="min-h-[80px] resize-none"
                      maxLength={ORGANIZATION_DESCRIPTION_MAX_LENGTH}
                      data-testid="org-create-description-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {rootError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                data-testid="org-create-error"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {rootError}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
                data-testid="org-create-cancel-btn"
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="org-create-submit-btn">
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {isSubmitting ? 'Tworzenie…' : 'Utwórz organizację'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
