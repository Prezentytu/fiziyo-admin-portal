import { describe, expect, it } from 'vitest';
import { formatInvoiceDate } from './BillingHeroCard';

describe('formatInvoiceDate', () => {
  it('dates the invoice on the first day of the following month', () => {
    expect(formatInvoiceDate(11, 2026)).toBe('01.12.2026');
  });

  it('moves the December invoice into the next year', () => {
    expect(formatInvoiceDate(12, 2026)).toBe('01.01.2027');
  });
});
