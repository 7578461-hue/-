import { useMemo } from 'react';
import { useAppState } from '../state/store';
import { useUi } from '../state/ui';
import {
  balanceSeries, dailyExpenses, expenseByGroup, expensePlanGroups,
  groupName, monthHasData, catById, topExpenses, totals, upcomingPayments, staffMonth, incomePlanRows,
} from '../state/selectors';
import { addMonths, fmtDayLong, fmtMoney, fmtPct, fmtSigned, monthName, MONTHS_RU_GEN, monthTitle, pluralRu } from '../lib/format';
import { useChartTheme } from '../lib/chartTheme';
import { BalanceAreaChart, CategoryDonut, CompareGroupsChart, DailyBarsChart, IncomeExpenseChart } from '../components/charts';
import { PayList } from '../components/PayList';
import { Delta, Empty, Meter, StatCard } from '../components/ui';
import type { GroupKey } from '../types';

export function Dashboard() {
  const state = useAppState();
  const { month, navigate, openQuickAdd } = useUi();
  const theme = useChartTheme();
  const currency = state.settings.currency;
  const prev = addMonths(month, -1);

  const cur = useMemo(() => totals(state, month), [state, month]);
  const prv = useMemo(() => totals(state, prev), [state, prev]);
  const byGroup = useMemo(() => expenseByGroup(state, month), [state, month]);
  const byGroupPrev = useMemo(() => expenseByGroup(state, prev), [state, prev]);
  const staff = useMemo(() => staffMonth(state, month), [state, month]);
  const upcoming = useMemo(() => upcomingPayments(state, month), [state, month]);
  const expensePlan = useMemo(() => expensePlanGroups(state, month), [state, month]);
  const daily = useMemo(() => dailyExpenses(state, month), [state, month]);
  const balance = useMemo(() => balanceSeries(state, month), [state, month]);
  const top5 = useMemo(() => topExpenses(state, month, 5), [state, month]);
  const plan = useMemo(() => incomePlanRows(state, month), [state, month]);

  const hasData = monthHasData(state, month);
  const planTotal = plan.rows.reduce((s, r) => s + r.plan, 0);
  const upcomingRemaining = upcoming.reduce((s, p) => s + Math.max(p.amount - p.paidAmount, 0), 0);

  // бюджет месяца = сумма плановых статей расходов
  const planTotalExpense = expensePlan.totalPlan;
  // сколько по плану ещё предстоит потратить в незакрытых статьях
  const planLeftToPay = expensePlan.groups
    .flatMap((g) => g.cats)
    .reduce((s, c) => s + Math.max(c.plan - c.fact, 0), 0);
  const warnOverPlan = expensePlan.groups
    .flatMap((g) => g.cats)
    .filter((c) => c.plan > 0 && c.fact / c.plan >= 0.8);

  const monthGen = MONTHS_RU_GEN[Number(month.slice(5, 7)) - 1];

  const pctOfExpense = (v: number) => (cur.expense > 0 ? `${fmtPct(v / cur.expense)} расходов` : null);

  const donutSlices = useMemo(() => {
    const entries = (Object.entries(byGroup) as [GroupKey, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, 5);
    const rest = entries.slice(5).reduce((s, [, v]) => s + v, 0);
    const slices = top.map(([g, v]) => ({ name: groupName(g), value: v, color: theme.groups[g] }));
    if (rest > 0) slices.push({ name: 'Остальное', value: rest, color: theme.groups.other });
    return slices;
  }, [byGroup, theme]);

  const compareData = useMemo(() => {
    const keys = new Set<GroupKey>();
    for (const [g, v] of Object.entries(byGroup) as [GroupKey, number][]) if (v > 0) keys.add(g);
    for (const [g, v] of Object.entries(byGroupPrev) as [GroupKey, number][]) if (v > 0) keys.add(g);
    const rows = [...keys]
      .map((g) => ({ name: groupName(g), current: byGroup[g] ?? 0, prev: byGroupPrev[g] ?? 0 }))
      .sort((a, b) => Math.max(b.current, b.prev) - Math.max(a.current, a.prev));
    const top = rows.slice(0, 6);
    const rest = rows.slice(6);
    if (rest.length > 0) {
      top.push({
        name: 'Остальное',
        current: rest.reduce((s, r) => s + r.current, 0),
        prev: rest.reduce((s, r) => s + r.prev, 0),
      });
    }
    return top;
  }, [byGroup, byGroupPrev]);

  const budgetRatio = planTotalExpense > 0 ? cur.expense / planTotalExpense : 0;

  if (!hasData) {
    return (
      <>
        <div className="page-head"><h2 className="page-title">{monthTitle(month)}</h2></div>
        <div className="card">
          <Empty icon="🌱" text={`В ${monthName(month)} пока нет ни одной операции.`}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-accent" onClick={() => openQuickAdd()}>＋ Добавить операцию</button>
              <button className="btn btn-ghost" onClick={() => navigate('settings')}>Настройки и демо-данные</button>
            </div>
          </Empty>
        </div>
      </>
    );
  }

  return (
    <>
      {state.settings.hasDemo && (
        <div className="banner warn">
          ⚠️ Показаны тестовые демо-данные. Это условные суммы для знакомства с приложением.
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('settings')}>Убрать в настройках</button>
        </div>
      )}

      <div className="cards">
        <StatCard
          icon="💰" label="Доходы" value={fmtMoney(cur.income, currency)}
          sub={<><Delta current={cur.income} prev={prv.income} /> к прошлому месяцу{planTotal > 0 && <> · план {fmtMoney(planTotal, currency)}</>}</>}
          onClick={() => navigate('income')}
        />
        <StatCard
          icon="💸" label="Расходы" value={fmtMoney(cur.expense, currency)}
          sub={<><Delta current={cur.expense} prev={prv.expense} invert /> к прошлому месяцу{planTotalExpense > 0 ? <> · {fmtPct(budgetRatio)} плана</> : null}</>}
          onClick={() => navigate('operations')}
        />
        <StatCard
          icon="💵" label="Остаток" value={fmtSigned(cur.balance, currency)}
          valueClass={cur.balance >= 0 ? 'pos' : 'neg'}
          sub={<>доходы − расходы · в прошлом {fmtSigned(prv.balance, currency)}</>}
          onClick={() => navigate('reports')}
        />
        <StatCard
          icon="📅" label="Предстоящие платежи" value={fmtMoney(upcomingRemaining, currency)}
          sub={upcoming.length > 0
            ? `${upcoming.length} ${pluralRu(upcoming.length, 'платёж', 'платежа', 'платежей')} впереди`
            : 'всё оплачено'}
          onClick={() => navigate('calendar')}
        />
        <StatCard
          icon="👨‍👩‍👧" label="Семья" value={fmtMoney(byGroup.family ?? 0, currency)}
          sub={<>{pctOfExpense(byGroup.family ?? 0)} · <Delta current={byGroup.family ?? 0} prev={byGroupPrev.family ?? 0} invert /></>}
          onClick={() => navigate('family')}
        />
        <StatCard
          icon="🏠" label="Жильё" value={fmtMoney(byGroup.housing ?? 0, currency)}
          sub={<>{pctOfExpense(byGroup.housing ?? 0)} · <Delta current={byGroup.housing ?? 0} prev={byGroupPrev.housing ?? 0} invert /></>}
          onClick={() => navigate('housing')}
        />
        <StatCard
          icon="👥" label="Персонал" value={fmtMoney(staff.groupSpent, currency)}
          sub={staff.remaining > 0
            ? <span className="warn-text">осталось выплатить {fmtMoney(staff.remaining, currency)}</span>
            : staff.rows.length > 0 ? 'зарплаты выплачены' : pctOfExpense(byGroup.staff ?? 0)}
          onClick={() => navigate('staff')}
        />
        <StatCard
          icon="🏦" label="Накопления" value={fmtSigned(byGroup.savings ?? 0, currency)}
          valueClass="pos"
          sub="взносы в цели за месяц"
          onClick={() => navigate('savings')}
        />
      </div>

      {planTotalExpense > 0 ? (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15 }}>Бюджет — {monthTitle(month).toLowerCase()}</h3>
            <span className={'pill ' + (budgetRatio > 1 ? 'r' : budgetRatio >= 0.8 ? 'y' : 'n')}>
              {fmtPct(budgetRatio)} израсходовано
            </span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('plan')}>
              {warnOverPlan.length > 0
                ? `⚠️ ${warnOverPlan.length} ${pluralRu(warnOverPlan.length, 'статья требует', 'статьи требуют', 'статей требуют')} внимания`
                : 'План месяца →'}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <Meter ratio={budgetRatio} />
          </div>
          <div className="budget-nums">
            <div>Потрачено<b className="money">{fmtMoney(cur.expense, currency)}</b></div>
            <div>План на месяц<b className="money">{fmtMoney(planTotalExpense, currency)}</b></div>
            <div>Осталось<b className={'money ' + (planTotalExpense - cur.expense >= 0 ? 'pos' : 'neg')}>
              {fmtSigned(planTotalExpense - cur.expense, currency)}
            </b></div>
            {planLeftToPay > 0 && (
              <div>Ещё предстоит по плану<b className="money warn-text">{fmtMoney(planLeftToPay, currency)}</b></div>
            )}
          </div>
        </div>
      ) : (
        <div className="banner info">
          Составьте план месяца — куда и сколько планируете заплатить. Он же станет вашим бюджетом: приложение покажет, укладываетесь ли вы.
          <button className="btn btn-accent btn-sm" onClick={() => navigate('plan')}>Составить план</button>
        </div>
      )}

      <div className="grid-2">
        <div className="card chart-card">
          <h3>Доходы и расходы</h3>
          <div className="sub">{monthTitle(month).toLowerCase()} и прошлый месяц</div>
          <IncomeExpenseChart
            currency={currency}
            data={[
              { name: monthTitle(prev).split(' ')[0], income: prv.income, expense: prv.expense },
              { name: monthTitle(month).split(' ')[0], income: cur.income, expense: cur.expense },
            ]}
          />
        </div>
        <div className="card chart-card">
          <h3>Расходы по категориям</h3>
          <div className="sub">доля каждого направления</div>
          {donutSlices.length > 0
            ? <CategoryDonut slices={donutSlices} total={cur.expense} centerLabel="расходы" currency={currency} />
            : <Empty icon="🥧" text="Расходов пока нет" />}
        </div>
      </div>

      <div className="card chart-card">
        <h3>Расходы по дням</h3>
        <div className="sub">на какие дни пришлись траты</div>
        <DailyBarsChart data={daily} currency={currency} monthGenitive={monthGen} />
      </div>

      <div className="grid-2">
        <div className="card chart-card">
          <h3>Динамика остатка</h3>
          <div className="sub">накопленный итог с начала месяца</div>
          <BalanceAreaChart data={balance} currency={currency} monthGenitive={monthGen} />
        </div>
        <div className="card chart-card">
          <h3>Сравнение с прошлым месяцем</h3>
          <div className="sub">расходы по направлениям</div>
          <CompareGroupsChart
            data={compareData}
            currency={currency}
            currentLabel={monthTitle(month).split(' ')[0]}
            prevLabel={monthTitle(prev).split(' ')[0]}
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="card chart-card">
          <h3>Топ-5 крупных расходов</h3>
          <div className="sub">самые заметные операции месяца</div>
          {top5.length === 0 ? <Empty text="Расходов пока нет" /> : (
            <div className="top5">
              {top5.map((t) => {
                const cat = catById(state, t.categoryId);
                const max = top5[0].amount;
                return (
                  <div key={t.id} className="row">
                    <div>
                      <b>{t.description}</b>
                      <div className="muted small">{fmtDayLong(t.date)} · {cat?.name}</div>
                    </div>
                    <span className="money" style={{ fontWeight: 600 }}>{fmtMoney(t.amount, currency)}</span>
                    <div className="bar"><i style={{ width: (t.amount / max) * 100 + '%', background: `var(--c-${cat?.group ?? 'other'})` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card chart-card">
          <h3>Предстоящие платежи</h3>
          <div className="sub">неоплаченные обязательства месяца</div>
          <PayList items={upcoming.slice(0, 6)} currency={currency} emptyText="Все обязательные платежи закрыты 🎉" />
          {upcoming.length > 6 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('calendar')}>
              Все платежи месяца →
            </button>
          )}
        </div>
      </div>
    </>
  );
}
