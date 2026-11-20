import { describe, expect, it } from 'vitest';
import { formatCedi, formatCediCompact, formatPercent, parseCediInput, pesewasToDecimalString } from './money';

describe('parseCediInput', () => {
  it('converts cedis to integer pesewas exactly', () => {
    expect(parseCediInput('12.5')).toEqual({ ok: true, value: 1250 });
    expect(parseCediInput('0.29')).toEqual({ ok: true, value: 29 });
    expect(parseCediInput('1,250.75')).toEqual({ ok: true, value: 125075 });
    expect(parseCediInput(' GH₵ 80 ')).toEqual({ ok: true, value: 8000 });
  });

  it('rejects empty, negative, zero and malformed amounts', () => {
    expect(parseCediInput('').ok).toBe(false);
    expect(parseCediInput('-5').ok).toBe(false);
    expect(parseCediInput('0').ok).toBe(false);
    expect(parseCediInput('0.00').ok).toBe(false);
    expect(parseCediInput('12.345').ok).toBe(false);
    expect(parseCediInput('abc').ok).toBe(false);
    expect(parseCediInput('1e5').ok).toBe(false);
  });

  it('rejects amounts above the sanity limit', () => {
    expect(parseCediInput('10000000').ok).toBe(true);
    expect(parseCediInput('10000000.01').ok).toBe(false);
  });
});

describe('formatting', () => {
  it('formats Ghana cedis with grouping and two decimals', () => {
    expect(formatCedi(125050)).toBe('GH₵1,250.50');
    expect(formatCedi(0)).toBe('GH₵0.00');
    expect(formatCedi(-500)).toBe('-GH₵5.00');
    expect(formatCedi(500, { showPlus: true })).toBe('+GH₵5.00');
  });

  it('formats compact axis labels', () => {
    expect(formatCediCompact(125000)).toBe('GH₵1.3k');
    expect(formatCediCompact(4500)).toBe('GH₵45');
    expect(formatCediCompact(250000000)).toBe('GH₵2.5m');
  });

  it('converts pesewas to decimal strings and percentages', () => {
    expect(pesewasToDecimalString(1250)).toBe('12.50');
    expect(pesewasToDecimalString(5)).toBe('0.05');
    expect(pesewasToDecimalString(-199)).toBe('-1.99');
    expect(formatPercent(0.256)).toBe('26%');
    expect(formatPercent(0.256, 1)).toBe('25.6%');
  });

  it('adds floating-point-unsafe values exactly', () => {
    const a = parseCediInput('0.1');
    const b = parseCediInput('0.2');
    if (!a.ok || !b.ok) throw new Error('parse failed');
    expect(a.value + b.value).toBe(30);
  });
});
