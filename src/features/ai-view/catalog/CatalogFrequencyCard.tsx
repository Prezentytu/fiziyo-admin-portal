'use client';

import { useChatActions } from '../ChatSessionContext';
import { catalogRhythmOptions, catalogSetFrequency, FLOW_CANCEL_LABEL, planRhythmLabel } from '../utils/schedulePlan';
import { savedInCatalogText } from '../utils/setDraft';
import type { CardProps } from './cardProps';
import { QuickReplies } from './QuickReplies';
import { useSaveTemplateSet } from './useChatWrites';

export const CATALOG_SAVE_CANCELLED_TEXT = 'Anulowane. Nic nie zostało zapisane.';

/** „Jak często?” for a set saved without a patient: one tap saves it in the catalog with that frequency. */
export function CatalogFrequencyCard({ spec, testId, messageId, chosen }: CardProps<'CatalogFrequency'>) {
  const { organizationId, appendExchange, markChosen } = useChatActions();
  const { saveTemplateSet, saving } = useSaveTemplateSet();
  const rhythms = catalogRhythmOptions(spec.draft.rhythm);
  const { draft } = spec;

  return (
    <div data-testid={testId}>
      <QuickReplies
        options={[...rhythms.map(planRhythmLabel), FLOW_CANCEL_LABEL]}
        chosen={chosen}
        disabled={saving}
        testId={testId}
        onPick={async (option, index) => {
          const rhythm = rhythms[index];
          if (!rhythm) {
            markChosen(messageId, option);
            appendExchange(option, { text: CATALOG_SAVE_CANCELLED_TEXT });
            return;
          }
          const saved = await saveTemplateSet(
            organizationId,
            draft.name,
            draft.items,
            spec.description,
            catalogSetFrequency(rhythm)
          );
          // A failed save shows a toast and keeps the question open for another tap.
          if (!saved) return;
          markChosen(messageId, option);
          appendExchange(option, {
            text: savedInCatalogText(saved.name, rhythm),
            spec: {
              component: 'SetSaved',
              setId: saved.id,
              name: saved.name,
              draft: { ...draft, sourceSetId: saved.id, rhythm },
            },
          });
        }}
      />
    </div>
  );
}
