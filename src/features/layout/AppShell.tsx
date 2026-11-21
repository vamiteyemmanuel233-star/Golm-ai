import { useEffect, useRef, type ReactNode } from 'react';
import { Database, Moon, Plus, Settings, ShieldAlert, Sun, X } from 'lucide-react';
import { ROUTES, type RouteId } from '../../app/routes';
import { BRAND } from '../../brand';
import { Button, IconButton } from '../../components/Button';
import { useFinance } from '../../state/FinanceContext';
import { useSettings } from '../../state/SettingsContext';
import { useToast } from '../../state/ToastContext';
import { useUi } from '../../state/UiContext';
import { MonthPicker } from './MonthPicker';

/** GOLM AI logo: a "G" monogram whose arrow-like bar points forward. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <path d="M22.4 10.6A8.6 8.6 0 1 0 24.2 17H16.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24.4" cy="7.6" r="2" fill="#8fb0ff" />
    </svg>
  );
}

export function Logo({ showTagline = false }: { showTagline?: boolean }) {
  return (
    <span className="logo">
      <span className="logo__mark">
        <LogoMark />
      </span>
      <span className="logo__text">
        <span className="logo__name">
          {BRAND.shortName} <strong>AI</strong>
        </span>
        {showTagline ? <span className="logo__tagline">{BRAND.tagline}</span> : null}
      </span>
    </span>
  );
}

export function AppFooter() {
  return (
    <footer className="app-footer">
      <p>
        <strong>{BRAND.name}</strong> · {BRAND.tagline}
      </p>
      <p>
        © {BRAND.year} {BRAND.company} ·{' '}
        <a href={BRAND.website} target="_blank" rel="noopener noreferrer">
          {BRAND.websiteLabel}
        </a>{' '}
        · Educational information, not financial advice.
      </p>
    </footer>
  );
}

export function AppShell({ route, children }: { route: RouteId | 'not-found'; children: ReactNode }) {
  const { hasDemo, clearDemo, saveError, persistent } = useFinance();
  const { theme, toggleTheme } = useSettings();
  const { openNewTransaction } = useUi();
  const { notify } = useToast();
  const mainRef = useRef<HTMLElement>(null);
  const lastRoute = useRef(route);

  // After navigation, move focus to the new page's heading (not on first load).
  // Comparing with the previous route (instead of a "first run" flag) stays
  // correct when React StrictMode runs effects twice in development.
  useEffect(() => {
    if (lastRoute.current === route) return;
    lastRoute.current = route;
    mainRef.current?.querySelector<HTMLElement>('[data-page-title]')?.focus();
    window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <aside className="sidebar">
        <a href="#/" className="sidebar__brand" aria-label={`${BRAND.name} dashboard`}>
          <Logo showTagline />
        </a>
        <nav aria-label="Main navigation">
          <ul className="nav">
            {ROUTES.map(({ id, label, href, icon: Icon }) => (
              <li key={id}>
                <a href={href} className={`nav__link ${route === id ? 'is-active' : ''}`} aria-current={route === id ? 'page' : undefined}>
                  <Icon size={19} aria-hidden="true" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar__note">
          <p>Your data stays on this device.</p>
          <p className="sidebar__company">Powered by {BRAND.company}</p>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <a href="#/" className="topbar__brand" aria-label={`${BRAND.name} dashboard`}>
            <Logo />
          </a>
          <MonthPicker />
          <div className="topbar__actions">
            <a href="#/settings" className="icon-btn show-sm" aria-label="Settings" title="Settings">
              <Settings size={18} aria-hidden="true" />
            </a>
            <IconButton icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme} />
            <Button icon={Plus} onClick={openNewTransaction} className="topbar__add">
              <span className="hide-sm">Add transaction</span>
            </Button>
          </div>
        </header>

        {hasDemo ? (
          <div className="banner banner--demo" role="note">
            <Database size={18} aria-hidden="true" />
            <p>
              <strong>Demo data loaded.</strong> <span className="hide-sm">These records are invented for showing the app and are not real financial records.</span>
            </p>
            <Button
              size="sm"
              variant="secondary"
              icon={X}
              onClick={() => {
                clearDemo();
                notify('Demo data cleared. Your own entries were kept.', 'info');
              }}
            >
              Clear demo data
            </Button>
          </div>
        ) : null}

        {saveError ? (
          <div className="banner banner--error" role="alert">
            <ShieldAlert size={18} aria-hidden="true" />
            <p>{saveError}</p>
          </div>
        ) : null}

        {!persistent ? (
          <div className="banner banner--warning" role="note">
            <ShieldAlert size={18} aria-hidden="true" />
            <p>This browser is blocking local storage, so your data will be lost when you close the tab.</p>
          </div>
        ) : null}

        <main id="main" ref={mainRef} className="content" tabIndex={-1}>
          {children}
          <AppFooter />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Main navigation (mobile)">
        {ROUTES.filter((r) => r.primary).map(({ id, label, short, href, icon: Icon }) => (
          <a key={id} href={href} className={`bottom-nav__link ${route === id ? 'is-active' : ''}`} aria-current={route === id ? 'page' : undefined} aria-label={label}>
            <Icon size={20} aria-hidden="true" />
            <span aria-hidden="true">{short ?? label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
