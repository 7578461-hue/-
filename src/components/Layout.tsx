import { type ReactNode } from 'react';
import { PAGES, useUi } from '../state/ui';
import { MonthPicker } from './MonthPicker';

export function Layout({ children }: { children: ReactNode }) {
  const { page, navigate, openQuickAdd, toasts, menuOpen, setMenuOpen } = useUi();

  return (
    <div className="app">
      <aside className={'sidebar' + (menuOpen ? ' open' : '')} aria-label="Основное меню">
        <div className="logo"><span className="coin">₿</span> Семейный бюджет</div>
        {PAGES.map((p) => (
          <span key={p.key}>
            {p.key === 'settings' && <div className="nav-sep" />}
            <button
              className={'nav-item' + (page === p.key ? ' active' : '')}
              onClick={() => navigate(p.key)}
              aria-current={page === p.key ? 'page' : undefined}
            >
              <span className="ico">{p.icon}</span> {p.name}
            </button>
          </span>
        ))}
      </aside>
      <div className={'backdrop' + (menuOpen ? ' show' : '')} onClick={() => setMenuOpen(false)} />

      <div className="main">
        <div className="topbar">
          <button className="burger" onClick={() => setMenuOpen(true)} aria-label="Открыть меню">☰</button>
          <MonthPicker />
          <span className="spacer" />
          <button className="btn btn-accent hide-mobile" onClick={() => openQuickAdd()}>＋ Добавить операцию</button>
        </div>
        <div className="content">{children}</div>
      </div>

      <button className="fab" onClick={() => openQuickAdd()} aria-label="Добавить операцию">＋</button>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
      </div>
    </div>
  );
}
