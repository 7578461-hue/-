// Таблица операций: используется на вкладке «Операции» (полный набор колонок)
// и в компактном виде на страницах разделов. Редактирование, дублирование,
// удаление — прямо из строки.

import { useEffect, useRef, useState } from 'react';
import type { Transaction } from '../types';
import { payMethodName } from '../data/catalog';
import { fmtDayShort, fmtMoney, fmtSigned } from '../lib/format';
import { catById } from '../state/selectors';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { CatChip } from './CatChip';
import { Empty } from './ui';

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      className="row-menu"
      title={armed ? 'Нажмите ещё раз для удаления' : 'Удалить'}
      style={armed ? { background: 'var(--bad-soft)', color: 'var(--bad-text)' } : undefined}
      onClick={() => {
        if (armed) { onDelete(); return; }
        setArmed(true);
        timer.current = window.setTimeout(() => setArmed(false), 3000);
      }}
    >
      {armed ? '❗' : '🗑'}
    </button>
  );
}

export function TxTable({ txs, compact, emptyText }: {
  txs: Transaction[];
  compact?: boolean;
  emptyText?: string;
}) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { openQuickAdd, toast } = useUi();
  const currency = state.settings.currency;

  if (txs.length === 0) {
    return <Empty icon="💳" text={emptyText ?? 'Операций нет'} />;
  }

  const memberName = (id?: string) => (id ? state.members.find((m) => m.id === id)?.name ?? '—' : '—');

  return (
    <div className="table-scroll">
      <table className={compact ? undefined : 'table-wide'}>
        <thead>
          <tr>
            <th>Дата</th>
            <th>Категория</th>
            <th>Описание</th>
            <th>Кто</th>
            {!compact && <th>Способ</th>}
            {!compact && <th></th>}
            <th className="r">Сумма</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => {
            const cat = catById(state, t.categoryId);
            return (
              <tr key={t.id}>
                <td className="muted money">{fmtDayShort(t.date)}</td>
                <td><CatChip category={cat} /></td>
                <td>
                  {t.description}
                  {t.comment && <div className="muted small">{t.comment}</div>}
                </td>
                <td>{memberName(t.memberId)}</td>
                {!compact && <td className="muted">{payMethodName(t.method)}</td>}
                {!compact && <td>{t.mandatory && t.type === 'expense' ? <span className="mand">обязат.</span> : null}</td>}
                <td className={'r money ' + (t.type === 'income' ? 'pos' : 'neg')}>
                  {t.type === 'income' ? fmtSigned(t.amount, currency) : '−' + fmtMoney(t.amount, currency)}
                </td>
                <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <button className="row-menu" title="Редактировать" onClick={() => openQuickAdd({ editId: t.id })}>✏️</button>
                  <button
                    className="row-menu"
                    title="Дублировать"
                    onClick={() => { dispatch({ type: 'tx/duplicate', id: t.id }); toast('Операция продублирована'); }}
                  >⧉</button>
                  <DeleteBtn onDelete={() => { dispatch({ type: 'tx/delete', id: t.id }); toast('Операция удалена'); }} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
