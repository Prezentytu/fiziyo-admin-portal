'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SUPPORT_CREATE_CONVERSATION_MUTATION } from '@/graphql/mutations/support.mutations';
import type {
  SupportCreateConversationResponse,
  SupportCreateConversationVariables,
  SupportThreadCategory,
} from '@/graphql/types';
import {
  SUPPORT_BODY_MAX,
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_SUBJECT_MAX,
  supportThreadHref,
  validateConversationDraft,
} from './utils/support';

/** „Napisz do nas”: nowa rozmowa z zespołem FiziYo (tylko właściciel i administrator gabinetu). */
export function NewConversationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportThreadCategory>('ONBOARDING');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [create, { loading }] = useMutation<SupportCreateConversationResponse, SupportCreateConversationVariables>(
    SUPPORT_CREATE_CONVERSATION_MUTATION,
    { refetchQueries: ['GetSupportThreads', 'GetSupportUnreadCount'] }
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validateConversationDraft({ subject, category, body });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      const result = await create({ variables: { subject: subject.trim(), category, body: body.trim() } });
      const thread = result.data?.supportCreateConversation;
      if (!thread) {
        setError('Nie udało się wysłać. Spróbuj ponownie.');
        return;
      }
      toast.success('Wiadomość wysłana do zespołu FiziYo');
      setSubject('');
      setBody('');
      onOpenChange(false);
      router.push(supportThreadHref(thread.id));
    } catch {
      setError('Nie udało się wysłać. Spróbuj ponownie.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="support-new-conversation-dialog">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Napisz do zespołu FiziYo</DialogTitle>
            <DialogDescription>Odpowiemy w tym wątku. Nie wpisuj danych pacjentów.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-new-category">Kategoria</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as SupportThreadCategory)}
              data-testid="support-new-category"
            >
              <SelectTrigger id="support-new-category" data-testid="support-new-category-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORT_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-new-subject">Temat</Label>
            <Input
              id="support-new-subject"
              value={subject}
              maxLength={SUPPORT_SUBJECT_MAX}
              onChange={(event) => setSubject(event.target.value)}
              data-testid="support-new-subject-input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-new-body">Wiadomość</Label>
            <Textarea
              id="support-new-body"
              rows={6}
              value={body}
              maxLength={SUPPORT_BODY_MAX}
              onChange={(event) => setBody(event.target.value)}
              data-testid="support-new-body-input"
            />
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-status-danger" data-testid="support-new-error">
              {error}
            </p>
          )}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              data-testid="support-new-cancel-btn"
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading} data-testid="support-new-submit-btn">
              {loading ? 'Wysyłanie…' : 'Wyślij'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
