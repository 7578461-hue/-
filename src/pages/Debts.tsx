import { useMemo, useState } from 'react';
import type { Debt } from '../types';
import { fmtDayLong, fmtMoney } from '../lib/format';
import { uid } from '../lib/id';
import { debtPaidTotal, debtRemaining, scheduledPayments } from '../state/selectors';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { ConfirmDelete, Empty, Field, Meter, Modal, StatCard, StatusPill } from '../components/ui';

export function Debts() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { month, openQuickAdd, toast } = useUi();
  const currency = state.settings.currency;
  const [editing, setEditing] = useState<Debt | 'new' | null>(null);

  const schedule = useMemo(
    () => new Map(scheduledPayments(state, month).filter((p) => p.source === 'debt').map((p) => [p.refId, p])),
    [state, month],
  );

  const totalRemaining = state.debts.reduce((s, d) => s + debtRemaining(state, d), 0);
  const monthlyTotal = state.debts.reduce((s, d) => s + (debtRemaining(state, d) > 0 ? d.monthlyPayment : 0), 0);

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">🏦 Кредиты и долги</h2>
        <span className="spacer" />
        <button className="btn btn-accent" onClick={() => setEditing('new')}>＋ Обязательство</button>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon="💼" label="Остаток по всем долгам" value={fmtMoney(totalRemaining, currency)}
          sub={`${state.debts.length} обязательств`} />
        <StatCard icon="📅" label="Платежи в месяц" value={fmtMoney(monthlyTotal, currency)} sub="по активным обязательствам" />
        <StatCard icon="✅" label="Уже выплачено" value={fmtMoney(state.debts.reduce((s, d) => s + (d.total - debtRemaining(state, d)), 0), currency)}
          valueClass="pos" sub="от общей суммы обязательств" />
      </div>

      {state.debts.length === 0 ? (
        <div className="card">
          <Empty icon="🏦" text="Добавьте кредиты и долги — приложение посчитает остатки и напомнит о платежах.">
            <button className="btn btn-accent" onClick={() => setEditing('new')}>＋ Добавить обязательство</button>
          </Empty>
        </div>
      ) : (
        <div className="grid-2">
          {state.debts.map((d) => {
            const remaining = debtRemaining(state, d);
            const paidShare = d.total > 0 ? (d.total - remaining) / d.total : 0;
            const sched = schedule.get(d.id);
            const closed = remaining <= 0.005;
            return (
              <div key={d.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ fontSize: 15 }}>{d.name}</h3>
                  {d.rate > 0 && <span className="pill n money">{d.rate}%</span>}
                  <span className="spacer" />
                  <button className="row-menu" title="Изменить" onClick={() => setEditing(d)}>✏️</button>
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }} className="money">{fmtMoney(remaining, currency)}</span>
                  <span className="muted small">осталось из {fmtMoney(d.total, currency)}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <Meter ratio={paidShare} tone="good" />
                </div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  выплачено {fmtMoney(d.total - remaining, currency)} · {Math.round(paidShare * 100)}%
                </div>
                {!closed && sched && (
                  <div className="pay-row" style={{ marginTop: 8, borderTop: '1px solid var(--line-soft)', borderBottom: 'none' }}>
                    <div className="grow">
                      <b className="money">{fmtMoney(sched.amount, currency)}</b>
                      <div className="muted small">платёж до {fmtDayLong(sched.date)}</div>
                    </div>
                    {sched.status === 'paid'
                      ? <StatusPill status="paid" />
                      : (
                        <>
                          <StatusPill status={sched.status} />
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openQuickAdd({
                              type: 'expense',
                              amount: Math.max(sched.amount - sched.paidAmount, 0) || sched.amount,
                              categoryId: 'crd-payment',
                              description: `${d.name} — платёж`,
                              date: sched.date,
                              mandatory: true,
                              method: 'transfer',
                              debtId: d.id,
                            })}
                          >Оплатить</button>
                        </>
                      )}
                  </div>
                )}
                {closed && <div className="pill g" style={{ marginTop: 10, display: 'inline-block' }}>долг закрыт 🎉</div>}
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <DebtModal
          debt={editing === 'new' ? null : editing}
          paidSoFar={editing === 'new' ? 0 : debtPaidTotal(state, editing)}
          onClose={() => setEditing(null)}
          onDelete={editing !== 'new' ? () => {
            dispatch({ type: 'debt/delete', id: editing.id });
            toast('Обязательство удалено');
            setEditing(null);
          } : undefined}
          onSave={(d) => {
            dispatch({ type: 'debt/upsert', debt: d });
            toast(editing === 'new' ? 'Обязательство добавлено' : 'Изменения сохранены');
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function DebtModal({ debt, paidSoFar, onClose, onSave, onDelete }: {
  debt: Debt | null;
  paidSoFar: number;
  onClose: () => void;
  onSave: (d: Debt) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(debt?.name ?? '');
  const [total, setTotal] = useState(debt ? String(debt.total) : '');
  const [remaining, setRemaining] = useState(debt ? String(Math.max(debt.startBalance - paidSoFar, 0)) : '');
  const [monthly, setMonthly] = useState(debt ? String(debt.monthlyPayment) : '');
  const [payDay, setPayDay] = useState(debt ? String(debt.payDay) : '15');
  const [rate, setRate] = useState(debt ? String(debt.rate) : '0');
  const [error, setError] = useState('');

  const num = (v: string) => Number(v.replace(',', '.').replace(/\s/g, ''));

  const save = () => {
    const t = num(total); const r = num(remaining); const m = num(monthly);
    const d = Math.round(Number(payDay)); const rt = num(rate || '0');
    if (!name.trim()) { setError('Укажите название'); return; }
    if (!Number.isFinite(t) || t <= 0) { setError('Укажите общую сумму'); return; }
    if (!Number.isFinite(r) || r < 0) { setError('Укажите текущий остаток'); return; }
    if (!Number.isFinite(m) || m <= 0) { setError('Укажите ежемесячный платёж'); return; }
    if (!Number.isFinite(d) || d < 1 || d > 28) { setError('День платежа — от 1 до 28'); return; }
    onSave({
      id: debt?.id ?? uid('debt'),
      name: name.trim(),
      total: Math.round(t * 100) / 100,
      // остаток вводится «на сегодня»: прошлые платежи уже учтены в paidSoFar
      startBalance: Math.round((r + paidSoFar) * 100) / 100,
      monthlyPayment: Math.round(m * 100) / 100,
      payDay: d,
      rate: Number.isFinite(rt) ? rt : 0,
      demo: debt?.demo,
    });
  };

  return (
    <Modal
      title={debt ? 'Кредит / долг' : 'Новое обязательство'}
      onClose={onClose}
      footer={<>
        {onDelete && <span style={{ marginRight: 'auto' }}><ConfirmDelete onConfirm={onDelete} /></span>}
        {error && <span className="neg small">{error}</span>}
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-accent" onClick={save}>Сохранить</button>
      </>}
    >
      <div className="form-grid">
        <Field label="Название" className="wide">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: автокредит" />
        </Field>
        <Field label="Общая сумма">
          <input className="input money" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Остаток долга сейчас">
          <input className="input money" inputMode="decimal" value={remaining} onChange={(e) => setRemaining(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Ежемесячный платёж">
          <input className="input money" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="0" />
        </Field>
        <Field label="День платежа (1–28)">
          <input className="input" type="number" min={1} max={28} value={payDay} onChange={(e) => setPayDay(e.target.value)} />
        </Field>
        <Field label="Ставка, % годовых">
          <input className="input money" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <p className="muted small">Платежи, привязанные к обязательству, автоматически уменьшают остаток долга.</p>
    </Modal>
  );
}
