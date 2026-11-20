import type { PaymentMethod } from '../types/finance';

/**
 * Payment methods people in Ghana use every day. Recording them answers a
 * real question: "how much of my money moves through MoMo vs cash vs bank?"
 * GOLM AI only RECORDS the method; it does not connect to any provider.
 */
export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'momo', label: 'Mobile Money' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank', label: 'Bank transfer' },
  { id: 'card', label: 'Card' },
];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some((m) => m.id === value);
}

export function paymentMethodLabel(method: PaymentMethod | undefined): string {
  return PAYMENT_METHODS.find((m) => m.id === method)?.label ?? 'Not recorded';
}
