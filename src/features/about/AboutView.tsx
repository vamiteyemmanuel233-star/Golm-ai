import { Bot, Calculator, Database, Lock, PiggyBank, ShieldCheck, SlidersHorizontal, Smartphone, Target, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { routeHref } from '../../app/routes';
import { BRAND } from '../../brand';
import { Button, ButtonLink } from '../../components/Button';
import { useFinance } from '../../state/FinanceContext';
import { useToast } from '../../state/ToastContext';
import { Logo } from '../layout/AppShell';

const STEPS: { title: string; text: string }[] = [
  { title: 'Record', text: 'Add income and expenses in seconds — with category and how you paid: Mobile Money, cash, bank or card.' },
  { title: 'Understand', text: 'See where your money goes, which budgets are slipping and which expenses are unusual — every number explained.' },
  { title: 'Plan', text: 'Test changes in the What-if simulator, set savings goals and get coaching built on your own figures.' },
];

const FEATURES: { icon: LucideIcon; title: string; text: string; href: string }[] = [
  { icon: Bot, title: 'AI financial coach', text: 'Personal coaching from your real records. Live Gemini explains; GOLM’s own formulas do the maths.', href: routeHref('assistant') },
  { icon: SlidersHorizontal, title: 'What-if simulator', text: 'Cut food by 20%? See the monthly and yearly saving and how much sooner you reach a goal — offline.', href: routeHref('simulator') },
  { icon: Target, title: 'Smart savings goals', text: 'Monthly amount needed, progress, and a warning when goals need more than you usually have left over.', href: routeHref('goals') },
  { icon: PiggyBank, title: 'Budgets that warn early', text: 'Alerts at 85% and when a category goes over, before the month is gone.', href: routeHref('budgets') },
  { icon: Smartphone, title: 'Built for how people pay', text: 'Mobile Money, cash, bank and card tracked side by side; six currencies supported for display.', href: routeHref('transactions') },
  { icon: Calculator, title: 'Transparent insights', text: 'Unusual-expense detection and spending forecasts that show their formula — no black boxes.', href: routeHref('insights') },
];

const TRUST: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Lock, title: 'Private by design', text: 'Records stay on your device. Nothing is uploaded unless you ask the live AI — and then only totals, after you consent.' },
  { icon: WifiOff, title: 'Works offline', text: 'Tracking, budgets, goals, simulator and coach formulas all work without internet.' },
  { icon: ShieldCheck, title: 'Honest AI', text: 'Every answer is labelled: “coach formula — not AI” or “live AI”. No invented numbers, no promised returns.' },
];

/** Introduction screen for new users and hackathon judges. */
export function AboutView() {
  const { data, loadDemo } = useFinance();
  const { notify } = useToast();
  const hasData = data.transactions.length > 0;

  return (
    <div className="about-page">
      <section className="hero">
        <div className="hero__brand"><Logo showTagline /></div>
        <h1 className="hero__title" tabIndex={-1} data-page-title>
          Know where your money goes. <span>Plan where it should go.</span>
        </h1>
        <p className="hero__lead">
          {BRAND.name} is a personal finance coach for everyday earners — students, workers and small traders. It turns income and spending records into clear budgets, realistic savings plans and honest, explainable advice.
        </p>
        <div className="hero__actions">
          {hasData ? (
            <ButtonLink href={routeHref('dashboard')} variant="primary">Open my dashboard</ButtonLink>
          ) : (
            <Button
              icon={Database}
              onClick={() => {
                loadDemo();
                notify('Demo data loaded — marked as demonstration only.', 'info');
                window.location.hash = routeHref('dashboard');
              }}
            >
              Try it with demo data
            </Button>
          )}
          <ButtonLink href={routeHref('simulator')} icon={SlidersHorizontal}>Try the What-if simulator</ButtonLink>
        </div>
      </section>

      <section className="about-section">
        <h2>The problem</h2>
        <p>
          Many people are paid in one lump and spend through many channels — Mobile Money, cash, transfers and cards — so money disappears without a clear picture of where it went. Budgeting tools are often built for other markets, assume a single bank account, or give generic tips that ignore a person’s real numbers.
        </p>
      </section>

      <section className="about-section">
        <h2>How {BRAND.name} works</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="steps__num" aria-hidden="true">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-section">
        <h2>What makes it different</h2>
        <div className="feature-cards">
          {FEATURES.map(({ icon: Icon, title, text, href }) => (
            <a key={title} href={href} className="feature-card">
              <span className="feature-card__icon" aria-hidden="true"><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>Trust and privacy</h2>
        <div className="trust-grid">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <div key={title} className="trust">
              <Icon size={20} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="muted small-print">
          {BRAND.name} records and plans money; it does not hold, move or invest it, and is not connected to any bank or Mobile Money provider. It gives educational information, not financial advice. Developed by {BRAND.company}.
        </p>
      </section>
    </div>
  );
}
