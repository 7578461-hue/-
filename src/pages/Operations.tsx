import { useMemo, useState } from 'react';
import { GROUPS } from '../data/catalog';
import { addMonths, fmtMoney, monthTitle } from '../lib/format';
import { useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { TxTable } from '../components/TxTable';
import { pluralRu } from '../lib/format';
import type { GroupKey } from '../types';

type Period = 'month' | 'prev' | 'last3' | 'year' | 'all';

export function Operations() {
  const state = useAppState();
  const { month, openQuickAdd } = useUi();
  const currency = state.settings.currency;

  const [period, setPeriod] = useState<Period>('month');
  const [catFilter, setCatFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [mandFilter, setMandFilter] = useState('all');
  const [search, setSearch] = useState('');

  const txs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inPeriod = (date: string) => {
      const m = date.slice(0, 7);
      switch (period) {
        case 'month': return m === month;
        case 'prev': return m === addMonths(month, -1);
        case 'last3': return m === month || m === addMonths(month, -1) || m === addMonths(month, -2);
        case 'year': return date.slice(0, 4) === month.slice(0, 4);
        case 'all': return true;
      }
    };
    return state.transactions
      .filter((t) => {
        if (!inPeriod(t.date)) return false;
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (memberFilter !== 'all' && (t.memberId ?? '') !== memberFilter) return false;
        if (methodFilter !== 'all' && t.method !== methodFilter) return false;
        if (mandFilter === 'mand' && !(t.mandatory && t.type === 'expense')) return false;
        if (mandFilter === 'opt' && (t.mandatory || t.type === 'income')) return false;
        if (catFilter.startsWith('cat:') && t.categoryId !== catFilter.slice(4)) return false;
        if (catFilter.startsWith('grp:')) {
          const cat = state.categories.find((c) => c.id === t.categoryId);
          if ((cat?.group ?? 'other') !== catFilter.slice(4)) return false;
        }
        if (q && !(t.description + ' ' + (t.comment ?? '')).toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [state, month, period, catFilter, memberFilter, typeFilter, methodFilter, mandFilter, search]);

  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const groupsWithCats = GROUPS.map((g) => ({
    group: g,
    cats: state.categories.filter((c) => c.group === g.key && (g.key === 'income' ? c.type === 'income' : c.type === 'expense')),
  })).filter((x) => x.cats.length > 0);

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">Операции</h2>
        <span className="spacer" />
        <button className="btn btn-good" onClick={() => openQuickAdd({ type: 'income' })}>＋ Доход</button>
        <button className="btn btn-accent" onClick={() => openQuickAdd({ type: 'expense' })}>＋ Расход</button>
      </div>

      <div className="filters">
        <select className="select" value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Период">
          <option value="month">{monthTitle(month)}</option>
          <option value="prev">Прошлый месяц</option>
          <option value="last3">Последние 3 месяца</option>
          <option value="year">Весь {month.slice(0, 4)} год</option>
          <option value="all">Всё время</option>
        </select>
        <select className="select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Категория">
          <option value="all">Все категории</option>
          {groupsWithCats.map(({ group, cats }) => (
            <optgroup key={group.key} label={`${group.icon} ${group.name}`}>
              {group.key !== 'income' && <option value={'grp:' + group.key}>Всё направление «{group.name}»</option>}
              {cats.map((c) => <option key={c.id} value={'cat:' + c.id}>{c.icon} {c.name}</option>)}
            </optgroup>
          ))}
        </select>
        <select className="select" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} aria-label="Член семьи">
          <option value="all">Вся семья</option>
          {state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          <option value="">Без указания</option>
        </select>
        <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Тип">
          <option value="all">Доходы и расходы</option>
          <option value="income">Только доходы</option>
          <option value="expense">Только расходы</option>
        </select>
        <select className="select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} aria-label="Способ оплаты">
          <option value="all">Любой способ</option>
          <option value="card">Карта</option>
          <option value="cash">Наличные</option>
          <option value="transfer">Перевод</option>
          <option value="other">Другое</option>
        </select>
        <select className="select" value={mandFilter} onChange={(e) => setMandFilter(e.target.value)} aria-label="Обязательность">
          <option value="all">Обязательные и нет</option>
          <option value="mand">Только обязательные</option>
          <option value="opt">Только необязательные</option>
        </select>
        <div className="search-box">
          <input className="input" placeholder="Поиск по описанию…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <TxTable txs={txs} emptyText="Ничего не найдено. Попробуйте изменить фильтры." />
        {txs.length > 0 && (
          <div className="table-foot money">
            <span>{txs.length} {pluralRu(txs.length, 'операция', 'операции', 'операций')}</span>
            <span>Доходы: <b className="pos">+{fmtMoney(income, currency)}</b></span>
            <span>Расходы: <b className="neg">−{fmtMoney(expense, currency)}</b></span>
            <span>Итог: <b className={income - expense >= 0 ? 'pos' : 'neg'}>{income - expense >= 0 ? '+' : '−'}{fmtMoney(Math.abs(income - expense), currency)}</b></span>
          </div>
        )}
      </div>
    </>
  );
}
