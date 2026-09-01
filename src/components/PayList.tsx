// Список запланированных платежей со статусами и кнопкой «Оплатить».
// «Оплатить» открывает форму операции с предзаполнением и нужной связью,
// после сохранения платёж автоматически считается закрытым.

import type { ScheduledPayment } from '../types';
import { fmtDayLong, fmtMoney } from '../lib/format';
import { useUi } from '../state/ui';
import { Empty, StatusDot, StatusPill } from './ui';

export function PayList({ items, currency, emptyText }: {
  items: ScheduledPayment[];
  currency: string;
  emptyText?: string;
}) {
  const { openQuickAdd } = useUi();

  if (items.length === 0) {
    return <Empty icon="📅" text={emptyText ?? 'Платежей нет'} />;
  }

  const pay = (p: ScheduledPayment) => {
    const remaining = Math.max(p.amount - p.paidAmount, 0) || p.amount;
    openQuickAdd({
      type: 'expense',
      amount: Math.round(remaining * 100) / 100,
      categoryId: p.categoryId,
      description: p.name,
      date: p.date,
      mandatory: true,
      method: 'transfer',
      employeeId: p.source === 'employee' ? p.refId : undefined,
      debtId: p.source === 'debt' ? p.refId : undefined,
      recurringId: p.source === 'recurring' ? p.refId : undefined,
    });
  };

  return (
    <div>
      {items.map((p) => (
        <div key={p.key + p.date} className="pay-row">
          <StatusDot status={p.status} />
          <div className="grow">
            <b>{p.name}</b>
            <div className="muted small">
              {fmtDayLong(p.date)} · {p.subtitle}
              {p.status !== 'paid' && p.paidAmount > 0 && <> · оплачено {fmtMoney(p.paidAmount, currency)}</>}
            </div>
          </div>
          <span className="money" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtMoney(p.amount, currency)}</span>
          {p.status === 'paid'
            ? <StatusPill status="paid" />
            : <button className="btn btn-ghost btn-sm" onClick={() => pay(p)}>Оплатить</button>}
        </div>
      ))}
    </div>
  );
}
