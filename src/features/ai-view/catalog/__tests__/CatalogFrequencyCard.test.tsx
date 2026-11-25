import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { catalogSetFrequency } from '../../utils/schedulePlan';
import { CATALOG_SAVE_CANCELLED_TEXT, CatalogFrequencyCard } from '../CatalogFrequencyCard';

const appendExchange = vi.hoisted(() => vi.fn());
const markChosen = vi.hoisted(() => vi.fn());
const saveTemplateSet = vi.hoisted(() => vi.fn());

vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({ organizationId: 'org-1', appendExchange, markChosen }),
}));
vi.mock('../useChatWrites', () => ({
  useSaveTemplateSet: () => ({ saveTemplateSet, saving: false }),
}));

const DRAFT = {
  name: 'Kolano po ACL',
  items: [
    {
      exerciseId: 'e1',
      sets: 2,
      reps: 10,
      duration: 0,
      executionTime: 3,
      restSets: 30,
      restReps: 0,
      preparationTime: 0,
    },
  ],
};

function renderCard(draft: typeof DRAFT & { rhythm?: 'daily' | 'three' | 'two' } = DRAFT) {
  render(
    <CatalogFrequencyCard
      spec={{ component: 'CatalogFrequency', draft, description: 'Kolano po ACL.' }}
      testId="freq"
      messageId="m1"
    />
  );
}

/** Zestaw bez pacjenta: częstotliwość wybrana w czacie zapisuje się w zestawie. */
describe('CatalogFrequencyCard', () => {
  beforeEach(() => {
    appendExchange.mockClear();
    markChosen.mockClear();
    saveTemplateSet.mockReset();
  });

  it('zapisuje zestaw z wybraną częstotliwością i przekazuje rytm dalej do przypisania', async () => {
    saveTemplateSet.mockResolvedValue({ id: 'set-9', name: DRAFT.name });
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: '2× w tygodniu' }));

    await waitFor(() => expect(appendExchange).toHaveBeenCalledTimes(1));
    expect(saveTemplateSet).toHaveBeenCalledWith(
      'org-1',
      DRAFT.name,
      DRAFT.items,
      'Kolano po ACL.',
      catalogSetFrequency('two')
    );
    expect(markChosen).toHaveBeenCalledWith('m1', '2× w tygodniu');
    const [, reply] = appendExchange.mock.calls[0];
    expect(reply.text).toContain('2× w tygodniu');
    expect(reply.spec).toEqual({
      component: 'SetSaved',
      setId: 'set-9',
      name: DRAFT.name,
      draft: { ...DRAFT, sourceSetId: 'set-9', rhythm: 'two' },
    });
  });

  it('proponuje najpierw 3× w tygodniu, jak domyślny zestaw w katalogu', () => {
    renderCard();
    expect(screen.getByTestId('freq-option-0-btn').textContent).toBe('3× w tygodniu');
  });

  it('po błędzie zapisu pytanie zostaje otwarte', async () => {
    saveTemplateSet.mockResolvedValue(null);
    renderCard({ ...DRAFT, rhythm: 'daily' });
    expect(screen.getByTestId('freq-option-0-btn').textContent).toBe('Codziennie');

    fireEvent.click(screen.getByRole('button', { name: 'Codziennie' }));

    await waitFor(() => expect(saveTemplateSet).toHaveBeenCalledTimes(1));
    expect(markChosen).not.toHaveBeenCalled();
    expect(appendExchange).not.toHaveBeenCalled();
  });

  it('„Anuluj” nic nie zapisuje', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(saveTemplateSet).not.toHaveBeenCalled();
    expect(appendExchange).toHaveBeenCalledWith('Anuluj', { text: CATALOG_SAVE_CANCELLED_TEXT });
  });
});
