import { useMemo } from 'react';
import type { GroupKey } from '../types';
import { addMonths, fmtMoney, fmtPct, fmtSigned, monthTitle } from '../lib/format';
import {
  expenseByCategory, expenseByGroup, expenseByMember, groupIcon, groupName,
  mandatorySplit, staffMonth, totals,
} from '../state/selectors';
import { useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { Empty, Meter, StatCard } from '../components/ui';

export function Reports() {
  const state = useAppState();
  const { month } = useUi();
  const currency = state.settings.currency;
  const prev = addMonths(month, -1);

  const cur = useMemo(() => totals(state, month), [state, month]);
  const prv = useMemo(() => totals(state, prev), [state, prev]);
  const byGroup = useMemo(() => expenseByGroup(state, month), [state, month]);
  const byGroupPrev = useMemo(() => expenseByGroup(state, prev), [state, prev]);
  const byMember = useMemo(() => expenseByMember(state, month), [state, month]);
  const byCat = useMemo(() => expenseByCategory(state, month), [state, month]);
  const split = useMemo(() => mandatorySplit(state, month), [state, month]);
  const staff = useMemo(() => staffMonth(state, month), [state, month]);

  const groupRows = useMemo(() => {
    const keys = new Set<GroupKey>();
    for (const [g, v] of Object.entries(byGroup) as [GroupKey, number][]) if (v > 0) keys.add(g);
    for (const [g, v] of Object.entries(byGroupPrev) as [GroupKey, number][]) if (v > 0) keys.add(g);
    return [...keys]
      .map((g) => ({ g, cur: byGroup[g] ?? 0, prev: byGroupPrev[g] ?? 0 }))
      .sort((a, b) => b.cur - a.cur);
  }, [byGroup, byGroupPrev]);

  const catRows = useMemo(
    () => Object.entries(byCat)
      .map(([id, sum]) => ({ cat: state.categories.find((c) => c.id === id), sum }))
      .filter((x) => x.cat)
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 12),
    [byCat, state.categories],
  );
  const maxCatSum = catRows[0]?.sum ?? 1;

  const hasAny = cur.income > 0 || cur.expense > 0;

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">📈 Отчёты — {monthTitle(month).toLowerCase()}</h2>
      </div>

      {!hasAny ? (
        <div className="card"><Empty icon="📈" text="За этот месяц пока нет данных для отчёта." /></div>
      ) : (
        <>
          <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <StatCard icon="💰" label="Всего доходов" value={fmtMoney(cur.income, currency)} valueClass="pos" />
            <StatCard icon="💸" label="Всего расходов" value={fmtMoney(cur.expense, currency)} valueClass="neg" />
            <StatCard icon="💵" label="Остаток" value={fmtSigned(cur.balance, currency)}
              valueClass={cur.balance >= 0 ? 'pos' : 'neg'} />
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Итог месяца и сравнение</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Статья</th>
                    <th className="r">{monthTitle(month).split(' ')[0]}</th>
                    <th className="r">{monthTitle(prev).split(' ')[0]}</th>
                    <th className="r">Изменение</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>💰 Доходы</td>
                    <td className="r money pos">{fmtMoney(cur.income, currency)}</td>
                    <td className="r money muted">{fmtMoney(prv.income, currency)}</td>
                    <td className={'r money ' + (cur.income - prv.income >= 0 ? 'pos' : 'neg')}>{fmtSigned(cur.income - prv.income, currency)}</td>
                  </tr>
                  {groupRows.map(({ g, cur: c, prev: p }) => (
                    <tr key={g}>
                      <td>{groupIcon(g)} {groupName(g)}</td>
                      <td className="r money">{fmtMoney(c, currency)}</td>
                      <td className="r money muted">{fmtMoney(p, currency)}</td>
                      {/* для расходов рост — плохо: раскрашиваем наоборот */}
                      <td className={'r money ' + (c - p <= 0 ? 'pos' : 'neg')}>{fmtSigned(c - p, currency)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td>ВСЕГО РАСХОДОВ</td>
                    <td className="r money neg">{fmtMoney(cur.expense, currency)}</td>
                    <td className="r money muted">{fmtMoney(prv.expense, currency)}</td>
                    <td className={'r money ' + (cur.expense - prv.expense <= 0 ? 'pos' : 'neg')}>{fmtSigned(cur.expense - prv.expense, currency)}</td>
                  </tr>
                  <tr className="muted">
                    <td style={{ paddingLeft: 24 }}>в т.ч. обязательные</td>
                    <td className="r money">{fmtMoney(split.mandatory, currency)}</td>
                    <td colSpan={2} className="r money">{cur.expense > 0 ? fmtPct(split.mandatory / cur.expense) : '—'} расходов</td>
                  </tr>
                  <tr className="muted">
                    <td style={{ paddingLeft: 24 }}>в т.ч. необязательные</td>
                    <td className="r money">{fmtMoney(split.optional, currency)}</td>
                    <td colSpan={2} className="r money">{cur.expense > 0 ? fmtPct(split.optional / cur.expense) : '—'} расходов</td>
                  </tr>
                  <tr style={{ fontWeight: 700, fontSize: 15 }}>
                    <td>ОСТАТОК</td>
                    <td className={'r money ' + (cur.balance >= 0 ? 'pos' : 'neg')}>{fmtSigned(cur.balance, currency)}</td>
                    <td className="r money muted">{fmtSigned(prv.balance, currency)}</td>
                    <td className={'r money ' + (cur.balance - prv.balance >= 0 ? 'pos' : 'neg')}>{fmtSigned(cur.balance - prv.balance, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Расходы по членам семьи</h3>
              {byMember.length === 0 ? <Empty text="Нет данных" /> : byMember.map((m) => (
                <div key={m.memberId || 'none'} className="limit-row">
                  <span className="limit-name"><span>{m.name}</span></span>
                  <Meter ratio={cur.expense > 0 ? m.sum / cur.expense : 0} tone="accent" />
                  <span className="limit-val money"><b>{fmtMoney(m.sum, currency)}</b>
                    <span className="muted small"> · {cur.expense > 0 ? fmtPct(m.sum / cur.expense) : '0%'}</span></span>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Выплаты персоналу</h3>
              {staff.rows.length === 0 && staff.groupSpent === 0 ? <Empty text="Выплат персоналу не было" /> : (
                <>
                  {staff.rows.map((r) => (
                    <div key={r.employee.id} className="pay-row">
                      <div className="grow">
                        <b>{r.employee.name}</b>
                        <div className="muted small">{r.employee.position}</div>
                      </div>
                      <span className="money" style={{ fontWeight: 600 }}>{fmtMoney(r.paid, currency)}</span>
                      {r.status === 'paid' && <span className="pill g">оплачено</span>}
                      {r.status === 'partial' && <span className="pill y">частично</span>}
                      {r.status === 'unpaid' && <span className="pill n">не оплачено</span>}
                    </div>
                  ))}
                  <div className="table-foot money">
                    <span>Всего по разделу: <b>{fmtMoney(staff.groupSpent, currency)}</b></span>
                    {staff.remaining > 0 && <span className="warn-text">осталось {fmtMoney(staff.remaining, currency)}</span>}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Крупнейшие категории расходов</h3>
            {catRows.map(({ cat, sum }) => (
              <div key={cat!.id} className="limit-row">
                <span className="limit-name">{cat!.icon} <span>{cat!.name}</span></span>
                <Meter ratio={sum / maxCatSum} tone="accent" />
                <span className="limit-val money"><b>{fmtMoney(sum, currency)}</b>
                  <span className="muted small"> · {cur.expense > 0 ? fmtPct(sum / cur.expense) : '0%'}</span></span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
