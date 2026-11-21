import { afterEach, describe, expect, it } from 'vitest';
import { setDisplayCurrency } from './currency';
import { formatCedi, formatCediCompact, parseCediInput } from './money';

afterEach(() => setDisplayCurrency('GHS'));

describe('display currency', () => {
  it('changes only the symbol, never the stored amount', () => {
    expect(formatCedi(125050)).toBe('GH₵1,250.50');
    setDisplayCurrency('NGN');
    expect(formatCedi(125050)).toBe('₦1,250.50');
    setDisplayCurrency('KES');
    expect(formatCedi(-500)).toBe('-KSh 5.00');
    setDisplayCurrency('EUR');
    expect(formatCediCompact(250000)).toBe('€2.5k');
  });

  it('accepts amounts typed with any supported symbol or code', () => {
    expect(parseCediInput('$12.50')).toEqual({ ok: true, value: 1250 });
    expect(parseCediInput('₦1,000')).toEqual({ ok: true, value: 100000 });
    expect(parseCediInput('KSh 80')).toEqual({ ok: true, value: 8000 });
    expect(parseCediInput('GBP 5')).toEqual({ ok: true, value: 500 });
    expect(parseCediInput('€0.29')).toEqual({ ok: true, value: 29 });
  });
});
