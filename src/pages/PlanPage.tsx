// Бюджет и план месяца: роспись «куда и сколько планирую заплатить»
// по каждой категории. Плановая сумма одновременно служит лимитом:
// с 80% строка подсвечивается жёлтым, при превышении — красным.
// Общий бюджет месяца считается автоматически как сумма статей плана.
// План наследуется следующими месяцами, пока его не изменят.

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { addMonths, fmtMoney, fmtPct, fmtSigned, monthTitle, pluralRu } from '../lib/format';
import {
  effectiveExpensePlan, effectiveIncomePlan, expenseByCategory, expensePlanGroups,
  groupIcon, groupName, scheduledPayments, txsOfMonth,
} from '../state/selectors';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { Meter, StatCard } from '../components/ui';

function PlanInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(value ? String(value) : '');
  useEffect(() => setText(value ? String(value) : ''), [value]);
  const commit = () => {
    const n = Number(text.replace(',', '.').replace(/\s/g, ''));
    const v = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
    if (v !== value) onCommit(v);
  };
  return (
    <input
      className="input money plan-input"
      inputMode="decimal"
      placeholder="0"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      onClick={(e) => e.stopPropagation()}
      aria-label="Плановая сумма"
    />
  );
}

type Tone = 'accent' | 'warn' | 'over';
const expenseTone = (ratio: number): Tone => (ratio > 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'accent');

export function PlanPage() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { month, navigate, toast } = useUi();
  const currency = state.settings.currency;

  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const headKey = (key: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(key); }
  };

  const { groups, totalPlan, totalFact, sourceMonth } = useMemo(() => expensePlanGroups(state, month), [state, month]);
  const incomePlanEff = useMemo(() => effectiveIncomePlan(state, month), [state, month]);
  const expensePlanEff = useMemo(() => effectiveExpensePlan(state, month), [state, month]);
  const scheduled = useMemo(() => scheduledPayments(state, month), [state, month]);

  const incomeFactByCat = useMemo(() => {
    const acc = new Map<string, number>();
    for (const t of txsOfMonth(state, month)) {
      if (t.type === 'income') acc.set(t.categoryId, (acc.get(t.categoryId) ?? 0) + t.amount);
    }
    return acc;
  }, [state, month]);

  const incomeCats = state.categories.filter((c) => c.type === 'income');
  const incomePlanTotal = incomeCats.reduce((s, c) => s + (incomePlanEff.plans[c.id] ?? 0), 0);
  const incomeFactTotal = [...incomeFactByCat.values()].reduce((s, v) => s + v, 0);

  const planBalance = incomePlanTotal - totalPlan;
  const factBalance = incomeFactTotal - totalFact;
  const execRatio = totalPlan > 0 ? totalFact / totalPlan : 0;

  const warnCount = useMemo(
    () => groups.flatMap((g) => g.cats).filter((c) => c.plan > 0 && c.fact / c.plan >= 0.8).length,
    [groups],
  );

  const obligationsTotal = scheduled.reduce((s, p) => s + p.amount, 0);
  const obligationsPaid = scheduled.reduce((s, p) => s + Math.min(p.paidAmount, p.amount), 0);

  const commitExpense = (catId: string, v: number) => {
    const next = { ...expensePlanEff.plans };
    if (v > 0) next[catId] = v;
    else delete next[catId];
    dispatch({ type: 'expensePlan/set', month, plans: next });
  };
  const commitIncome = (catId: string, v: number) => {
    const next = { ...incomePlanEff.plans };
    if (v > 0) next[catId] = v;
    else delete next[catId];
    dispatch({ type: 'incomePlan/set', month, plans: next });
  };

  /** обязательные платежи месяца поднимают план своих категорий до нужной суммы */
  const fillFromObligations = () => {
    const sums: Record<string, number> = {};
    for (const p of scheduled) sums[p.categoryId] = (sums[p.categoryId] ?? 0) + p.amount;
    const next = { ...expensePlanEff.plans };
    let changed = 0;
    for (const [cat, sum] of Object.entries(sums)) {
      const r = Math.round(sum * 100) / 100;
      if ((next[cat] ?? 0) < r) { next[cat] = r; changed++; }
    }
    if (changed === 0) { toast('Обязательные платежи уже учтены в плане'); return; }
    dispatch({ type: 'expensePlan/set', month, plans: next });
    toast(`План дополнен: ${changed} ${pluralRu(changed, 'категория', 'категории', 'категорий')} из обязательных платежей`);
  };

  /** пустые статьи плана заполняются фактом прошлого месяца (округление вверх до сотен) */
  const fillFromPrevFact = () => {
    const prev = addMonths(month, -1);
    const prevExpense = expenseByCategory(state, prev);
    const nextExp = { ...expensePlanEff.plans };
    let changed = 0;
    for (const [cat, fact] of Object.entries(prevExpense)) {
      if (fact > 0 && !(nextExp[cat] > 0)) { nextExp[cat] = Math.ceil(fact / 100) * 100; changed++; }
    }
    const nextInc = { ...incomePlanEff.plans };
    const prevIncome = new Map<string, number>();
    for (const t of state.transactions) {
      if (t.type === 'income' && t.date.slice(0, 7) === prev) {
        prevIncome.set(t.categoryId, (prevIncome.get(t.categoryId) ?? 0) + t.amount);
      }
    }
    for (const [cat, fact] of prevIncome) {
      if (fact > 0 && !(nextInc[cat] > 0)) { nextInc[cat] = Math.ceil(fact / 100) * 100; changed++; }
    }
    if (changed === 0) { toast('Все статьи прошлого месяца уже запланированы'); return; }
    dispatch({ type: 'expensePlan/set', month, plans: nextExp });
    dispatch({ type: 'incomePlan/set', month, plans: nextInc });
    toast('Пустые статьи плана заполнены по прошлому месяцу');
  };

  const diffPill = (plan: number, fact: number, kind: 'expense' | 'income') => {
    if (plan <= 0) {
      return fact > 0 ? <span className="pill n">без плана</span> : null;
    }
    if (kind === 'expense') {
      const ratio = fact / plan;
      if (ratio > 1) return <span className="pill r money">превышен на {fmtMoney(fact - plan, currency)}</span>;
      if (ratio >= 0.8) return <span className="pill y money">осталось {fmtMoney(plan - fact, currency)}</span>;
      return <span className="pill g money">осталось {fmtMoney(plan - fact, currency)}</span>;
    }
    const diff = fact - plan;
    return diff >= 0
      ? <span className="pill g money">{fmtSigned(diff, currency)}</span>
      : <span className="pill y money">{fmtSigned(diff, currency)}</span>;
  };

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">📋 Бюджет и план</h2>
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={fillFromObligations} title="Аренда, зарплаты, кредиты и подписки поднимут план своих категорий">
          ⚡ Из обязательных
        </button>
        <button className="btn btn-ghost" onClick={fillFromPrevFact} title="Пустые статьи заполнятся фактическими суммами прошлого месяца">
          📋 Из прошлого месяца
        </button>
      </div>

      {sourceMonth && sourceMonth !== month && (
        <div className="banner info">
          План унаследован из месяца «{monthTitle(sourceMonth).toLowerCase()}». Изменения сохранятся отдельно для «{monthTitle(month).toLowerCase()}».
        </div>
      )}

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon="💰" label="Плановые доходы" value={fmtMoney(incomePlanTotal, currency)}
          sub={<>получено {fmtMoney(incomeFactTotal, currency)}{incomePlanTotal > 0 && <> · {fmtPct(incomeFactTotal / incomePlanTotal)}</>}</>} />
        <StatCard icon="💸" label="Плановые расходы" value={fmtMoney(totalPlan, currency)}
          sub={<>потрачено {fmtMoney(totalFact, currency)}{totalPlan > 0 && <> · {fmtPct(execRatio)} плана</>}</>} />
        <StatCard icon="💵" label="Плановый остаток" value={fmtSigned(planBalance, currency)}
          valueClass={planBalance >= 0 ? 'pos' : 'neg'}
          sub={<>по факту сейчас {fmtSigned(factBalance, currency)}</>} />
      </div>

      {totalPlan > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15 }}>Общий бюджет — {monthTitle(month).toLowerCase()}</h3>
            <span className={'pill ' + (execRatio > 1 ? 'r' : execRatio >= 0.8 ? 'y' : 'n')}>{fmtPct(execRatio)} израсходовано</span>
            {warnCount > 0 && (
              <span className="pill y">⚠️ {warnCount} {pluralRu(warnCount, 'статья', 'статьи', 'статей')} на пределе</span>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <Meter ratio={execRatio} tone={expenseTone(execRatio)} />
          </div>
          <div className="budget-nums">
            <div>Бюджет (сумма плана)<b className="money">{fmtMoney(totalPlan, currency)}</b></div>
            <div>Потрачено<b className="money">{fmtMoney(totalFact, currency)}</b></div>
            <div>Осталось<b className={'money ' + (totalPlan - totalFact >= 0 ? 'pos' : 'neg')}>{fmtSigned(totalPlan - totalFact, currency)}</b></div>
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>Общий бюджет считается автоматически — это сумма всех статей росписи ниже.</p>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 15 }}>Обязательные платежи в плане</h3>
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('calendar')}>Календарь →</button>
        </div>
        {scheduled.length === 0 ? (
          <p className="muted small" style={{ marginTop: 6 }}>
            Регулярных платежей, зарплат и кредитов пока нет — добавьте их, и они будут попадать в план кнопкой «Из обязательных».
          </p>
        ) : (
          <>
            <div style={{ marginTop: 10 }}>
              <Meter ratio={obligationsTotal > 0 ? obligationsPaid / obligationsTotal : 0} tone="good" />
            </div>
            <div className="budget-nums">
              <div>Всего обязательных<b className="money">{fmtMoney(obligationsTotal, currency)}</b></div>
              <div>Оплачено<b className="money pos">{fmtMoney(obligationsPaid, currency)}</b></div>
              <div>Осталось оплатить<b className={'money ' + (obligationsTotal - obligationsPaid > 0 ? 'warn-text' : 'pos')}>{fmtMoney(Math.max(obligationsTotal - obligationsPaid, 0), currency)}</b></div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 2 }}>Роспись плана</h3>
        <p className="muted small" style={{ marginBottom: 8 }}>
          Раскройте направление и введите плановые суммы — факт, остатки и предупреждения посчитаются сами.
          Жёлтая подсветка — израсходовано 80% статьи, красная — статья превышена.
        </p>

        {/* Доходы */}
        <div className="plan-group">
          <div className="plan-group-head" role="button" tabIndex={0} onClick={() => toggle('income')} onKeyDown={headKey('income')} aria-expanded={open.has('income')}>
            <span className="chev">{open.has('income') ? '▾' : '▸'}</span>
            <span className="limit-name">💰 <span>Доходы</span></span>
            <span className="spacer" />
            <span className="money muted small">план <b style={{ color: 'var(--ink)' }}>{fmtMoney(incomePlanTotal, currency)}</b> · факт {fmtMoney(incomeFactTotal, currency)}</span>
            {diffPill(incomePlanTotal, incomeFactTotal, 'income')}
          </div>
          {open.has('income') && (
            <div className="plan-cats">
              {incomeCats.map((c) => {
                const plan = incomePlanEff.plans[c.id] ?? 0;
                const fact = incomeFactByCat.get(c.id) ?? 0;
                return (
                  <div key={c.id} className="plan-cat-row">
                    <span className="limit-name">{c.icon} <span>{c.name}</span></span>
                    <PlanInput value={plan} onCommit={(v) => commitIncome(c.id, v)} />
                    <span className="muted small money plan-fact">факт {fmtMoney(fact, currency)}</span>
                    {diffPill(plan, fact, 'income')}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Расходы по направлениям */}
        {groups.map((g) => {
          const gRatio = g.plan > 0 ? g.fact / g.plan : 0;
          return (
            <div key={g.group} className="plan-group">
              <div className="plan-group-head" role="button" tabIndex={0} onClick={() => toggle(g.group)} onKeyDown={headKey(g.group)} aria-expanded={open.has(g.group)}>
                <span className="chev">{open.has(g.group) ? '▾' : '▸'}</span>
                <span className="limit-name">{groupIcon(g.group)} <span>{groupName(g.group)}</span></span>
                <span className="spacer" />
                <span className="money muted small">
                  план <b style={{ color: g.plan > 0 ? 'var(--ink)' : undefined }}>{fmtMoney(g.plan, currency)}</b> · факт {fmtMoney(g.fact, currency)}
                </span>
                {diffPill(g.plan, g.fact, 'expense')}
                {g.plan > 0 && (
                  <span className="g-meter"><Meter ratio={gRatio} tone={expenseTone(gRatio)} /></span>
                )}
              </div>
              {open.has(g.group) && (
                <div className="plan-cats">
                  {g.cats.map(({ category, plan, fact }) => (
                    <div key={category.id} className="plan-cat-row">
                      <span className="limit-name">{category.icon} <span>{category.name}</span></span>
                      <PlanInput value={plan} onCommit={(v) => commitExpense(category.id, v)} />
                      <span className="muted small money plan-fact">факт {fmtMoney(fact, currency)}</span>
                      {diffPill(plan, fact, 'expense')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="table-foot money" style={{ borderTop: '1px solid var(--line)', marginTop: 8 }}>
          <span>ИТОГО план: доходы <b className="pos">{fmtMoney(incomePlanTotal, currency)}</b></span>
          <span>расходы <b className="neg">{fmtMoney(totalPlan, currency)}</b></span>
          <span>остаток <b className={planBalance >= 0 ? 'pos' : 'neg'}>{fmtSigned(planBalance, currency)}</b></span>
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          План действует и на следующие месяцы, пока вы его не измените. Ноль в поле убирает статью из плана.
        </p>
      </div>
    </>
  );
}
