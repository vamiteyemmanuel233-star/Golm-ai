import { useEffect, useState } from 'react';
import { ArrowLeftRight, Activity, Bot, Info, LayoutDashboard, Lightbulb, PiggyBank, Settings, SlidersHorizontal, Target, type LucideIcon } from 'lucide-react';

export type RouteId = 'about' | 'dashboard' | 'transactions' | 'budgets' | 'goals' | 'simulator' | 'analytics' | 'insights' | 'assistant' | 'settings';

export interface RouteDef {
  id: RouteId;
  label: string;
  href: string;
  icon: LucideIcon;
  /** shown in the mobile bottom bar */
  primary: boolean;
  /** shorter label for the mobile bottom bar */
  short?: string;
}

export const ROUTES: RouteDef[] = [
  { id: 'dashboard', label: 'Dashboard', href: '#/', icon: LayoutDashboard, primary: true, short: 'Home' },
  { id: 'transactions', label: 'Transactions', href: '#/transactions', icon: ArrowLeftRight, primary: true, short: 'Records' },
  { id: 'budgets', label: 'Budgets', href: '#/budgets', icon: PiggyBank, primary: true },
  { id: 'goals', label: 'Goals', href: '#/goals', icon: Target, primary: true },
  { id: 'simulator', label: 'What-if', href: '#/simulator', icon: SlidersHorizontal, primary: true },
  // Analytics stays in the desktop sidebar; on phones it is linked from the dashboard and insights pages.
  { id: 'analytics', label: 'Analytics', href: '#/analytics', icon: Activity, primary: false },
  { id: 'insights', label: 'Insights', href: '#/insights', icon: Lightbulb, primary: true },
  { id: 'assistant', label: 'AI Coach', href: '#/assistant', icon: Bot, primary: true, short: 'Coach' },
  { id: 'about', label: 'About GOLM AI', href: '#/about', icon: Info, primary: false },
  { id: 'settings', label: 'Settings', href: '#/settings', icon: Settings, primary: false },
];

export function routeHref(id: RouteId): string {
  return ROUTES.find((r) => r.id === id)?.href ?? '#/';
}

function parseHash(hash: string): RouteId | 'not-found' {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  if (path === '') return 'dashboard';
  const match = ROUTES.find((r) => r.id === path);
  return match ? match.id : 'not-found';
}

/**
 * Hash-based routing (#/transactions). Chosen over a router library because it
 * needs no dependency, works when the built files are opened from any static
 * host, and every nav item is a real, linkable <a href>.
 */
export function useHashRoute(): RouteId | 'not-found' {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
