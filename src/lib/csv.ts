import type { Transaction } from '../types/finance';
import { sortTransactions } from './finance';
import { pesewasToDecimalString } from './money';
import { paymentMethodLabel } from './paymentMethods';

/**
 * Escapes one CSV cell.
 * - Cells starting with = + - @ (or tab/CR) are prefixed with ' so spreadsheet
 *   apps don't run them as formulas (CSV/formula injection protection).
 * - Cells containing commas, quotes or line breaks are wrapped in quotes.
 */
export function escapeCsvField(value: string): string {
  let cell = value;
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  if (/[",\r\n]/.test(cell)) cell = `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export const CSV_HEADER = ['Date', 'Type', 'Category', 'Description', 'Payment method', 'Amount (GHS)', 'Demo data'];

export function transactionsToCsv(transactions: readonly Transaction[]): string {
  const rows = sortTransactions(transactions).map((tx) =>
    [
      tx.date,
      tx.type === 'income' ? 'Income' : 'Expense',
      tx.category,
      tx.description,
      paymentMethodLabel(tx.method),
      pesewasToDecimalString(tx.amount),
      tx.isDemo ? 'Yes' : 'No',
    ]
      .map(escapeCsvField)
      .join(','),
  );
  return [CSV_HEADER.join(','), ...rows].join('\r\n') + '\r\n';
}

export function csvFileName(today: string): string {
  return `golm-ai-transactions-${today}.csv`;
}

/** Triggers a browser download. The BOM makes Excel read "GH₵" and accents correctly. */
export function downloadCsv(csv: string, fileName: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
