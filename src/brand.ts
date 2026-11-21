/**
 * GOLM AI brand settings — one place to change names, tagline and links.
 * Components read from here instead of hard-coding text, so the product can
 * grow (new modules, new markets) without hunting through every file.
 */
export const BRAND = {
  name: 'GOLM AI',
  shortName: 'GOLM',
  tagline: 'Smart Finance. Smarter Future.',
  assistantName: 'GOLM AI Coach',
  company: 'Vamit Golm Company Limited',
  website: 'https://vamitgolm.com',
  websiteLabel: 'vamitgolm.com',
  year: 2026,
} as const;

export type RoadmapStatus = 'planned';

/**
 * Future modules. These are PLANS ONLY. Nothing here is implemented, connected
 * to any provider, or approved by any regulator, and the UI says so.
 */
export const ROADMAP: { title: string; description: string; status: RoadmapStatus }[] = [
  { title: 'Mobile Money import', description: 'Import MoMo statements so transactions are recorded automatically.', status: 'planned' },
  { title: 'Bank connections', description: 'Securely read balances and transactions from partner banks.', status: 'planned' },
  { title: 'Money transfers & payments', description: 'Send money and pay bills — only with the required licences and partners in place.', status: 'planned' },
  { title: 'Business finance', description: 'Sales, stock and expense tracking for small businesses and traders.', status: 'planned' },
  { title: 'Advanced AI planning', description: 'Longer-term plans for goals such as school fees, rent and retirement.', status: 'planned' },
];
