import { useMemo, useState } from 'react';
import type { BudgetLimit, MonthBudget } from '../types';
import { GROUPS } from '../data/catalog';
import { fmtMoney, fmtPct, fmtSigned, monthTitle } from '../lib/format';
import { uid } from '../lib/id';
import { budgetUsage, effectiveBudget, totals } from '../state/selectors';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { ConfirmDelete, Empty, Field, Meter, Modal } from '../components/ui';

export function Budgets() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { month, toast } = useUi();
  const currency = state.settings.currency;
  const [totalModal, setTotalModal] = useState(false);
  const [limitModal, setLimitModal] = useState<BudgetLimit | 'new' | null>(null);

  const eff = useMemo(() => effectiveBudget(state, month), [state, month]);
  const usage = useMemo(() => budgetUsage(state, month), [state, month]);
  const cur = useMemo(() => totals(state, month), [state, month]);

  const inherited = eff && eff.sourceMonth !== month;

  /** копия действующего бюджета — правки всегда сохраняются в выбранный месяц */
  const cloneBudget = (): MonthBudget => ({
    total: eff?.budget.total,
    limits: eff ? eff.budget.limits.map((l) => ({ ...l })) : [],
  });

  const saveTotal = (value: number | undefined) => {
    const b = cloneBudget();
    b.total = value;
    dispatch({ type: 'budget/set', month, budget: b });
    toast('Бюджет месяца сохранён');
    setTotalModal(false);
  };

  const saveLimit = (limit: BudgetLimit) => {
    const b = cloneBudget();
    const i = b.limits.findIndex((l) => l.id === limit.id);
    if (i >= 0) b.limits[i] = limit;
    else b.limits.push(limit);
    dispatch({ type: 'budget/set', month, budget: b });
    toast('Лимит сохранён');
    setLimitModal(null);
  };

  const deleteLimit = (id: string) => {
    const b = cloneBudget();
    b.limits = b.limits.filter((l) => l.id !== id);
    dispatch({ type: 'budget/set', month, budget: b });
    toast('Лимит удалён');
    setLimitModal(null);
  };

  const budgetTotal = eff?.budget.total;
  const ratio = budgetTotal ? cur.expense / budgetTotal : 0;

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">📋 Бюджеты и лимиты</h2>
        <span className="spacer" />
        <button className="btn btn-accent" onClick={() => setLimitModal('new')}>＋ Лимит</button>
      </div>

      {inherited && (
        <div className="banner info">
          Бюджет унаследован из месяца «{monthTitle(eff!.sourceMonth).toLowerCase()}». Любое изменение сохранится отдельно для «{monthTitle(month).toLowerCase()}».
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 15 }}>Общий бюджет — {monthTitle(month).toLowerCase()}</h3>
          {budgetTotal ? <span className={'pill ' + (ratio > 1 ? 'r' : ratio >= 0.8 ? 'y' : 'n')}>{fmtPct(ratio)}</span> : null}
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => setTotalModal(true)}>
            {budgetTotal ? 'Изменить' : 'Задать лимит'}
          </button>
        </div>
        {budgetTotal ? (
          <>
            <div style={{ marginTop: 12 }}><Meter ratio={ratio} /></div>
            <div className="budget-nums">
              <div>Лимит<b className="money">{fmtMoney(budgetTotal, currency)}</b></div>
              <div>Потрачено<b className="money">{fmtMoney(cur.expense, currency)}</b></div>
              <div>Осталось<b className={'money ' + (budgetTotal - cur.expense >= 0 ? 'pos' : 'neg')}>{fmtSigned(budgetTotal - cur.expense, currency)}</b></div>
            </div>
          </>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>Общий лимит месяца не задан — задайте его, чтобы дашборд показывал, укладываетесь ли вы в бюджет.</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 4 }}>Лимиты по направлениям и категориям</h3>
        <p className="muted small" style={{ marginBottom: 8 }}>Жёлтое предупреждение — с 80% лимита, красное — при превышении.</p>
        {usage.length === 0 ? (
          <Empty icon="📏" text="Лимитов пока нет. Добавьте лимит на продукты, жильё или развлечения.">
            <button className="btn btn-accent" onClick={() => setLimitModal('new')}>＋ Добавить лимит</button>
          </Empty>
        ) : (
          <div>
            {usage.map((u) => (
              <div key={u.limitId} className="limit-row">
                <span className="limit-name">
                  <span className="cat-dot" style={{ background: `var(--c-${u.group})` }} />
                  <span>{u.name}{u.kind === 'category' ? '' : ' (всё направление)'}</span>
                </span>
                <Meter ratio={u.ratio} />
                <span className="limit-val money">
                  <b style={u.level === 'over' ? { color: 'var(--bad-text)' } : undefined}>{fmtMoney(u.spent, currency)}</b>
                  <span className="muted"> / {fmtMoney(u.limit, currency)}</span>{' '}
                  <span className={'pill ' + (u.level === 'over' ? 'r' : u.level === 'warn' ? 'y' : 'n')}>
                    {u.level === 'over' ? `превышен на ${fmtMoney(u.spent - u.limit, currency)}` : fmtPct(u.ratio)}
                  </span>
                  <button className="row-menu" title="Изменить"
                    onClick={() => setLimitModal({ id: u.limitId, kind: u.kind, targetId: u.targetId, amount: u.limit })}>✏️</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalModal && (
        <TotalModal
          current={budgetTotal}
          month={month}
          onClose={() => setTotalModal(false)}
          onSave={saveTotal}
        />
      )}
      {limitModal && (
        <LimitModal
          limit={limitModal === 'new' ? null : limitModal}
          onClose={() => setLimitModal(null)}
          onSave={saveLimit}
          onDelete={limitModal !== 'new' ? () => deleteLimit(limitModal.id) : undefined}
        />
      )}
    </>
  );
}

function TotalModal({ current, month, onClose, onSave }: {
  current?: number;
  month: string;
  onClose: () => void;
  onSave: (v: number | undefined) => void;
}) {
  const [value, setValue] = useState(current ? String(current) : '');
  const [error, setError] = useState('');
  const save = () => {
    if (!value.trim()) { onSave(undefined); return; }
    const n = Number(value.replace(',', '.').replace(/\s/g, ''));
    if (!Number.isFinite(n) || n <= 0) { setError('Укажите сумму больше нуля или оставьте пустым'); return; }
    onSave(Math.round(n * 100) / 100);
  };
  return (
    <Modal title={`Общий бюджет — ${monthTitle(month).toLowerCase()}`} onClose={onClose}
      footer={<>
        {error && <span className="neg small">{error}</span>}
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-accent" onClick={save}>Сохранить</button>
      </>}
    >
      <Field label="Лимит расходов на месяц">
        <input className="input amount-input money" inputMode="decimal" value={value}
          onChange={(e) => setValue(e.target.value)} placeholder="Пусто — без общего лимита" autoFocus />
      </Field>
    </Modal>
  );
}

function LimitModal({ limit, onClose, onSave, onDelete }: {
  limit: BudgetLimit | null;
  onClose: () => void;
  onSave: (l: BudgetLimit) => void;
  onDelete?: () => void;
}) {
  const state = useAppState();
  const [target, setTarget] = useState(limit ? `${limit.kind}:${limit.targetId}` : 'category:fam-groceries');
  const [amount, setAmount] = useState(limit ? String(limit.amount) : '');
  const [error, setError] = useState('');

  const save = () => {
    const n = Number(amount.replace(',', '.').replace(/\s/g, ''));
    if (!Number.isFinite(n) || n <= 0) { setError('Укажите сумму лимита'); return; }
    const [kind, targetId] = target.split(/:(.+)/) as ['group' | 'category', string];
    onSave({ id: limit?.id ?? uid('lim'), kind, targetId, amount: Math.round(n * 100) / 100 });
  };

  return (
    <Modal title={limit ? 'Лимит' : 'Новый лимит'} onClose={onClose}
      footer={<>
        {onDelete && <span style={{ marginRight: 'auto' }}><ConfirmDelete onConfirm={onDelete} /></span>}
        {error && <span className="neg small">{error}</span>}
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-accent" onClick={save}>Сохранить</button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="На что лимит">
          <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!!limit}>
            <optgroup label="Целые направления">
              {GROUPS.filter((g) => g.key !== 'income').map((g) => (
                <option key={g.key} value={'group:' + g.key}>{g.icon} {g.name} — всё направление</option>
              ))}
            </optgroup>
            {GROUPS.filter((g) => g.key !== 'income').map((g) => {
              const cats = state.categories.filter((c) => c.group === g.key && c.type === 'expense');
              if (cats.length === 0) return null;
              return (
                <optgroup key={g.key} label={`${g.icon} ${g.name} — категории`}>
                  {cats.map((c) => <option key={c.id} value={'category:' + c.id}>{c.icon} {c.name}</option>)}
                </optgroup>
              );
            })}
          </select>
        </Field>
        <Field label="Сумма лимита в месяц">
          <input className="input money" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus={!!limit} />
        </Field>
      </div>
    </Modal>
  );
}
