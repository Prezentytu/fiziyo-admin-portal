'use client';

import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { REQUEST_AI_CREDITS_MUTATION } from '@/graphql/mutations/billing.mutations';
import { GET_AI_CREDIT_REQUESTS_QUERY } from '@/graphql/queries/billing.queries';
import type { RequestAICreditsResponse, RequestAICreditsVariables } from '@/graphql/types';
import { cn } from '@/lib/utils';

import { useAiCreditRequests } from './useAiCreditRequests';
import {
  creditsRequestControl,
  creditsRequestSchema,
  DEFAULT_REQUESTED_CREDITS,
  recentRequests,
  REQUEST_STATUS_LABELS,
  type CreditsRequestFormValues,
} from './utils/creditsRequest';

interface AiCreditsRequestDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const STATUS_TONE = {
  pending: 'text-status-warning',
  approved: 'text-status-success',
  rejected: 'text-label-secondary',
} as const;

const DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });

export function AiCreditsRequestDialog({ open, onOpenChange }: AiCreditsRequestDialogProps) {
  const { organizationId, canRequest, requests } = useAiCreditRequests();
  const control = creditsRequestControl(canRequest, requests);
  const recent = recentRequests(requests);

  const form = useForm<CreditsRequestFormValues>({
    resolver: zodResolver(creditsRequestSchema),
    mode: 'onChange',
    defaultValues: { requestedCredits: DEFAULT_REQUESTED_CREDITS, message: '' },
  });

  const [requestCredits, { loading }] = useMutation<RequestAICreditsResponse, RequestAICreditsVariables>(
    REQUEST_AI_CREDITS_MUTATION,
    {
      errorPolicy: 'all',
      refetchQueries: [{ query: GET_AI_CREDIT_REQUESTS_QUERY, variables: { organizationId } }],
      awaitRefetchQueries: true,
    }
  );

  const onSubmit = useCallback(
    async (values: CreditsRequestFormValues) => {
      if (!organizationId) return;
      const message = values.message.trim();
      try {
        const result = await requestCredits({
          variables: { organizationId, requestedCredits: values.requestedCredits, message: message || undefined },
        });
        const payload = result.data?.requestAICredits;
        if (!payload?.success) {
          toast.error(payload?.message || 'Nie udało się wysłać prośby. Spróbuj ponownie.');
          return;
        }
        toast.success('Prośba wysłana do zespołu FiziYo');
        form.reset({ requestedCredits: DEFAULT_REQUESTED_CREDITS, message: '' });
      } catch {
        toast.error('Nie udało się wysłać prośby. Spróbuj ponownie.');
      }
    },
    [form, organizationId, requestCredits]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="ai-credits-request-dialog">
        <DialogHeader>
          <DialogTitle>Kredyty AI gabinetu</DialogTitle>
          <DialogDescription>
            Zespół FiziYo rozpatruje prośby ręcznie i przyznaje kredyty na stałe do puli gabinetu.
          </DialogDescription>
        </DialogHeader>

        {control === 'pending' ? (
          <p
            className="rounded-control bg-status-warning-muted px-3.5 py-3 text-[14px] text-status-warning"
            data-testid="ai-credits-request-dialog-pending"
          >
            Prośba czeka na odpowiedź zespołu FiziYo
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="requestedCredits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Liczba kredytów</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={Number.isNaN(field.value) ? '' : field.value}
                        onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={loading}
                        data-testid="ai-credits-request-amount-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uzasadnienie</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Na co potrzebujecie kredytów?"
                        disabled={loading}
                        data-testid="ai-credits-request-message-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  data-testid="ai-credits-request-cancel-btn"
                >
                  Anuluj
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !form.formState.isValid || !canRequest}
                  data-testid="ai-credits-request-submit-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      Wysyłanie...
                    </>
                  ) : (
                    'Wyślij prośbę'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {recent.length > 0 && (
          <section className="space-y-2" data-testid="ai-credits-request-history">
            <h3 className="text-[13px] font-semibold text-label-secondary">Ostatnie prośby</h3>
            <ul className="divide-y divide-separator">
              {recent.map((request) => (
                <li key={request.id} className="flex items-center justify-between gap-3 py-2 text-[14px]">
                  <span className="min-w-0">
                    <span className="block tabular-nums text-foreground">{request.requestedCredits} kredytów</span>
                    <span className="block text-[12px] text-label-tertiary">
                      {DATE_FORMAT.format(new Date(request.createdAt))}
                      {request.status === 'approved' && request.grantedCredits !== null
                        ? ` · przyznano ${request.grantedCredits}`
                        : ''}
                    </span>
                    {request.resolutionNote && (
                      <span className="block text-[12px] text-label-secondary">{request.resolutionNote}</span>
                    )}
                  </span>
                  <span className={cn('shrink-0 text-[13px] font-medium', STATUS_TONE[request.status])}>
                    {REQUEST_STATUS_LABELS[request.status]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
