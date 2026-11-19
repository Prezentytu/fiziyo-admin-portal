'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { AlertCircle, Check, Copy, Gift, Send, Share2, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { GET_MY_REFERRAL_PROGRAM_QUERY, GET_MY_REFERRAL_SIDE_QUERY } from '@/graphql/queries/referrals.queries';
import {
  CONFIRM_REFERRAL_MUTATION,
  DECLINE_REFERRAL_MUTATION,
  REQUEST_REFERRAL_BY_EMAIL_MUTATION,
} from '@/graphql/mutations/referrals.mutations';
import type {
  ConfirmReferralResponse,
  DeclineReferralResponse,
  GetMyReferralProgramResponse,
  GetMyReferralSideResponse,
  ReferralRequest,
  ReferralView,
  RequestReferralByEmailResponse,
} from '@/graphql/types';
import {
  buildReferralLink,
  formatReferralDate,
  REFERRAL_REQUEST_SENT,
  referralErrorMessage,
  referralPersonLabel,
  referralSourceLabel,
  referralStatusPresentation,
  validateReferralEmail,
} from './utils/referrals';

const REFRESH_AFTER_DECISION = ['GetMyReferralSide', 'GetMyReferralRequests'];

/** Ustawienia → Polecenia (SPEC-054 §2). Polecenie należy do osoby, więc zakładka nie zależy od roli w gabinecie. */
export function ReferralsTab({ ownEmail }: Readonly<{ ownEmail?: string | null }>) {
  return (
    <section className="space-y-6" data-testid="settings-referrals">
      <header className="space-y-1">
        <h2 className="text-[22px] font-bold leading-7 tracking-tight text-foreground">Polecenia</h2>
        <p className="text-[15px] text-label-secondary">
          Poleć FiziYo innym fizjoterapeutom. Liczymy konta założone z Twojego linku i osoby, które potwierdzą Twoje
          polecenie.
        </p>
      </header>
      <ReferredBySection />
      <ReferrerSections ownEmail={ownEmail} />
    </section>
  );
}

function ReferrerSections({ ownEmail }: Readonly<{ ownEmail?: string | null }>) {
  const { data, loading, error, refetch } = useQuery<GetMyReferralProgramResponse>(GET_MY_REFERRAL_PROGRAM_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const program = data?.myReferralProgram;

  if (!program && loading) {
    return <LoadingState type="card" count={2} />;
  }
  if (!program) {
    return (
      <Card data-testid="settings-referrals-error">
        <CardContent>
          <EmptyState
            icon={AlertCircle}
            title={error ? 'Nie udało się wczytać poleceń' : 'Polecenia są dostępne dla kont fizjoterapeutów'}
            description={error ? referralErrorMessage(error, 'Sprawdź połączenie i spróbuj ponownie.') : undefined}
            actionLabel="Spróbuj ponownie"
            onAction={() => void refetch()}
            actionLoading={loading}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ReferralLinkCard code={program.code} />
      <ReferralEmailCard ownEmail={ownEmail} />
      <Card data-testid="settings-referrals-summary">
        <CardContent className="space-y-5 pt-6">
          <h3 className="text-[17px] font-semibold text-foreground">Twoje polecenia</h3>
          <dl className="grid grid-cols-3 gap-3">
            <Counter label="Polecone" value={program.confirmed} testId="settings-referrals-count-confirmed" />
            <Counter label="Aktywne" value={program.active} testId="settings-referrals-count-active" />
            <Counter label="Czekają" value={program.pending} testId="settings-referrals-count-pending" />
          </dl>
          <p
            className="flex items-center gap-2 text-[14px] text-label-secondary"
            data-testid="settings-referrals-rewards-teaser"
          >
            <Gift className="h-4 w-4 shrink-0 text-tint" aria-hidden="true" />
            Wkrótce zobaczysz tu swoje korzyści z poleceń.
          </p>
          <ReferralList referrals={data?.myReferrals ?? []} />
        </CardContent>
      </Card>
    </>
  );
}

function Counter({ label, value, testId }: Readonly<{ label: string; value: number; testId: string }>) {
  return (
    <div className="rounded-xl bg-fill-quaternary px-4 py-3">
      <dt className="text-[13px] text-label-secondary">{label}</dt>
      <dd className="text-[22px] font-bold leading-7 text-foreground" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

function ReferralLinkCard({ code }: Readonly<{ code: string }>) {
  const [link, setLink] = useState('');
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLink(buildReferralLink(window.location.origin, code));
    setCanShare(typeof navigator.share === 'function');
  }, [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Skopiowano link polecający');
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      toast.error('Nie udało się skopiować. Zaznacz link i skopiuj go ręcznie.');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'FiziYo',
        text: 'Zakładam pacjentom plany ćwiczeń w FiziYo. Załóż konto z mojego linku:',
        url: link,
      });
    } catch {
      // Closing the share sheet rejects too; nothing to report.
    }
  };

  return (
    <Card data-testid="settings-referrals-link-card">
      <CardContent className="space-y-3 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[17px] font-semibold text-foreground">Twój link polecający</h3>
          <span className="text-[13px] text-label-secondary">
            Kod:{' '}
            <span className="font-mono font-semibold text-foreground" data-testid="settings-referrals-code">
              {code}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            readOnly
            value={link}
            aria-label="Link polecający"
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-[14px]"
            data-testid="settings-referrals-link-input"
          />
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => void handleCopy()} disabled={!link} data-testid="settings-referrals-copy-btn">
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? 'Skopiowano' : 'Kopiuj'}
            </Button>
            {canShare && (
              <Button variant="tinted" onClick={() => void handleShare()} data-testid="settings-referrals-share-btn">
                <Share2 aria-hidden="true" />
                Udostępnij
              </Button>
            )}
          </div>
        </div>
        <p className="text-[13px] text-label-secondary">
          Każde konto fizjoterapeuty założone z tego linku liczy się jako Twoje polecenie.
        </p>
      </CardContent>
    </Card>
  );
}

function ReferralEmailCard({ ownEmail }: Readonly<{ ownEmail?: string | null }>) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [requestReferral, { loading }] = useMutation<RequestReferralByEmailResponse>(
    REQUEST_REFERRAL_BY_EMAIL_MUTATION,
    { refetchQueries: ['GetMyReferralProgram'] }
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validateReferralEmail(email, ownEmail);
    if (invalid) {
      setFieldError(invalid);
      return;
    }
    try {
      await requestReferral({ variables: { email: email.trim() } });
      setEmail('');
      setSent(true);
    } catch (error) {
      setFieldError(referralErrorMessage(error));
    }
  };

  return (
    <Card data-testid="settings-referrals-email-card">
      <CardContent className="pt-6">
        <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <h3 className="text-[17px] font-semibold text-foreground">Dodaj osobę, która ma już konto</h3>
          <Label htmlFor="referral-email">Adres e-mail tej osoby</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              data-testid="settings-referrals-email-input"
              id="referral-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldError(null);
                setSent(false);
              }}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'referral-email-error' : 'referral-email-hint'}
              placeholder="np. anna@gabinet.pl"
            />
            <Button type="submit" disabled={loading} className="shrink-0" data-testid="settings-referrals-email-submit">
              <Send aria-hidden="true" />
              Wyślij prośbę
            </Button>
          </div>
          {fieldError ? (
            <p
              id="referral-email-error"
              role="alert"
              className="text-[13px] text-status-danger"
              data-testid="settings-referrals-email-error"
            >
              {fieldError}
            </p>
          ) : sent ? (
            <p role="status" className="text-[13px] text-status-success" data-testid="settings-referrals-email-sent">
              {REFERRAL_REQUEST_SENT}
            </p>
          ) : (
            <p id="referral-email-hint" className="text-[13px] text-label-secondary">
              Zaliczymy polecenie, gdy ta osoba potwierdzi w portalu. Działa do 30 dni od założenia jej konta.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function ReferralList({ referrals }: Readonly<{ referrals: ReferralView[] }>) {
  if (referrals.length === 0) {
    return (
      <div data-testid="settings-referrals-empty">
        <EmptyState
          icon={Users}
          title="Nie masz jeszcze poleceń"
          description="Wyślij swój link znajomemu fizjoterapeucie. Polecenie pojawi się tu, gdy założy konto."
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-separator" data-testid="settings-referrals-list">
      {referrals.map((referral) => {
        const status = referralStatusPresentation(referral);
        return (
          <li
            key={referral.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3"
            data-testid={`settings-referrals-item-${referral.id}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-foreground">{referralPersonLabel(referral)}</p>
              <p className="text-[13px] text-label-secondary">
                {referralSourceLabel(referral.source)} ·{' '}
                {formatReferralDate(referral.confirmedAt ?? referral.createdAt)}
              </p>
            </div>
            <Badge variant={status.tone} data-testid={`settings-referrals-item-${referral.id}-status`}>
              {status.label}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

function ReferredBySection() {
  const { data } = useQuery<GetMyReferralSideResponse>(GET_MY_REFERRAL_SIDE_QUERY, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });
  const referrer = data?.myReferrer;
  const requests = data?.myReferralRequests ?? [];

  if (!referrer && requests.length === 0) {
    return null;
  }

  return (
    <Card data-testid="settings-referrals-referred-by">
      <CardContent className="space-y-3 pt-6">
        <h3 className="text-[17px] font-semibold text-foreground">Kto Cię polecił</h3>
        {referrer ? (
          <p className="flex items-center gap-2 text-[15px] text-foreground" data-testid="settings-referrals-referrer">
            <UserCheck className="h-4 w-4 shrink-0 text-status-success" aria-hidden="true" />
            Osoba, która Cię poleciła: <span className="font-semibold">{referrer.name}</span>
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <ReferralRequestRow key={request.id} request={request} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReferralRequestRow({ request }: Readonly<{ request: ReferralRequest }>) {
  const [rowError, setRowError] = useState<string | null>(null);
  const [confirm, { loading: confirming }] = useMutation<ConfirmReferralResponse>(CONFIRM_REFERRAL_MUTATION, {
    refetchQueries: REFRESH_AFTER_DECISION,
  });
  const [decline, { loading: declining }] = useMutation<DeclineReferralResponse>(DECLINE_REFERRAL_MUTATION, {
    refetchQueries: REFRESH_AFTER_DECISION,
  });
  const busy = confirming || declining;

  const decide = async (action: typeof confirm | typeof decline, done: string) => {
    setRowError(null);
    try {
      await action({ variables: { referralId: request.id } });
      toast.success(done);
    } catch (error) {
      setRowError(referralErrorMessage(error));
    }
  };

  return (
    <li
      className="space-y-2 rounded-xl bg-fill-quaternary px-4 py-3"
      data-testid={`settings-referrals-request-${request.id}`}
    >
      <p className="text-[15px] text-foreground">
        Prośba o potwierdzenie polecenia od: <span className="font-semibold">{request.referrerName}</span>
        {request.referrerOrganizationName ? ` (${request.referrerOrganizationName})` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void decide(confirm, 'Dziękujemy, polecenie potwierdzone')}
          data-testid={`settings-referrals-request-${request.id}-confirm`}
        >
          Potwierdzam
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void decide(decline, 'Prośba odrzucona')}
          data-testid={`settings-referrals-request-${request.id}-decline`}
        >
          To nie ta osoba
        </Button>
      </div>
      {rowError && (
        <p
          role="alert"
          className="text-[13px] text-status-danger"
          data-testid={`settings-referrals-request-${request.id}-error`}
        >
          {rowError}
        </p>
      )}
    </li>
  );
}
