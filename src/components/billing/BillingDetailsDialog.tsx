'use client';

import { useEffect, type KeyboardEvent } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UPDATE_BILLING_DETAILS_MUTATION } from '@/graphql/mutations';
import { GET_BILLING_DETAILS_QUERY } from '@/graphql/queries';
import type { GetBillingDetailsResponse, UpdateBillingDetailsResponse } from '@/types/apollo';
import { billingDetailsSchema, type BillingDetailsFormValues } from '@/types/billing-details.types';

interface BillingDetailsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId?: string;
  readonly onSaved?: () => void;
}

const EMPTY_VALUES: BillingDetailsFormValues = {
  companyName: '',
  nip: '',
  address: '',
  postalCode: '',
  city: '',
  iban: '',
  billingEmail: '',
};

function normalizeForSave(values: BillingDetailsFormValues): BillingDetailsFormValues {
  return {
    companyName: values.companyName.trim(),
    nip: values.nip.replaceAll(/[\s-]/g, '').trim(),
    address: values.address.trim(),
    postalCode: values.postalCode.trim(),
    city: values.city.trim(),
    iban: values.iban.replaceAll(/\s/g, '').toUpperCase().trim(),
    billingEmail: values.billingEmail.trim().toLowerCase(),
  };
}

function formatIbanForDisplay(inputValue: string): string {
  const normalized = inputValue.replaceAll(/\s/g, '').toUpperCase();
  return normalized.replaceAll(/(.{4})/g, '$1 ').trim();
}

export function BillingDetailsDialog({ open, onOpenChange, organizationId, onSaved }: Readonly<BillingDetailsDialogProps>) {
  const form = useForm<BillingDetailsFormValues>({
    resolver: zodResolver(billingDetailsSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { data, loading: isLoadingDetails } = useQuery<GetBillingDetailsResponse>(GET_BILLING_DETAILS_QUERY, {
    variables: { organizationId: organizationId || '' },
    skip: !organizationId || !open,
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
  });

  const [updateBillingDetails, { loading: isSaving }] = useMutation<UpdateBillingDetailsResponse>(
    UPDATE_BILLING_DETAILS_MUTATION,
    {
      onCompleted: (response) => {
        if (!response.updateBillingDetails.success) {
          toast.error(response.updateBillingDetails.message || 'Nie udało się zapisać danych rozliczeniowych');
          return;
        }

        toast.success('Dane rozliczeniowe zostały zapisane');
        onOpenChange(false);
        onSaved?.();
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
      refetchQueries: organizationId ? [{ query: GET_BILLING_DETAILS_QUERY, variables: { organizationId } }] : [],
    }
  );

  useEffect(() => {
    if (!open) {
      form.reset(EMPTY_VALUES);
      return;
    }

    const billingDetails = data?.billingDetails;
    if (billingDetails) {
      form.reset({
        companyName: billingDetails.companyName || '',
        nip: billingDetails.nip || '',
        address: billingDetails.address || '',
        postalCode: billingDetails.postalCode || '',
        city: billingDetails.city || '',
        iban: billingDetails.iban || '',
        billingEmail: billingDetails.billingEmail || '',
      });
    } else if (!isLoadingDetails) {
      form.reset(EMPTY_VALUES);
    }
  }, [data?.billingDetails, form, isLoadingDetails, open]);

  const handleSubmit = (values: BillingDetailsFormValues) => {
    if (!organizationId) {
      toast.error('Brak organizacji do zapisania danych rozliczeniowych');
      return;
    }

    updateBillingDetails({
      variables: {
        organizationId,
        input: normalizeForSave(values),
      },
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    const isSubmitShortcut = event.key === 'Enter' && (event.ctrlKey || event.metaKey);
    if (isSubmitShortcut) {
      event.preventDefault();
      form.handleSubmit(handleSubmit)();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" data-testid="billing-details-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Dane do rozliczeń
          </DialogTitle>
          <DialogDescription>Podaj dane firmy, abyśmy mogli wystawiać faktury i realizować wypłaty.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} onKeyDown={handleKeyDown} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa firmy</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="np. Fizjo Reh Sp. z o.o."
                      data-testid="billing-details-company-name-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIP</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" data-testid="billing-details-nip-input" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email do faktur</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="faktury@twojafirma.pl"
                        data-testid="billing-details-email-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <Input placeholder="ul. Przykładowa 10/2" data-testid="billing-details-address-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kod pocztowy</FormLabel>
                    <FormControl>
                      <Input placeholder="00-000" data-testid="billing-details-postal-code-input" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Miasto</FormLabel>
                    <FormControl>
                      <Input placeholder="Warszawa" data-testid="billing-details-city-input" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konto bankowe (IBAN)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PL61109010140000071219812874"
                      data-testid="billing-details-iban-input"
                      value={field.value}
                      onChange={(event) => field.onChange(formatIbanForDisplay(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                data-testid="billing-details-cancel-btn"
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSaving || isLoadingDetails} data-testid="billing-details-submit-btn">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Zapisz dane
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
