import { describe, expect, it } from 'vitest';
import { csvFileName, escapeCsvField, transactionsToCsv } from './csv';
import { tx } from './testUtils';

describe('escapeCsvField', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line\nbreak')).toBe('"line\nbreak"');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(escapeCsvField('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(escapeCsvField('+233')).toBe("'+233");
    expect(escapeCsvField('@cmd')).toBe("'@cmd");
  });
});

describe('transactionsToCsv', () => {
  it('writes a header and one row per transaction, newest first', () => {
    const csv = transactionsToCsv([
      { ...tx('expense', 12.5, 'Transport', '2026-11-01', 'Trotro, Circle'), method: 'momo' },
      tx('income', 5000, 'Salary', '2026-11-02', 'Pay'), // older record without a method
    ]);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Date,Type,Category,Description,Payment method,Amount (GHS),Demo data');
    expect(lines[1]).toBe('2026-11-02,Income,Salary,Pay,Not recorded,5000.00,No');
    expect(lines[2]).toBe('2026-11-01,Expense,Transport,"Trotro, Circle",Mobile Money,12.50,No');
  });

  it('names files by date', () => {
    expect(csvFileName('2026-11-20')).toBe('golm-ai-transactions-2026-11-20.csv');
  });
});
