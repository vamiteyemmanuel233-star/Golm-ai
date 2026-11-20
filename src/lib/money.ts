/**
 * Money helpers. All amounts are integers in pesewas (GH₵1 = 100 pesewas).
 */

export const PESEWAS_PER_CEDI = 100;
/** GH₵10,000,000 — a sanity limit that catches typing mistakes like extra zeros. */
export const MAX_AMOUNT_PESEWAS = 10_000_000 * PESEWAS_PER_CEDI;

export type ParseResult = { ok: true; value: number } | { ok: false; error: string };

/**
 * Converts what a user typed (e.g. "1,250.5" or "GH₵ 80") into pesewas.
 * Uses string maths instead of parseFloat so "0.29" becomes exactly 29.
 */
export function parseCediInput(raw: string): ParseResult {
  const cleaned = raw
    .trim()
    .replace(/^GH(₵|S|C)\s*/i, '')
    .replace(/,/g, '')
    .trim();

  if (cleaned === '') return { ok: false, error: 'Enter an amount.' };
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) {
    return {
      ok: false,
      error: 'Use a positive number with at most 2 decimal places, e.g. 125.50.',
    };
  }

  const [whole = '0', fraction = ''] = cleaned.split('.');
  const value = Number(whole) * PESEWAS_PER_CEDI + Number(fraction.padEnd(2, '0'));

  if (value <= 0) return { ok: false, error: 'Amount must be greater than zero.' };
  if (value > MAX_AMOUNT_PESEWAS) {
    return { ok: false, error: 'Amount is too large. The maximum is GH₵10,000,000.' };
  }
  return { ok: true, value };
}

const groupedFormatter = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 125050 → "GH₵1,250.50"; -500 → "-GH₵5.00" */
export function formatCedi(pesewas: number, options: { showPlus?: boolean } = {}): string {
  const body = `GH₵${groupedFormatter.format(Math.abs(pesewas) / PESEWAS_PER_CEDI)}`;
  if (pesewas < 0) return `-${body}`;
  if (pesewas > 0 && options.showPlus) return `+${body}`;
  return body;
}

/** Short format for chart axes: 125000 → "GH₵1.3k" */
export function formatCediCompact(pesewas: number): string {
  const cedis = pesewas / PESEWAS_PER_CEDI;
  const abs = Math.abs(cedis);
  const sign = cedis < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}GH₵${trim(abs / 1_000_000)}m`;
  if (abs >= 1_000) return `${sign}GH₵${trim(abs / 1_000)}k`;
  return `${sign}GH₵${Math.round(abs)}`;
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/** 1250 → "12.50" (used for CSV export and pre-filling edit forms). */
export function pesewasToDecimalString(pesewas: number): string {
  const sign = pesewas < 0 ? '-' : '';
  const abs = Math.abs(Math.round(pesewas));
  const whole = Math.floor(abs / PESEWAS_PER_CEDI);
  const fraction = String(abs % PESEWAS_PER_CEDI).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

/** Pesewas → cedis as a plain number (for chart values and the AI summary). */
export function toCedis(pesewas: number): number {
  return Math.round(pesewas) / PESEWAS_PER_CEDI;
}

/** 0.256 → "26%" */
export function formatPercent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}
