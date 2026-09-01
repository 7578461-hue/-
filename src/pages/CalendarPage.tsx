import { useMemo } from 'react';
import { addMonths, daysInMonth, fmtCompact, monthTitle, todayISO } from '../lib/format';
import { scheduledPayments } from '../state/selectors';
import { useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { PayList } from '../components/PayList';
import { RecurringManager } from '../components/RecurringManager';

const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const statusDotClass = { paid: 'g', soon: 'y', overdue: 'r', upcoming: 'n' } as const;

export function CalendarPage() {
  const state = useAppState();
  const { month } = useUi();
  const currency = state.settings.currency;

  const items = useMemo(() => scheduledPayments(state, month), [state, month]);
  const prevOverdue = useMemo(
    () => scheduledPayments(state, addMonths(month, -1)).filter((p) => p.status === 'overdue'),
    [state, month],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, typeof items>();
    for (const p of items) {
      const list = map.get(p.day) ?? [];
      list.push(p);
      map.set(p.day, list);
    }
    return map;
  }, [items]);

  const [y, m] = month.split('-').map(Number);
  const n = daysInMonth(month);
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // 0 = понедельник
  const prevMonthDays = daysInMonth(addMonths(month, -1));
  const today = todayISO();
  const todayDay = today.slice(0, 7) === month ? Number(today.slice(8, 10)) : -1;
  const cellsAfter = (7 - ((firstDow + n) % 7)) % 7;

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">📅 Календарь платежей</h2>
        <span className="spacer" />
        <span className="legend">
          <span className="key"><i style={{ background: 'var(--good)', borderRadius: '50%' }} /> оплачено</span>
          <span className="key"><i style={{ background: 'var(--warn)', borderRadius: '50%' }} /> скоро</span>
          <span className="key"><i style={{ background: 'var(--bad)', borderRadius: '50%' }} /> просрочено</span>
          <span className="key"><i style={{ background: 'var(--axis)', borderRadius: '50%' }} /> ожидается</span>
        </span>
      </div>

      <div className="card">
        <div className="cal">
          {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
          {Array.from({ length: firstDow }, (_, i) => (
            <div key={'p' + i} className="day off"><div className="num">{prevMonthDays - firstDow + 1 + i}</div></div>
          ))}
          {Array.from({ length: n }, (_, i) => {
            const day = i + 1;
            const events = byDay.get(day) ?? [];
            return (
              <div key={day} className={'day' + (day === todayDay ? ' today' : '')}>
                <div className="num">{day}</div>
                {events.map((p) => (
                  <div key={p.key} className="ev" title={`${p.name} — ${fmtCompact(p.amount)}`}>
                    <span className={'dot ' + statusDotClass[p.status]} />
                    <span className="ev-text money">{p.name.replace(/^Зарплата — /, '')} · {fmtCompact(p.amount)}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {Array.from({ length: cellsAfter }, (_, i) => (
            <div key={'n' + i} className="day off"><div className="num">{i + 1}</div></div>
          ))}
        </div>
      </div>

      {prevOverdue.length > 0 && (
        <div className="card chart-card" style={{ borderColor: 'var(--bad)' }}>
          <h3 style={{ color: 'var(--bad-text)' }}>Просроченные с прошлого месяца</h3>
          <div className="sub">закройте их или удалите неактуальные регулярные платежи</div>
          <PayList items={prevOverdue} currency={currency} />
        </div>
      )}

      <div className="card chart-card">
        <h3>Все платежи — {monthTitle(month).toLowerCase()}</h3>
        <div className="sub">аренда, коммунальные, зарплаты, кредиты и подписки</div>
        <PayList
          items={items}
          currency={currency}
          emptyText="Запланированных платежей нет. Добавьте регулярные платежи ниже, сотрудников — на вкладке «Персонал», кредиты — на вкладке «Кредиты и долги»."
        />
      </div>

      <div className="card">
        <RecurringManager />
      </div>
    </>
  );
}
