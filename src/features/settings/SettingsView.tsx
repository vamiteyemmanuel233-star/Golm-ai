import { useState } from 'react';
import { Database, Download, Moon, ShieldCheck, Sun, Trash2, X } from 'lucide-react';
import { BRAND, ROADMAP } from '../../brand';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Logo } from '../layout/AppShell';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { csvFileName, downloadCsv, transactionsToCsv } from '../../lib/csv';
import { useFinance } from '../../state/FinanceContext';
import { useSettings } from '../../state/SettingsContext';
import { useToast } from '../../state/ToastContext';

export function SettingsView() {
  const { data, hasDemo, loadDemo, clearDemo, clearAll, persistent, today } = useFinance();
  const { theme, setTheme, aiConsent, setAiConsent } = useSettings();
  const { notify } = useToast();
  const [confirm, setConfirm] = useState<'demo' | 'all' | null>(null);
  const userCount = data.transactions.filter((t) => !t.isDemo).length;
  const demoCount = data.transactions.length - userCount;

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance, data and privacy." />

      <div className="settings-grid">
        <Card title="Appearance">
          <div className="segmented" role="group" aria-label="Colour theme">
            <button type="button" className={`segmented__option ${theme === 'light' ? 'is-active' : ''}`} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
              <Sun size={16} aria-hidden="true" /> Light
            </button>
            <button type="button" className={`segmented__option ${theme === 'dark' ? 'is-active' : ''}`} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
              <Moon size={16} aria-hidden="true" /> Dark
            </button>
          </div>
        </Card>

        <Card title="Demonstration data" subtitle="Invented records for exploring and presenting the app">
          <p className="muted">
            {hasDemo ? `${demoCount} demo transactions are loaded. They are labelled “Demo” everywhere.` : 'No demo data is loaded.'} Your own entries ({userCount}) are never changed by these buttons.
          </p>
          <div className="button-row">
            <Button
              variant="secondary"
              icon={Database}
              onClick={() => {
                if (hasDemo) {
                  setConfirm('demo');
                  return;
                }
                loadDemo();
                notify('Demo data loaded — marked as demonstration only.', 'info');
              }}
            >
              {hasDemo ? 'Reload demo data' : 'Load demo data'}
            </Button>
            <Button
              variant="secondary"
              icon={X}
              disabled={!hasDemo}
              onClick={() => {
                clearDemo();
                notify('Demo data cleared.', 'info');
              }}
            >
              Clear demo data
            </Button>
          </div>
        </Card>

        <Card title="Your data" subtitle={persistent ? 'Saved in this browser’s local storage only' : 'Storage is blocked — data is temporary'}>
          <p className="muted">GOLM AI has no account system and never uploads your records. Clearing your browser data will erase them, so export a CSV copy regularly.</p>
          <div className="button-row">
            <Button
              variant="secondary"
              icon={Download}
              disabled={data.transactions.length === 0}
              onClick={() => {
                downloadCsv(transactionsToCsv(data.transactions), csvFileName(today));
                notify(`Exported ${data.transactions.length} transactions.`);
              }}
            >
              Export all to CSV
            </Button>
            <Button variant="danger" icon={Trash2} disabled={data.transactions.length === 0 && data.budgets.length === 0} onClick={() => setConfirm('all')}>
              Delete all data
            </Button>
          </div>
        </Card>

        <Card title="AI privacy">
          <p className="muted">
            {aiConsent ? 'You have agreed to send a summary of your finances to the AI provider when you ask the live AI a question.' : 'Live AI consent has not been given. No financial data is sent anywhere.'}
          </p>
          <div className="button-row">
            <Button variant="secondary" icon={ShieldCheck} disabled={!aiConsent} onClick={() => { setAiConsent(false); notify('AI consent withdrawn.', 'info'); }}>
              Withdraw AI consent
            </Button>
          </div>
        </Card>

        <Card title={`About ${BRAND.name}`}>
          <div className="about">
            <Logo showTagline />
            <p className="muted">
              {BRAND.name} is developed by {BRAND.company}. This is a practice build (version 1.1). It is not connected to, affiliated with or endorsed by any bank, Mobile Money provider, regulator or hackathon organiser. It gives educational information, not financial advice.
            </p>
            <a href={BRAND.website} target="_blank" rel="noopener noreferrer" className="about__link">{BRAND.websiteLabel}</a>
          </div>
        </Card>

        <Card title="Coming to GOLM AI" subtitle="Planned features — not available yet" className="settings-grid__wide">
          <p className="muted">
            These are plans only. None of them are built, no bank or Mobile Money provider is connected, and {BRAND.name} does not move or hold money. Payment features would only launch with the required licences and partners.
          </p>
          <ul className="roadmap">
            {ROADMAP.map((item) => (
              <li key={item.title}>
                <div className="roadmap__head">
                  <h3>{item.title}</h3>
                  <Badge tone="neutral">Planned</Badge>
                </div>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm === 'demo'}
        title="Reload demo data?"
        message="Existing demo records will be replaced with a fresh set. Your own entries stay as they are."
        confirmLabel="Reload demo data"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          loadDemo();
          setConfirm(null);
          notify('Demo data reloaded.', 'info');
        }}
      />
      <ConfirmDialog
        open={confirm === 'all'}
        title="Delete all data?"
        message={`This permanently deletes all ${data.transactions.length} transactions and ${data.budgets.length} budgets from this browser, including your own entries. Export a CSV first if you want a copy.`}
        confirmLabel="Delete everything"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          clearAll();
          setConfirm(null);
          notify('All data deleted.', 'info');
        }}
      />
    </>
  );
}
