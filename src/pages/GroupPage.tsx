// Общая страница направления расходов: Семья, Жильё, Транспорт.
// Разбивка по категориям, свои дополнительные блоки у каждого раздела.

import { useMemo } from 'react';
import type { GroupKey } from '../types';
import { addMonths, fmtMoney, fmtPct } from '../lib/format';
import { expenseByGroup, groupIcon, groupName, totals, txsOfMonth } from '../state/selectors';
import { useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { RecurringManager } from '../components/RecurringManager';
import { TxTable } from '../components/TxTable';
import { Delta, Empty, Meter, StatCard } from '../components/ui';

const DEFAULT_CAT: Partial<Record<GroupKey, string>> = {
  family: 'fam-groceries',
  housing: 'hou-utilities',
  transport: 'trn-fuel',
};

export function GroupPage({ group }: { group: GroupKey }) {
  const state = useAppState();
  const { month, openQuickAdd } = useUi();
  const currency = state.settings.currency;
  const prev = addMonths(month, -1);

  const txs = useMemo(
    () =>
      txsOfMonth(state, month)
        .filter((t) => t.type === 'expense' && (state.categories.find((c) => c.id === t.categoryId)?.group ?? 'other') === group)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state, month, group],
  );
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const prevTotal = (expenseByGroup(state, prev)[group] ?? 0);
  const monthTotals = useMemo(() => totals(state, month), [state, month]);

  const byCat = useMemo(() => {
    const acc = new Map<string, { sum: number; count: number }>();
    for (const t of txs) {
      const cur = acc.get(t.categoryId) ?? { sum: 0, count: 0 };
      cur.sum += t.amount;
      cur.count += 1;
      acc.set(t.categoryId, cur);
    }
    return [...acc.entries()]
      .map(([id, v]) => ({ cat: state.categories.find((c) => c.id === id), ...v }))
      .filter((x) => x.cat)
      .sort((a, b) => b.sum - a.sum);
  }, [txs, state.categories]);

  const byMember = useMemo(() => {
    if (group !== 'family') return [];
    const acc = new Map<string, number>();
    for (const t of txs) acc.set(t.memberId ?? '', (acc.get(t.memberId ?? '') ?? 0) + t.amount);
    return [...acc.entries()]
      .map(([id, sum]) => ({
        name: id ? state.members.find((m) => m.id === id)?.name ?? 'Не указан' : 'Не указан',
        sum,
      }))
      .sort((a, b) => b.sum - a.sum);
  }, [txs, state.members, group]);

  const maxCat = byCat[0]?.sum ?? 1;

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">{groupIcon(group)} {groupName(group)}</h2>
        <span className="spacer" />
        <button
          className="btn btn-accent"
          onClick={() => openQuickAdd({ type: 'expense', categoryId: DEFAULT_CAT[group] })}
        >
          ＋ Расход
        </button>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon={groupIcon(group)} label="Всего за месяц" value={fmtMoney(total, currency)}
          sub={<><Delta current={total} prev={prevTotal} invert /> к прошлому месяцу</>} />
        <StatCard icon="🧮" label="Доля всех расходов"
          value={monthTotals.expense > 0 ? fmtPct(total / monthTotals.expense) : '0%'}
          sub={`из ${fmtMoney(monthTotals.expense, currency)}`} />
        <StatCard icon="🧾" label="Операций" value={String(txs.length)}
          sub={byCat[0]?.cat ? `больше всего: ${byCat[0].cat.name.toLowerCase()}` : undefined} />
      </div>

      {group === 'housing' && (
        <div className="card">
          <RecurringManager groupFilter="housing" />
        </div>
      )}

      <div className={group === 'family' ? 'grid-2' : undefined}>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>По категориям</h3>
          {byCat.length === 0 ? (
            <Empty text="В этом месяце расходов не было" />
          ) : (
            <div>
              {byCat.map(({ cat, sum, count }) => (
                <div key={cat!.id} className="limit-row">
                  <span className="limit-name">{cat!.icon} <span>{cat!.name}</span></span>
                  <Meter ratio={sum / maxCat} tone="accent" />
                  <span className="limit-val money">
                    <b>{fmtMoney(sum, currency)}</b>
                    <span className="muted small"> · {count} оп.</span>
                    <button className="row-menu" title="Добавить в эту категорию"
                      onClick={() => openQuickAdd({ type: 'expense', categoryId: cat!.id })}>＋</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {group === 'family' && (
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>Кто тратил</h3>
            {byMember.length === 0 ? (
              <Empty text="Пока нечего показать" />
            ) : (
              <div>
                {byMember.map((m) => (
                  <div key={m.name} className="limit-row">
                    <span className="limit-name"><span>{m.name}</span></span>
                    <Meter ratio={total > 0 ? m.sum / total : 0} tone="accent" />
                    <span className="limit-val money"><b>{fmtMoney(m.sum, currency)}</b>
                      <span className="muted small"> · {total > 0 ? fmtPct(m.sum / total) : '0%'}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Операции раздела</h3>
        <TxTable txs={txs} compact emptyText="Операций в этом месяце нет" />
      </div>
    </>
  );
}
