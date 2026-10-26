import { describe, expect, it } from 'vitest';

import { applyInstructionProposal, buildInstructionProposal } from '../instructionProposal';

describe('buildInstructionProposal', () => {
  it('proponuje kroki i wskazówki tylko, gdy ich nie ma', () => {
    const proposal = buildInstructionProposal(
      { steps: ['Stań prosto'], cues: [] },
      { steps: ['Inny krok'], cues: ['Kolana nad stopami'] }
    );

    expect(proposal).toEqual({ cues: ['Kolana nad stopami'] });
  });

  it('dokłada tylko nowe błędy', () => {
    const proposal = buildInstructionProposal(
      { mistakes: [{ mistake: 'Kolana uciekają do środka', fix: 'Kolana w linii ze stopami' }] },
      {
        mistakes: [
          { mistake: 'kolana uciekają do środka', fix: 'x' },
          { mistake: 'Pięty odrywają się od podłogi', fix: 'Ciężar na piętach' },
          { mistake: '  ', fix: 'pusty' },
        ],
      }
    );

    expect(proposal).toEqual({ mistakes: [{ mistake: 'Pięty odrywają się od podłogi', fix: 'Ciężar na piętach' }] });
  });

  it('zwraca null, gdy agent nie ma nic nowego', () => {
    expect(buildInstructionProposal({ steps: ['a'], cues: ['b'] }, { steps: ['c'], cues: ['d'] })).toBeNull();
  });
});

describe('applyInstructionProposal', () => {
  it('wstawia propozycję bez kasowania pozostałych pól', () => {
    const result = applyInstructionProposal(
      { summary: 'Opis', mistakes: [{ mistake: 'A', fix: 'B' }] },
      { steps: ['Krok'], mistakes: [{ mistake: 'C', fix: 'D' }] }
    );

    expect(result).toEqual({
      summary: 'Opis',
      steps: ['Krok'],
      mistakes: [
        { mistake: 'A', fix: 'B' },
        { mistake: 'C', fix: 'D' },
      ],
    });
  });
});
