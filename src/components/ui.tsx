// Мелкие переиспользуемые элементы интерфейса.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PaymentStatus } from '../types';

export function Modal({ title, onClose, children, footer }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={'field' + (className ? ' ' + className : '')}>
      <label>{label}</label>
      {children}
    </div>
  );
}

/** Кнопка удаления с подтверждением вторым нажатием (window.confirm недоступен в песочнице). */
export function ConfirmDelete({ onConfirm, label = 'Удалить', small }: { onConfirm: () => void; label?: string; small?: boolean }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const cls = 'btn btn-danger' + (small ? ' btn-sm' : '');
  if (!armed) {
    return (
      <button
        className={cls}
        onClick={() => {
          setArmed(true);
          timer.current = window.setTimeout(() => setArmed(false), 3000);
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <button className={cls} style={{ fontWeight: 700 }} onClick={onConfirm}>
      Точно {label.toLowerCase()}?
    </button>
  );
}

export function Meter({ ratio, tone }: { ratio: number; tone?: 'accent' | 'good' | 'warn' | 'over' }) {
  const level = tone ?? (ratio > 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'accent');
  const width = Math.max(Math.min(ratio, 1) * 100, ratio > 0 ? 2 : 0);
  return (
    <div className={'meter' + (level === 'accent' ? '' : ' ' + level)}>
      <i style={{ width: width + '%' }} />
    </div>
  );
}

const STATUS_META: Record<PaymentStatus, { cls: string; label: string }> = {
  paid: { cls: 'g', label: 'оплачено' },
  soon: { cls: 'y', label: 'скоро' },
  overdue: { cls: 'r', label: 'просрочено' },
  upcoming: { cls: 'n', label: 'ожидается' },
};

export function StatusPill({ status }: { status: PaymentStatus }) {
  const m = STATUS_META[status];
  return <span className={'pill ' + m.cls}>{m.label}</span>;
}

export function StatusDot({ status }: { status: PaymentStatus }) {
  return <span className={'dot ' + STATUS_META[status].cls} />;
}

export function Empty({ icon = '🗒️', text, children }: { icon?: string; text: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <p>{text}</p>
      {children && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, valueClass, onClick }: {
  icon: string;
  label: string;
  value: string;
  sub?: ReactNode;
  valueClass?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="cap">{icon} {label}</div>
      <div className={'val money' + (valueClass ? ' ' + valueClass : '')}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </>
  );
  if (onClick) {
    return <button className="card metric metric-btn" onClick={onClick}>{inner}</button>;
  }
  return <div className="card metric">{inner}</div>;
}

export function Delta({ current, prev, invert }: { current: number; prev: number; invert?: boolean }) {
  if (prev <= 0) return null;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return <span className="muted">без изменений</span>;
  const up = pct > 0;
  const good = invert ? !up : up; // для расходов рост — плохо
  return (
    <span className={good ? 'delta-up' : 'delta-down'}>
      {up ? '▲' : '▼'} {up ? '+' : '−'}{Math.abs(pct)}%
    </span>
  );
}
