/**
 * Display currency and country preference.
 *
 * IMPORTANT: changing the currency only changes the SYMBOL shown. Stored
 * amounts are never converted — GOLM AI has no verified exchange-rate data,
 * so 100.00 stays 100.00. Users should pick the currency they actually record in.
 */
export type CurrencyCode = 'GHS' | 'NGN' | 'KES' | 'USD' | 'GBP' | 'EUR';
export type CountryCode = 'GH' | 'NG' | 'KE' | 'US' | 'GB' | 'EU' | 'OTHER';

export const CURRENCIES: { code: CurrencyCode; name: string; symbol: string }[] = [
  { code: 'GHS', name: 'Ghana cedi', symbol: 'GH₵' },
  { code: 'NGN', name: 'Nigerian naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan shilling', symbol: 'KSh ' },
  { code: 'USD', name: 'US dollar', symbol: '$' },
  { code: 'GBP', name: 'Pound sterling', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
];

export const COUNTRIES: { code: CountryCode; name: string; currency: CurrencyCode }[] = [
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'EU', name: 'Eurozone', currency: 'EUR' },
  { code: 'OTHER', name: 'Other country', currency: 'USD' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'GHS';
export const DEFAULT_COUNTRY: CountryCode = 'GH';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value);
}

export function isCountryCode(value: unknown): value is CountryCode {
  return COUNTRIES.some((c) => c.code === value);
}

export function countryName(code: CountryCode): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? 'Other country';
}

export function currencyInfo(code: CurrencyCode) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]!;
}

// The currency used for display. Set once from the user's settings
// (SettingsProvider); every formatter reads it, so all screens stay consistent.
let displayCurrency: CurrencyCode = DEFAULT_CURRENCY;

export function setDisplayCurrency(code: CurrencyCode): void {
  displayCurrency = code;
}

export function getDisplayCurrency(): CurrencyCode {
  return displayCurrency;
}

/** Symbol for the display currency, e.g. "GH₵" or "KSh " (trailing space for letter symbols). */
export function currencySymbol(code: CurrencyCode = displayCurrency): string {
  return currencyInfo(code).symbol;
}

/** Symbol without trailing space, for labels like "Amount (KSh)". */
export function currencyLabel(code: CurrencyCode = displayCurrency): string {
  return currencySymbol(code).trim();
}
