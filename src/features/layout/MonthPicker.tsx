import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { addMonths, monthKeyOf, monthLabel } from '../../lib/dates';
import { monthsWithData } from '../../lib/finance';
import { useFinance } from '../../state/FinanceContext';
import { useUi } from '../../state/UiContext';

/** Choose which month the dashboard, budgets and insights describe. */
export function MonthPicker() {
  const { data, today } = useFinance();
  const { month, setMonth } = useUi();
  const current = monthKeyOf(today);

  const options = useMemo(() => {
    const set = new Set([...monthsWithData(data.transactions), current, month]);
    return [...set].filter((m) => m <= current).sort().reverse();
  }, [data.transactions, current, month]);

  const index = options.indexOf(month);
  const older = options[index + 1];
  const newer = index > 0 ? options[index - 1] : undefined;

  return (
    <div className="month-picker">
      <button type="button" className="icon-btn" onClick={() => older && setMonth(older)} disabled={!older} aria-label="Previous month with data">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <label className="sr-only" htmlFor="month-select">
        Month shown
      </label>
      <select id="month-select" className="month-picker__select" value={month} onChange={(e) => setMonth(e.target.value)}>
        {options.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
            {m === current ? ' · now' : ''}
          </option>
        ))}
      </select>
      <button type="button" className="icon-btn" onClick={() => newer && setMonth(newer)} disabled={!newer} aria-label="Next month with data">
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export function useMonthMeta() {
  const { today } = useFinance();
  const { month } = useUi();
  const current = monthKeyOf(today);
  return {
    month,
    isCurrent: month === current,
    previous: addMonths(month, -1),
    label: monthLabel(month, 'long'),
  };
}
