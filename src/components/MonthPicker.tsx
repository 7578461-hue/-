import { useMemo, useRef, useState, useEffect } from 'react';
import { MONTHS_RU, currentMonth, monthTitle } from '../lib/format';
import { useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { monthsWithData } from '../state/selectors';

export function MonthPicker() {
  const { month, setMonth } = useUi();
  const state = useAppState();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(month.slice(0, 4)));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setYear(Number(month.slice(0, 4))), [month]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const withData = useMemo(() => new Set(monthsWithData(state)), [state]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-ghost" style={{ fontWeight: 600, color: 'var(--ink)' }} onClick={() => setOpen(!open)}>
        {monthTitle(month)} <span className="muted">▾</span>
      </button>
      {open && (
        <div
          className="card"
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60, width: 280, boxShadow: 'var(--shadow-pop)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setYear(year - 1)} aria-label="Предыдущий год">‹</button>
            <b style={{ flex: 1, textAlign: 'center' }}>{year}</b>
            <button className="btn btn-ghost btn-sm" onClick={() => setYear(year + 1)} aria-label="Следующий год">›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {MONTHS_RU.map((name, i) => {
              const key = `${year}-${String(i + 1).padStart(2, '0')}`;
              const active = key === month;
              return (
                <button
                  key={key}
                  className={'btn btn-sm ' + (active ? 'btn-accent' : 'btn-ghost')}
                  style={{ justifyContent: 'center', position: 'relative' }}
                  onClick={() => { setMonth(key); setOpen(false); }}
                >
                  {name.slice(0, 3)}
                  {withData.has(key) && !active && (
                    <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />
                  )}
                </button>
              );
            })}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            onClick={() => { setMonth(currentMonth()); setOpen(false); }}
          >
            Текущий месяц
          </button>
        </div>
      )}
    </div>
  );
}
