'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowRight } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ChatTourStep } from './useChatFirstRun';
import { getChatTourPlacement, type ChatTourPlacement } from './utils/chatTourPlacement';

interface ChatFirstRunTourProps {
  scopeRef: RefObject<HTMLDivElement | null>;
  step: ChatTourStep;
  canManageOrganization: boolean;
  onStep: (step: ChatTourStep) => void;
  onDismiss: () => void;
}

const STEPS = [
  {
    target: 'assistant',
    title: 'Twój Asystent',
    description: 'Poproś Asystenta o znalezienie ćwiczenia lub przygotowanie szkicu zestawu.',
    side: 'below',
  },
  {
    target: 'workspace',
    title: 'Pacjenci, zestawy i ćwiczenia',
    description: 'W menu znajdziesz swoich pacjentów, zapisane zestawy i katalog ćwiczeń.',
    side: 'right',
  },
  {
    target: 'organization',
    title: 'Twoja organizacja',
    description: 'Wybierz „Ustawienia” → „Organizacje”, aby sprawdzić, do których organizacji masz dostęp.',
    side: 'right',
  },
] as const;

const MANAGER_DESCRIPTION =
  'Wybierz „Organizacja”, by sprawdzić zespół i gabinety, albo „Ustawienia” → „Profil firmy”, by zobaczyć dane firmy.';

function getTargetBounds(anchors: NodeListOf<Element>) {
  const rects = Array.from(anchors, (anchor) => anchor.getBoundingClientRect()).filter(
    ({ width, height }) => width > 0 && height > 0
  );
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { left, top, width: right - left, height: bottom - top };
}

export function ChatFirstRunTour({ scopeRef, step, canManageOrganization, onStep, onDismiss }: ChatFirstRunTourProps) {
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<ChatTourPlacement | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const current = STEPS[step];
  const isLast = step === 2;
  const description = isLast && canManageOrganization ? MANAGER_DESCRIPTION : current.description;

  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!content || !scope) return;
    const anchors = scope.querySelectorAll(`[data-chat-tour-target="${current.target}"]`);
    const update = () => {
      const { clientWidth, clientHeight } = document.documentElement;
      setPlacement(
        getChatTourPlacement(
          getTargetBounds(anchors),
          { width: content.offsetWidth, height: content.offsetHeight },
          { width: clientWidth, height: clientHeight },
          current.side
        )
      );
    };
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(content);
    observer.observe(scope);
    anchors.forEach((anchor) => observer.observe(anchor));
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [content, current, scopeRef]);

  const advance = () => {
    if (step === 2) onDismiss();
    else onStep(step === 0 ? 1 : 2);
  };
  const back = () => {
    if (step === 1) nextRef.current?.focus();
    onStep(step === 2 ? 1 : 0);
  };
  const spotlight = placement?.spotlight;
  const side = placement?.side;
  const arrowStyle = side === 'right' ? { top: placement?.arrow } : { left: placement?.arrow };

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogPortal>
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
          {spotlight ? (
            <div
              className={cn(
                'absolute shadow-[0_0_0_200vmax_var(--scrim)] ring-2 ring-tint motion-safe:transition-[inset,width,height] motion-safe:duration-150',
                step === 0 ? 'rounded-dialog' : 'rounded-control'
              )}
              data-testid="onboarding-chat-tour-spotlight"
              style={spotlight}
            />
          ) : (
            <div className="absolute inset-0 bg-scrim" />
          )}
        </div>
        <DialogPrimitive.Content
          ref={setContent}
          aria-modal="true"
          data-testid="onboarding-chat-tour"
          onPointerDownOutside={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              advance();
            }
            event.stopPropagation();
          }}
          className={cn(
            'fixed z-[61] w-[min(21rem,calc(100vw-1.5rem))] rounded-control border border-hairline bg-popover shadow-floating',
            !placement && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
          )}
          style={placement ? { left: placement.card.left, top: placement.card.top } : undefined}
        >
          {side && (
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute size-2.5 rotate-45 border-hairline bg-popover',
                side === 'right' && '-left-1.5 border-b border-l',
                side === 'below' && '-top-1.5 border-l border-t',
                side === 'above' && '-bottom-1.5 border-b border-r'
              )}
              style={arrowStyle}
            />
          )}
          <div className="relative max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain p-4">
            <div aria-live="polite" aria-atomic="true" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-tint">Krok {step + 1} z {STEPS.length}</p>
                <div aria-hidden="true" className="flex gap-1">
                  {STEPS.map(({ target }, index) => (
                    <span key={target} className={cn('h-0.5 w-3 rounded-full', index <= step ? 'bg-tint' : 'bg-fill-tertiary')} />
                  ))}
                </div>
              </div>
              <DialogTitle>{current.title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-1">
              <Button type="button" variant="ghost" onClick={onDismiss} data-testid="onboarding-chat-tour-skip-btn">
                Pomiń
              </Button>
              <div className="ml-auto flex items-center gap-1">
                {step > 0 && (
                  <Button type="button" variant="ghost" onClick={back} data-testid="onboarding-chat-tour-back-btn">
                    Wstecz
                  </Button>
                )}
                <Button ref={nextRef} type="button" onClick={advance} data-testid="onboarding-chat-tour-next-btn">
                  {isLast ? 'Gotowe' : 'Dalej'}
                  {!isLast && <ArrowRight aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
