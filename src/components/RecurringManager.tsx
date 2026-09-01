// Регулярные платежи: список со статусами месяца, оплата в один клик,
// добавление и редактирование. Используется на вкладках «Жильё» и «Календарь».

import { useMemo, useState } from 'react';
import type { GroupKey, RecurringPayment, RecurringKind } from '../types';
import { GROUPS } from '../data/catalog';
import { fmtMoney } from '../lib/format';
import { uid } from '../lib/id';
import { catById, scheduledPayments } from '../state/selectors';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { ConfirmDelete, Empty, Field, Modal, StatusDot, StatusPill } from './ui';

function kindFor(group: GroupKey, categoryId: string): RecurringKind {
  if (categoryId === 'hou-rent') return 'rent';
  if (group === 'housing') return 'utility';
  if (group === 'subscriptions') return 'subscription';
  if (group === 'credit') return 'credit';
  return 'other';
}

export function RecurringManager({ groupFilter }: { groupFilter?: GroupKey }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { month, openQuickAdd, toast } = useUi();
  const currency = state.settings.currency;
  const [editing, setEditing] = useState<RecurringPayment | 'new' | null>(null);

  const items = useMemo(() => {
    return scheduledPayments(state, month)
      .filter((p) => p.source === 'recurring')
      .filter((p) => !groupFilter || p.group === groupFilter);
  }, [state, month, groupFilter]);

  const pay = (p: (typeof items)[number]) => {
    openQuickAdd({
      type: 'expense',
      amount: Math.max(p.amount - p.paidAmount, 0) || p.amount,
      categoryId: p.categoryId,
      description: p.name,
      date: p.date,
      mandatory: true,
      method: 'transfer',
      recurringId: p.refId,
    });
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h3 style={{ fontSize: 15 }}>Регулярные платежи</h3>
        <span className="spacer" />
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing('new')}>＋ Платёж</button>
      </div>
      {items.length === 0 ? (
        <Empty icon="🔁" text="Регулярных платежей пока нет. Добавьте аренду, коммунальные или подписки — приложение будет напоминать о них каждый месяц." />
      ) : (
        <div>
          {items.map((p) => {
            const rec = state.recurring.find((r) => r.id === p.refId);
            return (
              <div key={p.key} className="pay-row">
                <StatusDot status={p.status} />
                <div className="grow">
                  <b>{p.name}</b>
                  <div className="muted small">каждое {p.day}-е число · {p.subtitle}</div>
                </div>
                <span className="money" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMoney(p.amount, currency)}</span>
                {p.status === 'paid'
                  ? <StatusPill status="paid" />
                  : <button className="btn btn-ghost btn-sm" onClick={() => pay(p)}>Оплатить</button>}
                {rec && <button className="row-menu" title="Изменить" onClick={() => setEditing(rec)}>✏️</button>}
              </div>
            );
          })}
        </div>
      )}
      {editing && (
        <RecurringModal
          item={editing === 'new' ? null : editing}
          groupFilter={groupFilter}
          onClose={() => setEditing(null)}
          onDelete={editing !== 'new' ? () => {
            dispatch({ type: 'recurring/delete', id: editing.id });
            toast('Регулярный платёж удалён');
            setEditing(null);
          } : undefined}
          onSave={(item) => {
            dispatch({ type: 'recurring/upsert', item });
            toast(editing === 'new' ? 'Регулярный платёж добавлен' : 'Платёж обновлён');
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function RecurringModal({ item, groupFilter, onClose, onSave, onDelete }: {
  item: RecurringPayment | null;
  groupFilter?: GroupKey;
  onClose: () => void;
  onSave: (item: RecurringPayment) => void;
  onDelete?: () => void;
}) {
  const state = useAppState();
  const cats = state.categories.filter(
    (c) => c.type === 'expense' && (!groupFilter || c.group === groupFilter),
  );
  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState(item ? String(item.amount) : '');
  const [day, setDay] = useState(item ? String(item.day) : '1');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? cats[0]?.id ?? 'hou-rent');
  const [error, setError] = useState('');

  const save = () => {
    const sum = Number(amount.replace(',', '.').replace(/\s/g, ''));
    const d = Math.round(Number(day));
    if (!name.trim()) { setError('Укажите название'); return; }
    if (!Number.isFinite(sum) || sum <= 0) { setError('Укажите сумму больше нуля'); return; }
    if (!Number.isFinite(d) || d < 1 || d > 28) { setError('День — от 1 до 28'); return; }
    const cat = catById(state, categoryId);
    onSave({
      id: item?.id ?? uid('rec'),
      name: name.trim(),
      amount: Math.round(sum * 100) / 100,
      day: d,
      categoryId,
      kind: kindFor(cat?.group ?? 'other', categoryId),
      demo: item?.demo,
    });
  };

  return (
    <Modal
      title={item ? 'Регулярный платёж' : 'Новый регулярный платёж'}
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
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: аренда квартиры" />
        </Field>
        <Field label="Сумма">
          <input className="input money" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </Field>
        <Field label="День оплаты (1–28)">
          <input className="input" type="number" min={1} max={28} value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label="Категория" className="wide">
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {(groupFilter ? [GROUPS.find((g) => g.key === groupFilter)!] : GROUPS.filter((g) => g.key !== 'income')).map((g) => {
              const list = cats.filter((c) => c.group === g.key);
              if (list.length === 0) return null;
              return (
                <optgroup key={g.key} label={`${g.icon} ${g.name}`}>
                  {list.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </optgroup>
              );
            })}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
