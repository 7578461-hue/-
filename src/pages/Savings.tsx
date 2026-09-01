import { useMemo, useState } from 'react';
import type { SavingsGoal } from '../types';
import { fmtMoney, monthKeyOf } from '../lib/format';
import { uid } from '../lib/id';
import { goalSaved } from '../state/selectors';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { ConfirmDelete, Empty, Field, Meter, Modal, StatCard } from '../components/ui';

export function Savings() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { month, openQuickAdd, toast } = useUi();
  const currency = state.settings.currency;
  const [editing, setEditing] = useState<SavingsGoal | 'new' | null>(null);

  const monthContrib = useMemo(
    () => state.transactions
      .filter((t) => t.type === 'expense' && t.goalId && monthKeyOf(t.date) === month)
      .reduce((s, t) => s + t.amount, 0),
    [state, month],
  );
  const savedTotal = state.goals.reduce((s, g) => s + goalSaved(state, g), 0);
  const targetTotal = state.goals.reduce((s, g) => s + g.target, 0);

  return (
    <>
      <div className="page-head">
        <h2 className="page-title">🎯 Накопления</h2>
        <span className="spacer" />
        <button className="btn btn-accent" onClick={() => setEditing('new')}>＋ Цель</button>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard icon="🏦" label="Всего накоплено" value={fmtMoney(savedTotal, currency)} valueClass="pos"
          sub={targetTotal > 0 ? `из ${fmtMoney(targetTotal, currency)} по всем целям` : undefined} />
        <StatCard icon="➕" label="Взносы в этом месяце" value={fmtMoney(monthContrib, currency)}
          sub="учитываются как расход месяца" />
        <StatCard icon="🎯" label="Целей" value={String(state.goals.length)}
          sub={state.goals.length > 0 ? 'пополняйте прямо с карточки' : undefined} />
      </div>

      {state.goals.length === 0 ? (
        <div className="card">
          <Empty icon="🎯" text="Создайте финансовые цели — резервный фонд, отпуск, крупную покупку — и откладывайте на них каждый месяц.">
            <button className="btn btn-accent" onClick={() => setEditing('new')}>＋ Создать цель</button>
          </Empty>
        </div>
      ) : (
        <div className="grid-2">
          {state.goals.map((g) => {
            const saved = goalSaved(state, g);
            const left = Math.max(g.target - saved, 0);
            const ratio = g.target > 0 ? saved / g.target : 0;
            const done = left <= 0.005;
            return (
              <div key={g.id} className="card">
                <div className="goal-head">
                  <span className="goal-icon">{g.icon}</span>
                  <div>
                    <h3 style={{ fontSize: 15 }}>{g.name}</h3>
                    <div className="muted small">цель: <span className="money">{fmtMoney(g.target, currency)}</span></div>
                  </div>
                  <span className="spacer" />
                  <button className="row-menu" title="Изменить" onClick={() => setEditing(g)}>✏️</button>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Meter ratio={ratio} tone="good" />
                </div>
                <div className="budget-nums">
                  <div>Накоплено<b className="money pos">{fmtMoney(saved, currency)}</b></div>
                  <div>Осталось<b className="money">{fmtMoney(left, currency)}</b></div>
                  <div>Прогресс<b>{Math.min(Math.round(ratio * 100), 999)}%</b></div>
                </div>
                <div style={{ marginTop: 12 }}>
                  {done ? (
                    <span className="pill g">цель достигнута 🎉</span>
                  ) : (
                    <button
                      className="btn btn-accent btn-sm"
                      onClick={() => openQuickAdd({
                        type: 'expense',
                        categoryId: 'sav-goal',
                        description: `Взнос — ${g.name}`,
                        goalId: g.id,
                        method: 'transfer',
                      })}
                    >＋ Пополнить</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <GoalModal
          goal={editing === 'new' ? null : editing}
          contributed={editing === 'new' ? 0 : goalSaved(state, editing) - editing.startSaved}
          onClose={() => setEditing(null)}
          onDelete={editing !== 'new' ? () => {
            dispatch({ type: 'goal/delete', id: editing.id });
            toast('Цель удалена');
            setEditing(null);
          } : undefined}
          onSave={(g) => {
            dispatch({ type: 'goal/upsert', goal: g });
            toast(editing === 'new' ? 'Цель создана' : 'Изменения сохранены');
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function GoalModal({ goal, contributed, onClose, onSave, onDelete }: {
  goal: SavingsGoal | null;
  contributed: number;
  onClose: () => void;
  onSave: (g: SavingsGoal) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(goal?.name ?? '');
  const [icon, setIcon] = useState(goal?.icon ?? '🎯');
  const [target, setTarget] = useState(goal ? String(goal.target) : '');
  const [saved, setSaved] = useState(goal ? String(goal.startSaved + contributed) : '0');
  const [error, setError] = useState('');

  const save = () => {
    const t = Number(target.replace(',', '.').replace(/\s/g, ''));
    const s = Number(saved.replace(',', '.').replace(/\s/g, '') || '0');
    if (!name.trim()) { setError('Укажите название цели'); return; }
    if (!Number.isFinite(t) || t <= 0) { setError('Укажите сумму цели'); return; }
    if (!Number.isFinite(s) || s < 0) { setError('Накоплено не может быть отрицательным'); return; }
    onSave({
      id: goal?.id ?? uid('goal'),
      name: name.trim(),
      icon: icon.trim() || '🎯',
      target: Math.round(t * 100) / 100,
      // «накоплено сейчас» вводится целиком: взносы операций уже учтены отдельно
      startSaved: Math.round((s - contributed) * 100) / 100,
      demo: goal?.demo,
    });
  };

  return (
    <Modal
      title={goal ? 'Цель накопления' : 'Новая цель'}
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
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: резервный фонд" />
        </Field>
        <Field label="Значок (эмодзи)">
          <input className="input" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
        </Field>
        <Field label="Сумма цели">
          <input className="input money" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Накоплено сейчас" className="wide">
          <input className="input money" inputMode="decimal" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" />
        </Field>
      </div>
      <p className="muted small">Взносы делайте кнопкой «Пополнить» — они попадут в операции и в расходы месяца.</p>
    </Modal>
  );
}
