// UI-состояние, которое не сохраняется между сессиями:
// выбранный месяц, текущая вкладка (hash-роутер), окно быстрого добавления, тосты.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import type { Transaction } from '../types';
import { currentMonth } from '../lib/format';

export type PageKey =
  | 'dashboard' | 'operations' | 'income' | 'plan' | 'family' | 'housing' | 'staff'
  | 'transport' | 'debts' | 'savings' | 'calendar' | 'reports' | 'settings';

export const PAGES: { key: PageKey; name: string; icon: string }[] = [
  { key: 'dashboard', name: 'Главная', icon: '📊' },
  { key: 'operations', name: 'Операции', icon: '💳' },
  { key: 'income', name: 'Доходы', icon: '💰' },
  { key: 'family', name: 'Семья', icon: '👨‍👩‍👧' },
  { key: 'housing', name: 'Жильё', icon: '🏠' },
  { key: 'staff', name: 'Персонал', icon: '👥' },
  { key: 'transport', name: 'Транспорт', icon: '🚗' },
  { key: 'debts', name: 'Кредиты и долги', icon: '🏦' },
  { key: 'savings', name: 'Накопления', icon: '🎯' },
  { key: 'plan', name: 'Бюджет и план', icon: '📋' },
  { key: 'calendar', name: 'Календарь', icon: '📅' },
  { key: 'reports', name: 'Отчёты', icon: '📈' },
  { key: 'settings', name: 'Настройки', icon: '⚙️' },
];

export type QuickAddPrefill = Partial<Transaction> & { editId?: string };

interface Toast {
  id: number;
  text: string;
}

interface UiCtx {
  month: string;
  setMonth: (m: string) => void;
  page: PageKey;
  navigate: (p: PageKey) => void;
  quickAdd: QuickAddPrefill | null;
  openQuickAdd: (prefill?: QuickAddPrefill) => void;
  closeQuickAdd: () => void;
  toasts: Toast[];
  toast: (text: string) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

const Ctx = createContext<UiCtx | null>(null);

const pageFromHash = (): PageKey => {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h === 'budgets') return 'plan'; // старый адрес вкладки «Бюджеты»
  return PAGES.some((p) => p.key === h) ? (h as PageKey) : 'dashboard';
};

export function UiProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(currentMonth());
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const [quickAdd, setQuickAdd] = useState<QuickAddPrefill | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const toastSeq = useRef(0);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((p: PageKey) => {
    window.location.hash = '/' + p;
    setPage(p);
    setMenuOpen(false);
  }, []);

  const openQuickAdd = useCallback((prefill?: QuickAddPrefill) => setQuickAdd(prefill ?? {}), []);
  const closeQuickAdd = useCallback(() => setQuickAdd(null), []);

  const toast = useCallback((text: string) => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo(
    () => ({ month, setMonth, page, navigate, quickAdd, openQuickAdd, closeQuickAdd, toasts, toast, menuOpen, setMenuOpen }),
    [month, page, navigate, quickAdd, openQuickAdd, closeQuickAdd, toasts, toast, menuOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi(): UiCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUi вне UiProvider');
  return v;
}
