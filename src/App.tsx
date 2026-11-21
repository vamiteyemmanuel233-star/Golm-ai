import type { ComponentType } from 'react';
import { Compass, Download, RotateCcw, ShieldAlert } from 'lucide-react';
import { useHashRoute, type RouteId } from './app/routes';
import { Button, ButtonLink } from './components/Button';
import { Card } from './components/Card';
import { EmptyState } from './components/EmptyState';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AboutView } from './features/about/AboutView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { AssistantView } from './features/assistant/AssistantView';
import { BudgetsView } from './features/budgets/BudgetsView';
import { DashboardView } from './features/dashboard/DashboardView';
import { GoalsView } from './features/goals/GoalsView';
import { InsightsView } from './features/insights/InsightsView';
import { AppShell, Logo } from './features/layout/AppShell';
import { SettingsView } from './features/settings/SettingsView';
import { SimulatorView } from './features/simulator/SimulatorView';
import { TransactionModal } from './features/transactions/TransactionModal';
import { TransactionsView } from './features/transactions/TransactionsView';
import { FinanceProvider, useFinance } from './state/FinanceContext';
import { SettingsProvider, useSettings } from './state/SettingsContext';
import { ToastProvider } from './state/ToastContext';
import { UiProvider } from './state/UiContext';

const VIEWS: Record<RouteId, ComponentType> = {
  about: AboutView,
  dashboard: DashboardView,
  transactions: TransactionsView,
  budgets: BudgetsView,
  goals: GoalsView,
  simulator: SimulatorView,
  analytics: AnalyticsView,
  insights: InsightsView,
  assistant: AssistantView,
  settings: SettingsView,
};

function NotFound() {
  return (
    <Card>
      <EmptyState icon={Compass} title="Page not found" message="That address does not match any GOLM AI page.">
        <ButtonLink href="#/" variant="primary">Go to dashboard</ButtonLink>
      </EmptyState>
    </Card>
  );
}

/** Shown when saved data can't be read, instead of crashing or silently wiping it. */
function RecoveryScreen() {
  const { corrupt, resetCorrupt } = useFinance();
  if (!corrupt) return null;
  const downloadRaw = () => {
    const blob = new Blob([corrupt.raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'golm-ai-unreadable-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="recovery">
      <div className="recovery__panel" role="alert">
        <Logo />
        <span className="recovery__icon" aria-hidden="true"><ShieldAlert size={28} /></span>
        <h1>Your saved data could not be read</h1>
        <p>{corrupt.error}</p>
        <p className="muted">Nothing has been deleted. Download a copy of the raw data for safekeeping, then start fresh.</p>
        <div className="button-row button-row--center">
          <Button variant="secondary" icon={Download} onClick={downloadRaw} disabled={!corrupt.raw}>Download raw backup</Button>
          <Button variant="danger" icon={RotateCcw} onClick={resetCorrupt}>Start fresh</Button>
        </div>
      </div>
    </div>
  );
}

function Routed() {
  const route = useHashRoute();
  const { corrupt } = useFinance();
  const { currency } = useSettings();
  if (corrupt) return <RecoveryScreen />;
  const View = route === 'not-found' ? NotFound : VIEWS[route];
  return (
    <UiProvider>
      <AppShell route={route}>
        <ErrorBoundary resetKey={route}>
          {/* key: changing the display currency redraws the page with the new symbol */}
          <View key={currency} />
        </ErrorBoundary>
      </AppShell>
      <TransactionModal />
    </UiProvider>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <FinanceProvider>
          <Routed />
        </FinanceProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
