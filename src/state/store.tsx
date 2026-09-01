// Хранилище приложения: React-контекст + reducer.
// Persist-слой вынесен в StorageAdapter, чтобы в будущем заменить
// localStorage на серверную базу или синхронизацию без переписывания UI.

import { createContext, useContext, useEffect, useReducer, type ReactNode, type Dispatch } from 'react';
import type {
  AppState, Category, Debt, Employee, FamilyMember, MonthBudget,
  RecurringPayment, SavingsGoal, Transaction,
} from '../types';
import { DEFAULT_CATEGORIES } from '../data/catalog';
import { buildDemo } from '../data/demo';
import { currentMonth } from '../lib/format';
import { uid } from '../lib/id';

const STORAGE_KEY = 'family-budget:v1';
export const SCHEMA_VERSION = 1;

export interface StorageAdapter {
  load(): AppState | null;
  save(state: AppState): void;
}

export const localStorageAdapter: StorageAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || typeof parsed.schema !== 'number') return null;
      return parsed as AppState;
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // приватный режим или переполнение — приложение продолжает работать в памяти
    }
  },
};

export function emptyState(): AppState {
  return {
    schema: SCHEMA_VERSION,
    settings: { currency: 'RUB', onboarded: false, hasDemo: false },
    members: [{ id: 'me', name: 'Я' }],
    categories: [...DEFAULT_CATEGORIES],
    transactions: [],
    employees: [],
    recurring: [],
    debts: [],
    goals: [],
    budgets: {},
    incomePlans: {},
  };
}

/** привести загруженное состояние к текущей схеме, добавить недостающие категории */
export function migrate(loaded: AppState): AppState {
  const base = emptyState();
  const state: AppState = { ...base, ...loaded, settings: { ...base.settings, ...loaded.settings } };
  const have = new Set(state.categories.map((c) => c.id));
  for (const c of DEFAULT_CATEGORIES) if (!have.has(c.id)) state.categories.push(c);
  if (!state.members.some((m) => m.id === 'me')) state.members.unshift({ id: 'me', name: 'Я' });
  state.schema = SCHEMA_VERSION;
  return state;
}

export type Action =
  | { type: 'onboard'; currency: string; withDemo: boolean }
  | { type: 'tx/add'; tx: Transaction }
  | { type: 'tx/update'; tx: Transaction }
  | { type: 'tx/delete'; id: string }
  | { type: 'tx/duplicate'; id: string }
  | { type: 'employee/upsert'; employee: Employee }
  | { type: 'employee/delete'; id: string }
  | { type: 'recurring/upsert'; item: RecurringPayment }
  | { type: 'recurring/delete'; id: string }
  | { type: 'debt/upsert'; debt: Debt }
  | { type: 'debt/delete'; id: string }
  | { type: 'goal/upsert'; goal: SavingsGoal }
  | { type: 'goal/delete'; id: string }
  | { type: 'member/upsert'; member: FamilyMember }
  | { type: 'member/delete'; id: string }
  | { type: 'category/add'; category: Category }
  | { type: 'budget/set'; month: string; budget: MonthBudget }
  | { type: 'incomePlan/set'; month: string; plans: Record<string, number> }
  | { type: 'settings/currency'; currency: string }
  | { type: 'demo/load' }
  | { type: 'demo/clear' }
  | { type: 'data/clearAll' }
  | { type: 'data/import'; state: AppState };

const upsert = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

function clearDemo(state: AppState): AppState {
  const budgets = { ...state.budgets };
  const incomePlans = { ...state.incomePlans };
  for (const m of state.settings.demoMonths ?? []) {
    delete budgets[m];
    delete incomePlans[m];
  }
  return {
    ...state,
    settings: { ...state.settings, hasDemo: false, demoMonths: undefined },
    members: state.members.filter((x) => !x.demo),
    categories: state.categories.filter((x) => !x.demo),
    transactions: state.transactions.filter((x) => !x.demo),
    employees: state.employees.filter((x) => !x.demo),
    recurring: state.recurring.filter((x) => !x.demo),
    debts: state.debts.filter((x) => !x.demo),
    goals: state.goals.filter((x) => !x.demo),
    budgets,
    incomePlans,
  };
}

function loadDemo(state: AppState): AppState {
  const s = clearDemo(state);
  const d = buildDemo(currentMonth());
  return {
    ...s,
    settings: { ...s.settings, hasDemo: true, demoMonths: d.demoMonths },
    members: [...s.members, ...d.members],
    transactions: [...s.transactions, ...d.transactions],
    employees: [...s.employees, ...d.employees],
    recurring: [...s.recurring, ...d.recurring],
    debts: [...s.debts, ...d.debts],
    goals: [...s.goals, ...d.goals],
    budgets: { ...d.budgets, ...s.budgets },
    incomePlans: { ...d.incomePlans, ...s.incomePlans },
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'onboard': {
      const next: AppState = {
        ...state,
        settings: { ...state.settings, currency: action.currency, onboarded: true },
      };
      return action.withDemo ? loadDemo(next) : next;
    }
    case 'tx/add':
      return { ...state, transactions: [...state.transactions, action.tx] };
    case 'tx/update':
      return { ...state, transactions: state.transactions.map((t) => (t.id === action.tx.id ? action.tx : t)) };
    case 'tx/delete':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };
    case 'tx/duplicate': {
      const src = state.transactions.find((t) => t.id === action.id);
      if (!src) return state;
      const copy: Transaction = { ...src, id: uid('tx'), demo: undefined, description: src.description + ' (копия)' };
      return { ...state, transactions: [...state.transactions, copy] };
    }
    case 'employee/upsert':
      return { ...state, employees: upsert(state.employees, action.employee) };
    case 'employee/delete':
      return { ...state, employees: state.employees.filter((e) => e.id !== action.id) };
    case 'recurring/upsert':
      return { ...state, recurring: upsert(state.recurring, action.item) };
    case 'recurring/delete':
      return { ...state, recurring: state.recurring.filter((r) => r.id !== action.id) };
    case 'debt/upsert':
      return { ...state, debts: upsert(state.debts, action.debt) };
    case 'debt/delete':
      return { ...state, debts: state.debts.filter((d) => d.id !== action.id) };
    case 'goal/upsert':
      return { ...state, goals: upsert(state.goals, action.goal) };
    case 'goal/delete':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'member/upsert':
      return { ...state, members: upsert(state.members, action.member) };
    case 'member/delete':
      return { ...state, members: state.members.filter((m) => m.id !== action.id) };
    case 'category/add':
      return { ...state, categories: [...state.categories, action.category] };
    case 'budget/set':
      return { ...state, budgets: { ...state.budgets, [action.month]: action.budget } };
    case 'incomePlan/set':
      return { ...state, incomePlans: { ...state.incomePlans, [action.month]: action.plans } };
    case 'settings/currency':
      return { ...state, settings: { ...state.settings, currency: action.currency } };
    case 'demo/load':
      return loadDemo(state);
    case 'demo/clear':
      return clearDemo(state);
    case 'data/clearAll':
      return { ...emptyState(), settings: { ...emptyState().settings, currency: state.settings.currency, onboarded: true } };
    case 'data/import':
      return migrate(action.state);
    default:
      return state;
  }
}

const StateCtx = createContext<AppState | null>(null);
const DispatchCtx = createContext<Dispatch<Action> | null>(null);

export function AppProvider({ children, adapter = localStorageAdapter }: { children: ReactNode; adapter?: StorageAdapter }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const loaded = adapter.load();
    return loaded ? migrate(loaded) : emptyState();
  });

  useEffect(() => {
    adapter.save(state);
  }, [state, adapter]);

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useAppState(): AppState {
  const s = useContext(StateCtx);
  if (!s) throw new Error('useAppState вне AppProvider');
  return s;
}

export function useAppDispatch(): Dispatch<Action> {
  const d = useContext(DispatchCtx);
  if (!d) throw new Error('useAppDispatch вне AppProvider');
  return d;
}
