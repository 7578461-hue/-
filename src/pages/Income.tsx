import { useMemo, useState } from 'react';
import { fmtMoney, fmtSigned, monthTitle } from '../lib/format';
import { incomePlanRows, txsOfMonth } from '../state/selectors';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { TxTable } from '../components/TxTable';
import { Field, Modal, StatCard } from '../components/ui';

export function Income() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { month, openQuickAdd, toast } = useUi();
  const currency = state.settings.currency;
  const [editPlan, setEditPlan] = useState(false);

  const { rows, sourceMonth } = useMemo(() => incomePlanRows(state, month), [state, month]);
  const txs = useMemo(
    () => txsOfMonth(state, month).filter((t) => t.type === 'income').sort((a, b) => b.date.localeCompare(a.date)),
    [state, month],
  );

  const planTotal = rows.reduce((s, r) => s + r.plan, 0);
  const factTotal = rows.reduce((s, r) => s + r.fact, 0);

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">Доходы</h2>
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={() => setEditPlan(true)}>Изменить план</button>
        <button className="btn btn-good" onClick={() => openQuickAdd({ type: 'income' })}>＋ Доход</button>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon="💰" label="Получено" value={fmtMoney(factTotal, currency)} valueClass="pos" />
        <StatCard icon="🗓️" label="План на месяц" value={fmtMoney(planTotal, currency)}
          sub={sourceMonth && sourceMonth !== month ? `план унаследован из: ${monthTitle(sourceMonth).toLowerCase()}` : undefined} />
        <StatCard icon="⚖️" label="Разница" value={fmtSigned(factTotal - planTotal, currency)}
          valueClass={factTotal - planTotal >= 0 ? 'pos' : 'neg'} />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>План и факт по источникам</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Источник</th><th className="r">План</th><th className="r">Факт</th><th className="r">Разница</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="muted">Добавьте первый доход или задайте план кнопкой «Изменить план».</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.category.id}>
                  <td>{r.category.icon} {r.category.name}</td>
                  <td className="r money muted">{r.plan > 0 ? fmtMoney(r.plan, currency) : '—'}</td>
                  <td className="r money" style={{ fontWeight: 600 }}>{fmtMoney(r.fact, currency)}</td>
                  <td className={'r money ' + (r.diff >= 0 ? 'pos' : 'neg')}>{r.plan > 0 ? fmtSigned(r.diff, currency) : '—'}</td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr style={{ fontWeight: 700 }}>
                  <td>Итого</td>
                  <td className="r money">{fmtMoney(planTotal, currency)}</td>
                  <td className="r money">{fmtMoney(factTotal, currency)}</td>
                  <td className={'r money ' + (factTotal - planTotal >= 0 ? 'pos' : 'neg')}>{fmtSigned(factTotal - planTotal, currency)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Поступления месяца</h3>
        <TxTable txs={txs} compact emptyText="В этом месяце доходов пока нет" />
      </div>

      {editPlan && (
        <PlanModal
          month={month}
          initial={Object.fromEntries(rows.map((r) => [r.category.id, r.plan]))}
          onClose={() => setEditPlan(false)}
          onSave={(plans) => {
            dispatch({ type: 'incomePlan/set', month, plans });
            toast('План доходов сохранён');
            setEditPlan(false);
          }}
        />
      )}
    </>
  );
}

function PlanModal({ month, initial, onClose, onSave }: {
  month: string;
  initial: Record<string, number>;
  onClose: () => void;
  onSave: (plans: Record<string, number>) => void;
}) {
  const state = useAppState();
  const incomeCats = state.categories.filter((c) => c.type === 'income');
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(incomeCats.map((c) => [c.id, initial[c.id] ? String(initial[c.id]) : ''])),
  );

  const save = () => {
    const plans: Record<string, number> = {};
    for (const [id, v] of Object.entries(values)) {
      const n = Number(v.replace(',', '.').replace(/\s/g, ''));
      if (Number.isFinite(n) && n > 0) plans[id] = Math.round(n * 100) / 100;
    }
    onSave(plans);
  };

  return (
    <Modal
      title={`План доходов — ${monthTitle(month).toLowerCase()}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-accent" onClick={save}>Сохранить</button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {incomeCats.map((c) => (
          <Field key={c.id} label={`${c.icon} ${c.name}`}>
            <input
              className="input money"
              inputMode="decimal"
              placeholder="0"
              value={values[c.id] ?? ''}
              onChange={(e) => setValues({ ...values, [c.id]: e.target.value })}
            />
          </Field>
        ))}
        <p className="muted small">План сохраняется для выбранного месяца и наследуется следующими, пока вы его не измените.</p>
      </div>
    </Modal>
  );
}
