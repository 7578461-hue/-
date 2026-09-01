import { useMemo, useState } from 'react';
import type { Employee } from '../types';
import { fmtMoney } from '../lib/format';
import { uid } from '../lib/id';
import { staffMonth } from '../state/selectors';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { TxTable } from '../components/TxTable';
import { ConfirmDelete, Empty, Field, Modal, StatCard } from '../components/ui';

export function Staff() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { month, openQuickAdd, toast } = useUi();
  const currency = state.settings.currency;
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);

  const data = useMemo(() => staffMonth(state, month), [state, month]);

  const extras = (empId: string, cats: string[]) =>
    data.staffTxs
      .filter((t) => t.employeeId === empId && cats.includes(t.categoryId))
      .reduce((s, t) => s + t.amount, 0);

  const paySalary = (row: (typeof data.rows)[number]) => {
    openQuickAdd({
      type: 'expense',
      amount: row.remaining > 0 ? row.remaining : row.employee.salary,
      categoryId: 'stf-salary',
      description: `Зарплата — ${row.employee.name}`,
      mandatory: true,
      method: 'transfer',
      employeeId: row.employee.id,
    });
  };

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">👥 Персонал</h2>
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={() => setEditing('new')}>＋ Сотрудник</button>
        <button className="btn btn-accent" onClick={() => openQuickAdd({ type: 'expense', categoryId: 'stf-salary' })}>Выплатить</button>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon="🗓️" label="План на месяц" value={fmtMoney(data.planned, currency)}
          sub={`${data.rows.length} активных сотрудников`} />
        <StatCard icon="✅" label="Выплачено" value={fmtMoney(data.groupSpent, currency)} valueClass={data.groupSpent > 0 ? 'pos' : undefined}
          sub="все выплаты раздела «Персонал»" />
        <StatCard icon="⏳" label="Осталось выплатить" value={fmtMoney(data.remaining, currency)}
          valueClass={data.remaining > 0 ? 'warn-text' : 'pos'}
          sub={data.remaining > 0 ? 'по окладам сотрудников' : 'все оклады закрыты'} />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Сотрудники</h3>
        {data.rows.length === 0 ? (
          <Empty icon="👥" text="Добавьте сотрудников — няню, домработницу, водителя — и приложение будет считать выплаты и напоминать о зарплате.">
            <button className="btn btn-accent" onClick={() => setEditing('new')}>＋ Добавить сотрудника</button>
          </Empty>
        ) : (
          <div className="table-scroll">
            <table className="table-wide">
              <thead>
                <tr>
                  <th>Сотрудник</th><th>Должность</th><th className="r">Оклад</th><th>День выплаты</th>
                  <th className="r">Авансы</th><th className="r">Премии и бонусы</th><th className="r">Выплачено</th>
                  <th>Статус</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const e = row.employee;
                  const adv = extras(e.id, ['stf-advance']);
                  const bon = extras(e.id, ['stf-premium', 'stf-bonus']);
                  return (
                    <tr key={e.id}>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="avatar" style={{
                            width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)',
                            color: 'var(--accent-text)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12, flex: 'none',
                          }}>{e.name.slice(0, 2).toUpperCase()}</span>
                          <b>{e.name}</b>
                        </span>
                      </td>
                      <td>{e.position}</td>
                      <td className="r money">{fmtMoney(e.salary, currency)}</td>
                      <td className="muted">{e.payDay} число</td>
                      <td className="r money">{adv > 0 ? fmtMoney(adv, currency) : '—'}</td>
                      <td className="r money">{bon > 0 ? fmtMoney(bon, currency) : '—'}</td>
                      <td className="r money" style={{ fontWeight: 600 }}>{fmtMoney(row.paid, currency)}</td>
                      <td>
                        {row.status === 'paid' && <span className="pill g">оплачено</span>}
                        {row.status === 'partial' && <span className="pill y">частично · {fmtMoney(row.remaining, currency)}</span>}
                        {row.status === 'unpaid' && <span className="pill n">не оплачено</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {row.remaining > 0 && (
                          <button className="btn btn-ghost btn-sm" onClick={() => paySalary(row)}>Выплатить</button>
                        )}
                        <button className="row-menu" title="Изменить" onClick={() => setEditing(e)}>✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Выплаты месяца</h3>
        <TxTable txs={[...data.staffTxs].reverse()} compact emptyText="Выплат в этом месяце ещё не было" />
      </div>

      {editing && (
        <EmployeeModal
          employee={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDelete={editing !== 'new' ? () => {
            dispatch({ type: 'employee/delete', id: editing.id });
            toast('Сотрудник удалён');
            setEditing(null);
          } : undefined}
          onSave={(e) => {
            dispatch({ type: 'employee/upsert', employee: e });
            toast(editing === 'new' ? 'Сотрудник добавлен' : 'Изменения сохранены');
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function EmployeeModal({ employee, onClose, onSave, onDelete }: {
  employee: Employee | null;
  onClose: () => void;
  onSave: (e: Employee) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(employee?.name ?? '');
  const [position, setPosition] = useState(employee?.position ?? '');
  const [salary, setSalary] = useState(employee ? String(employee.salary) : '');
  const [payDay, setPayDay] = useState(employee ? String(employee.payDay) : '5');
  const [active, setActive] = useState(employee?.active ?? true);
  const [notes, setNotes] = useState(employee?.notes ?? '');
  const [error, setError] = useState('');

  const save = () => {
    const sum = Number(salary.replace(',', '.').replace(/\s/g, ''));
    const d = Math.round(Number(payDay));
    if (!name.trim()) { setError('Укажите имя'); return; }
    if (!Number.isFinite(sum) || sum <= 0) { setError('Укажите оклад больше нуля'); return; }
    if (!Number.isFinite(d) || d < 1 || d > 28) { setError('День выплаты — от 1 до 28'); return; }
    onSave({
      id: employee?.id ?? uid('emp'),
      name: name.trim(),
      position: position.trim() || 'Сотрудник',
      salary: Math.round(sum * 100) / 100,
      payDay: d,
      active,
      notes: notes.trim() || undefined,
      demo: employee?.demo,
    });
  };

  return (
    <Modal
      title={employee ? 'Сотрудник' : 'Новый сотрудник'}
      onClose={onClose}
      footer={<>
        {onDelete && <span style={{ marginRight: 'auto' }}><ConfirmDelete onConfirm={onDelete} /></span>}
        {error && <span className="neg small">{error}</span>}
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-accent" onClick={save}>Сохранить</button>
      </>}
    >
      <div className="form-grid">
        <Field label="Имя"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Анна" /></Field>
        <Field label="Должность"><input className="input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Няня" /></Field>
        <Field label="Оклад в месяц"><input className="input money" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0" /></Field>
        <Field label="День выплаты (1–28)"><input className="input" type="number" min={1} max={28} value={payDay} onChange={(e) => setPayDay(e.target.value)} /></Field>
        <Field label="Заметка" className="wide"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Необязательно" /></Field>
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Работает сейчас (учитывать в плане выплат)
      </label>
    </Modal>
  );
}
