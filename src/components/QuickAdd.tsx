// Быстрое добавление/редактирование операции.
// Открывается из шапки, FAB, таблиц и кнопок «Оплатить» с предзаполнением.

import { useMemo, useState } from 'react';
import type { PayMethod, Transaction, TxType } from '../types';
import { GROUPS, PAY_METHODS } from '../data/catalog';
import { currentMonth, monthTitle, monthKeyOf, todayISO } from '../lib/format';
import { uid } from '../lib/id';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi, type QuickAddPrefill } from '../state/ui';
import { Field, Modal } from './ui';

export function QuickAddHost() {
  const { quickAdd } = useUi();
  if (!quickAdd) return null;
  return <QuickAddForm prefill={quickAdd} />;
}

function QuickAddForm({ prefill }: { prefill: QuickAddPrefill }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { closeQuickAdd, toast, month } = useUi();

  const editTx = prefill.editId ? state.transactions.find((t) => t.id === prefill.editId) : undefined;
  const src: Partial<Transaction> = editTx ?? prefill;

  const defaultDate = month === currentMonth() ? todayISO() : `${month}-01`;

  const [type, setType] = useState<TxType>(src.type ?? 'expense');
  const [amount, setAmount] = useState(src.amount ? String(src.amount) : '');
  const [categoryId, setCategoryId] = useState(src.categoryId ?? (type === 'income' ? 'inc-my-salary' : 'fam-groceries'));
  const [description, setDescription] = useState(src.description ?? '');
  const [date, setDate] = useState(src.date ?? defaultDate);
  const [memberId, setMemberId] = useState(src.memberId ?? 'me');
  const [method, setMethod] = useState<PayMethod>(src.method ?? 'card');
  const [mandatory, setMandatory] = useState(src.mandatory ?? false);
  const [comment, setComment] = useState(src.comment ?? '');
  const [employeeId, setEmployeeId] = useState(src.employeeId ?? '');
  const [goalId, setGoalId] = useState(src.goalId ?? '');
  const [debtId, setDebtId] = useState(src.debtId ?? '');
  const [error, setError] = useState('');

  const cats = useMemo(() => state.categories.filter((c) => c.type === type), [state.categories, type]);
  const selectedCat = state.categories.find((c) => c.id === categoryId);
  const group = selectedCat?.group;

  const linkedRecurring = src.recurringId ? state.recurring.find((r) => r.id === src.recurringId) : undefined;

  const switchType = (t: TxType) => {
    setType(t);
    const cat = state.categories.find((c) => c.id === categoryId);
    if (!cat || cat.type !== t) {
      setCategoryId(t === 'income' ? 'inc-my-salary' : 'fam-groceries');
    }
  };

  const save = () => {
    const num = Number(amount.replace(',', '.').replace(/\s/g, ''));
    if (!Number.isFinite(num) || num <= 0) { setError('Укажите сумму больше нуля'); return; }
    if (!selectedCat) { setError('Выберите категорию'); return; }
    if (!date || date.length !== 10) { setError('Укажите дату'); return; }

    const tx: Transaction = {
      id: editTx?.id ?? uid('tx'),
      type,
      amount: Math.round(num * 100) / 100,
      date,
      categoryId,
      description: description.trim() || selectedCat.name,
      memberId: memberId || undefined,
      method,
      mandatory,
      comment: comment.trim() || undefined,
      employeeId: group === 'staff' && employeeId ? employeeId : undefined,
      goalId: group === 'savings' && goalId ? goalId : undefined,
      debtId: group === 'credit' && debtId ? debtId : undefined,
      recurringId: src.recurringId,
      demo: editTx?.demo,
    };
    dispatch(editTx ? { type: 'tx/update', tx } : { type: 'tx/add', tx });
    const txMonth = monthKeyOf(date);
    toast(
      editTx
        ? 'Операция сохранена'
        : `${type === 'income' ? 'Доход' : 'Расход'} добавлен${txMonth !== month ? ` в ${monthTitle(txMonth).toLowerCase()}` : ''}`,
    );
    closeQuickAdd();
  };

  return (
    <Modal
      title={editTx ? 'Редактировать операцию' : 'Новая операция'}
      onClose={closeQuickAdd}
      footer={
        <>
          {error && <span className="neg small" style={{ marginRight: 'auto' }}>{error}</span>}
          <button className="btn btn-ghost" onClick={closeQuickAdd}>Отмена</button>
          <button className="btn btn-accent" onClick={save}>Сохранить</button>
        </>
      }
    >
      <form
        onSubmit={(e) => { e.preventDefault(); save(); }}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="seg" role="tablist" aria-label="Тип операции">
            <button type="button" className={type === 'expense' ? 'on seg-exp' : ''} onClick={() => switchType('expense')}>Расход</button>
            <button type="button" className={type === 'income' ? 'on seg-inc' : ''} onClick={() => switchType('income')}>Доход</button>
          </div>
          {linkedRecurring && <span className="pill b">закроет платёж: {linkedRecurring.name}</span>}
        </div>

        <Field label="Сумма">
          <input
            className="input amount-input money"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </Field>

        <div className="form-grid">
          <Field label="Категория" className="wide">
            <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {type === 'income'
                ? cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)
                : GROUPS.filter((g) => g.key !== 'income').map((g) => {
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

          {group === 'staff' && (
            <Field label="Сотрудник" className="wide">
              <select className="select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Без привязки к сотруднику</option>
                {state.employees.filter((e) => e.active).map((e) => (
                  <option key={e.id} value={e.id}>{e.name} — {e.position}</option>
                ))}
              </select>
            </Field>
          )}
          {group === 'savings' && (
            <Field label="Цель накопления" className="wide">
              <select className="select" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                <option value="">Без привязки к цели</option>
                {state.goals.map((g) => <option key={g.id} value={g.id}>{g.icon} {g.name}</option>)}
              </select>
            </Field>
          )}
          {group === 'credit' && (
            <Field label="Кредит / долг" className="wide">
              <select className="select" value={debtId} onChange={(e) => setDebtId(e.target.value)}>
                <option value="">Без привязки к кредиту</option>
                {state.debts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Описание" className="wide">
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={selectedCat?.name ?? 'Например: продукты на неделю'} />
          </Field>

          <Field label="Дата">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Кто">
            <select className="select" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              {state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              <option value="">Не указан</option>
            </select>
          </Field>

          <Field label="Способ оплаты">
            <select className="select" value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              {PAY_METHODS.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Комментарий">
            <input className="input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Необязательно" />
          </Field>
        </div>

        {type === 'expense' && (
          <label className="checkbox">
            <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
            Обязательный платёж
          </label>
        )}
        {/* скрытая submit-кнопка: Enter сохраняет форму */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
