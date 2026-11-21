import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Bot, Calculator, ChevronDown, ChevronUp, Lock, RefreshCw, Send, ShieldCheck, Sparkles, Trash2, User, WifiOff } from 'lucide-react';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { BRAND } from '../../brand';
import { answerQuickQuestion, buildAiContext, COACH_QUESTIONS, LIVE_COACH_PROMPTS, QUICK_QUESTIONS, type QuickQuestionId } from '../../lib/assistant';
import { countryName } from '../../lib/currency';
import { askAi, checkAiStatus, type AiStatus, type ChatTurn } from '../../lib/aiClient';
import { useFinance } from '../../state/FinanceContext';
import { useSettings } from '../../state/SettingsContext';
import { useMonthMeta } from '../layout/MonthPicker';
import { FormattedText } from './FormattedText';

type MessageSource = 'user' | 'ai' | 'local' | 'error';

interface Message {
  id: number;
  source: MessageSource;
  text: string;
  model?: string;
}

const QUESTION_MAX = 500;

export function AssistantView() {
  const { data, today } = useFinance();
  const { aiConsent, setAiConsent, country } = useSettings();
  const { month, label } = useMonthMeta();
  const [status, setStatus] = useState<AiStatus>({ state: 'checking' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [agree, setAgree] = useState(false);
  // Quick questions fold away once a conversation starts, to give the chat more room.
  const [quickOpen, setQuickOpen] = useState(false);
  const showQuick = messages.length === 0 || quickOpen;
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  const inputs = useMemo(
    () => ({ transactions: data.transactions, budgets: data.budgets, goals: data.goals, month, today, country: countryName(country) }),
    [data, month, today, country],
  );
  const context = useMemo(() => buildAiContext(inputs), [inputs]);

  const refreshStatus = useCallback(async () => {
    setStatus({ state: 'checking' });
    setStatus(await checkAiStatus());
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const push = (source: MessageSource, text: string, model?: string) =>
    setMessages((list) => [...list, { id: nextId.current++, source, text, model }]);

  const liveReady = status.state === 'available' && aiConsent;

  const askQuick = (id: QuickQuestionId, text: string) => {
    setQuickOpen(false);
    push('user', text);
    push('local', answerQuickQuestion(id, inputs));
  };

  const sendToAi = async (raw: string) => {
    const text = raw.trim();
    if (!text || !liveReady || sending) return;
    setQuickOpen(false);
    // Only real AI exchanges go into the history: a user message immediately
    // followed by a live AI reply. Locally calculated answers are not sent.
    const history: ChatTurn[] = [];
    messages.forEach((m, i) => {
      const prev = messages[i - 1];
      if (m.source === 'ai' && prev?.source === 'user') {
        history.push({ role: 'user', text: prev.text }, { role: 'assistant', text: m.text });
      }
    });
    push('user', text);
    setQuestion('');
    setSending(true);
    try {
      const { answer, model } = await askAi(text, context, history);
      push('ai', answer, model);
    } catch (error) {
      push('error', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void sendToAi(question);
  };

  return (
    <>
      <PageHeader
        title={BRAND.assistantName}
        subtitle={`Personal coaching from your own records for ${label}: spending, savings plans and goals.`}
        actions={
          messages.length > 0 ? (
            <Button variant="ghost" icon={Trash2} onClick={() => setMessages([])}>Clear chat</Button>
          ) : undefined
        }
      />

      <div className="assistant-layout">
        <div className="assistant-main">
          <Card className="chat-card">
            <div className="chat-status">
              <AiStatusPill status={status} consent={aiConsent} />
              <button type="button" className="link-btn" onClick={() => void refreshStatus()} disabled={status.state === 'checking'}>
                <RefreshCw size={14} aria-hidden="true" /> Re-check
              </button>
            </div>

            <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <span className="chat-empty__icon" aria-hidden="true"><Sparkles size={24} /></span>
                  <p><strong>Try a quick question below.</strong> Quick answers are calculated instantly from your data on this device.</p>
                  <p className="muted">{liveReady ? 'Live AI is ready for your own questions too.' : 'Free-form questions need the optional live AI (see the panel).'}</p>
                </div>
              ) : (
                messages.map((m) => <ChatMessage key={m.id} message={m} />)
              )}
              {sending ? (
                <div className="msg msg--ai" aria-label="AI is responding">
                  <span className="msg__avatar" aria-hidden="true"><Bot size={16} /></span>
                  <div className="msg__bubble"><span className="typing" aria-hidden="true"><span /><span /><span /></span><span className="sr-only">Waiting for the AI…</span></div>
                </div>
              ) : null}
            </div>

            {messages.length > 0 ? (
              <button
                type="button"
                className="quick-toggle"
                aria-expanded={quickOpen}
                aria-controls="quick-questions"
                onClick={() => setQuickOpen((open) => !open)}
              >
                <Calculator size={14} aria-hidden="true" /> Quick questions
                {quickOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              </button>
            ) : null}

            {showQuick ? (
              <div id="quick-questions" className="quick-panel">
                {liveReady ? (
                  <div className="quick-group">
                    <p className="quick-group__title"><Sparkles size={14} aria-hidden="true" /> Ask the live AI coach (Gemini)</p>
                    <div className="quick-questions" role="group" aria-label="Coach prompts sent to live AI">
                      {LIVE_COACH_PROMPTS.map((prompt) => (
                        <button key={prompt} type="button" className="chip chip--ai" onClick={() => void sendToAi(prompt)} disabled={sending}>
                          <Bot size={14} aria-hidden="true" /> {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="quick-group">
                  <p className="quick-group__title"><Calculator size={14} aria-hidden="true" /> Coach answers — calculated on this device, not AI</p>
                  <div className="quick-questions" role="group" aria-label="Coach questions (calculated locally)">
                    {COACH_QUESTIONS.map((q) => (
                      <button key={q.id} type="button" className="chip" onClick={() => askQuick(q.id, q.label)}>
                        <Calculator size={14} aria-hidden="true" /> {q.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="quick-group">
                  <p className="quick-group__title">More quick answers</p>
                  <div className="quick-questions" role="group" aria-label="Quick questions (calculated locally)">
                    {QUICK_QUESTIONS.filter((q) => !COACH_QUESTIONS.some((c) => c.id === q.id)).map((q) => (
                      <button key={q.id} type="button" className="chip" onClick={() => askQuick(q.id, q.label)}>
                        <Calculator size={14} aria-hidden="true" /> {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <form className="chat-input" onSubmit={submit}>
              <label htmlFor="chat-question" className="sr-only">Ask the AI a question</label>
              <input
                id="chat-question"
                className="input"
                placeholder={liveReady ? 'e.g. How can I reduce my transport costs?' : 'Live AI is off — use the quick questions above'}
                value={question}
                maxLength={QUESTION_MAX}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!liveReady || sending}
              />
              <Button type="submit" icon={Send} disabled={!liveReady || !question.trim()} loading={sending}>
                <span className="hide-sm">Send</span>
              </Button>
            </form>
            <p className="disclaimer">Educational information only — not professional financial advice. No outcome or return is guaranteed.</p>
          </Card>
        </div>

        <aside className="assistant-side">
          <Card title="Live AI and your privacy">
            {status.state === 'unavailable' ? (
              <div className="notice notice--warning" role="note">
                <WifiOff size={18} aria-hidden="true" />
                <p><strong>Live AI is unavailable.</strong> {status.reason} Everything else in GOLM AI works without it.</p>
              </div>
            ) : null}

            {aiConsent ? (
              <div className="consent consent--on">
                <p className="consent__on-text"><ShieldCheck size={16} aria-hidden="true" /><span>You agreed to share a <strong>summary</strong> of your finances with the AI provider.</span></p>
                <Button variant="secondary" size="sm" onClick={() => { setAiConsent(false); setAgree(false); }}>Withdraw consent</Button>
              </div>
            ) : (
              <div className="consent">
                <p>When you ask the live AI a question, GOLM AI sends it — with a summary of your figures — through GOLM AI’s secure server (your computer, or the GOLM AI website’s server) to <strong>Google’s Gemini API</strong>. Your API key is never in the browser.</p>
                <ul className="check-list">
                  <li>Shared: monthly totals, category and payment-method totals, budgets, savings-goal amounts, the forecast and rule-based findings.</li>
                  <li>Never shared: transaction descriptions, goal names, exact dates, IDs or your name.</li>
                  <li>On Google’s free tier, Google may use submitted content to improve its products. Don’t enter personal details in your questions.</li>
                </ul>
                <label className="checkbox">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                  I understand and agree to send this summary to the AI provider.
                </label>
                <Button icon={Lock} disabled={!agree} onClick={() => setAiConsent(true)}>Enable live AI</Button>
              </div>
            )}

            <details className="data-preview">
              <summary>Preview exactly what would be sent</summary>
              <pre>{JSON.stringify(context, null, 2)}</pre>
            </details>
          </Card>
        </aside>
      </div>
    </>
  );
}

function AiStatusPill({ status, consent }: { status: AiStatus; consent: boolean }) {
  if (status.state === 'checking') return <Badge tone="neutral">Checking live AI…</Badge>;
  if (status.state === 'unavailable') return <Badge tone="amber">Live AI unavailable · quick answers only</Badge>;
  if (!consent) return <Badge tone="blue">Live AI available · consent needed</Badge>;
  return <Badge tone="green">Live AI on · {status.model}</Badge>;
}

function ChatMessage({ message }: { message: Message }) {
  if (message.source === 'user') {
    return (
      <div className="msg msg--user">
        <div className="msg__bubble">{message.text}</div>
        <span className="msg__avatar" aria-hidden="true"><User size={16} /></span>
      </div>
    );
  }
  const meta =
    message.source === 'ai'
      ? { icon: Bot, label: `${BRAND.assistantName} · live AI (${message.model ?? 'model'}) · may contain mistakes` }
      : message.source === 'local'
        ? { icon: Calculator, label: 'Coach formula · calculated on this device from your data — not AI' }
        : { icon: WifiOff, label: 'Error' };
  const Icon = meta.icon;
  return (
    <div className={`msg msg--${message.source}`}>
      <span className="msg__avatar" aria-hidden="true"><Icon size={16} /></span>
      <div className="msg__bubble">
        <span className="msg__source">{meta.label}</span>
        {message.source === 'ai' || message.source === 'local' ? <FormattedText text={message.text} /> : <p className="msg__text">{message.text}</p>}
      </div>
    </div>
  );
}
