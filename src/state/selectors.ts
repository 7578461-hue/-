// Все расчёты приложения — чистые функции над состоянием.
// Компоненты вызывают их через useMemo, поэтому цифры пересчитываются
// автоматически после каждого изменения операций.

import type {
  AppState,
  Category,
  Debt,
  Employee,
  GroupKey,
  MonthBudget,
  PaymentStatus,
  SavingsGoal,
  ScheduledPayment,
  Transaction,
} from '../types';
import { addMonths, daysInMonth, monthKeyOf, todayISO } from '../lib/format';

export const catById = (state: AppState, id: string): Category | undefined =>
  state.categories.find((c) => c.id === id);

export const groupOfTx = (state: AppState, tx: Transaction): GroupKey =>
  catById(state, tx.categoryId)?.group ?? 'other';

export function txsOfMonth(state: AppState, month: string): Transaction[] {
  return state.transactions.filter((t) => monthKeyOf(t.date) === month);
}

export interface MonthTotals {
  income: number;
  expense: number;
  balance: number;
}

export function totals(state: AppState, month: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txsOfMonth(state, month)) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function expenseByGroup(state: AppState, month: string): Record<GroupKey, number> {
  const acc = {} as Record<GroupKey, number>;
  for (const t of txsOfMonth(state, month)) {
    if (t.type !== 'expense') continue;
    const g = groupOfTx(state, t);
    acc[g] = (acc[g] ?? 0) + t.amount;
  }
  return acc;
}

export function expenseByCategory(state: AppState, month: string): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const t of txsOfMonth(state, month)) {
    if (t.type !== 'expense') continue;
    acc[t.categoryId] = (acc[t.categoryId] ?? 0) + t.amount;
  }
  return acc;
}

export function expenseByMember(state: AppState, month: string): { memberId: string; name: string; sum: number }[] {
  const acc: Record<string, number> = {};
  for (const t of txsOfMonth(state, month)) {
    if (t.type !== 'expense') continue;
    const key = t.memberId ?? '';
    acc[key] = (acc[key] ?? 0) + t.amount;
  }
  return Object.entries(acc)
    .map(([memberId, sum]) => ({
      memberId,
      name: memberId ? state.members.find((m) => m.id === memberId)?.name ?? 'Не указан' : 'Не указан',
      sum,
    }))
    .sort((a, b) => b.sum - a.sum);
}

/** расходы по дням месяца: [{day: 1..N, spent}] */
export function dailyExpenses(state: AppState, month: string): { day: number; spent: number }[] {
  const n = daysInMonth(month);
  const arr = Array.from({ length: n }, (_, i) => ({ day: i + 1, spent: 0 }));
  for (const t of txsOfMonth(state, month)) {
    if (t.type !== 'expense') continue;
    const d = Number(t.date.slice(8, 10));
    if (d >= 1 && d <= n) arr[d - 1].spent += t.amount;
  }
  return arr;
}

/** накопленный остаток (доходы − расходы) по дням месяца */
export function balanceSeries(state: AppState, month: string): { day: number; balance: number }[] {
  const n = daysInMonth(month);
  const delta = Array(n + 1).fill(0);
  for (const t of txsOfMonth(state, month)) {
    const d = Number(t.date.slice(8, 10));
    if (d >= 1 && d <= n) delta[d] += t.type === 'income' ? t.amount : -t.amount;
  }
  const out: { day: number; balance: number }[] = [];
  let acc = 0;
  for (let d = 1; d <= n; d++) {
    acc += delta[d];
    out.push({ day: d, balance: Math.round(acc * 100) / 100 });
  }
  return out;
}

export function topExpenses(state: AppState, month: string, n = 5): Transaction[] {
  return txsOfMonth(state, month)
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n);
}

export function mandatorySplit(state: AppState, month: string): { mandatory: number; optional: number } {
  let mandatory = 0;
  let optional = 0;
  for (const t of txsOfMonth(state, month)) {
    if (t.type !== 'expense') continue;
    if (t.mandatory) mandatory += t.amount;
    else optional += t.amount;
  }
  return { mandatory, optional };
}

// ---------- статусы платежей ----------

function paymentStatus(month: string, day: number, isPaid: boolean): PaymentStatus {
  if (isPaid) return 'paid';
  const today = todayISO();
  const tMonth = today.slice(0, 7);
  const tDay = Number(today.slice(8, 10));
  if (month < tMonth) return 'overdue';
  if (month > tMonth) return 'upcoming';
  if (day < tDay) return 'overdue';
  if (day - tDay <= 7) return 'soon';
  return 'upcoming';
}

const dateInMonth = (month: string, day: number) =>
  `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, '0')}`;

/** все запланированные платежи месяца: регулярные + зарплаты персонала + кредиты */
export function scheduledPayments(state: AppState, month: string): ScheduledPayment[] {
  const txs = txsOfMonth(state, month);
  const out: ScheduledPayment[] = [];

  for (const r of state.recurring) {
    const paid = txs.filter((t) => t.recurringId === r.id).reduce((s, t) => s + t.amount, 0);
    const cat = catById(state, r.categoryId);
    const isPaid = paid + 0.005 >= r.amount;
    out.push({
      key: `rec:${r.id}`,
      source: 'recurring',
      refId: r.id,
      name: r.name,
      subtitle: cat?.name ?? 'Платёж',
      amount: r.amount,
      day: r.day,
      date: dateInMonth(month, r.day),
      categoryId: r.categoryId,
      group: cat?.group ?? 'other',
      paidAmount: paid,
      status: paymentStatus(month, r.day, isPaid),
    });
  }

  for (const e of state.employees) {
    if (!e.active || e.salary <= 0) continue;
    const paid = txs.filter((t) => t.employeeId === e.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const isPaid = paid + 0.005 >= e.salary;
    out.push({
      key: `emp:${e.id}`,
      source: 'employee',
      refId: e.id,
      name: `Зарплата — ${e.name}`,
      subtitle: e.position,
      // сумма всегда полная: остаток к выплате считается как amount − paidAmount
      amount: e.salary,
      day: e.payDay,
      date: dateInMonth(month, e.payDay),
      categoryId: 'stf-salary',
      group: 'staff',
      paidAmount: paid,
      status: paymentStatus(month, e.payDay, isPaid),
    });
  }

  for (const d of state.debts) {
    const remaining = debtRemaining(state, d);
    if (remaining <= 0.005) continue;
    const paid = txs.filter((t) => t.debtId === d.id).reduce((s, t) => s + t.amount, 0);
    const planned = Math.min(d.monthlyPayment, remaining + paid);
    const isPaid = paid + 0.005 >= planned;
    out.push({
      key: `debt:${d.id}`,
      source: 'debt',
      refId: d.id,
      name: d.name,
      subtitle: 'Платёж по кредиту',
      amount: planned,
      day: d.payDay,
      date: dateInMonth(month, d.payDay),
      categoryId: 'crd-payment',
      group: 'credit',
      paidAmount: paid,
      status: paymentStatus(month, d.payDay, isPaid),
    });
  }

  return out.sort((a, b) => a.day - b.day);
}

/** виджет «Предстоящие платежи»: неоплаченные текущего месяца + просрочка прошлого */
export function upcomingPayments(state: AppState, month: string): ScheduledPayment[] {
  const cur = scheduledPayments(state, month).filter((p) => p.status !== 'paid');
  const prev = scheduledPayments(state, addMonths(month, -1)).filter((p) => p.status === 'overdue');
  return [...prev, ...cur].sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- бюджеты ----------

function inheritMonthly<T>(map: Record<string, T>, month: string, maxBack = 36): { value: T; sourceMonth: string } | null {
  if (map[month]) return { value: map[month], sourceMonth: month };
  let m = month;
  for (let i = 0; i < maxBack; i++) {
    m = addMonths(m, -1);
    if (map[m]) return { value: map[m], sourceMonth: m };
  }
  return null;
}

export function effectiveBudget(state: AppState, month: string): { budget: MonthBudget; sourceMonth: string } | null {
  const found = inheritMonthly(state.budgets, month);
  return found ? { budget: found.value, sourceMonth: found.sourceMonth } : null;
}

export type LimitLevel = 'ok' | 'warn' | 'over';

export interface LimitUsage {
  limitId: string;
  kind: 'group' | 'category';
  targetId: string;
  name: string;
  icon: string;
  group: GroupKey;
  limit: number;
  spent: number;
  ratio: number;
  level: LimitLevel;
}

export const levelOf = (ratio: number): LimitLevel => (ratio > 1 ? 'over' : ratio >= 0.8 ? 'warn' : 'ok');

export function budgetUsage(state: AppState, month: string): LimitUsage[] {
  const eff = effectiveBudget(state, month);
  if (!eff) return [];
  const byGroup = expenseByGroup(state, month);
  const byCat = expenseByCategory(state, month);
  return eff.budget.limits.map((l) => {
    let name = '';
    let icon = '📦';
    let group: GroupKey = 'other';
    let spent = 0;
    if (l.kind === 'group') {
      const g = l.targetId as GroupKey;
      group = g;
      spent = byGroup[g] ?? 0;
      name = groupName(g);
      icon = groupIcon(g);
    } else {
      const cat = catById(state, l.targetId);
      name = cat?.name ?? 'Категория';
      icon = cat?.icon ?? '📦';
      group = cat?.group ?? 'other';
      spent = byCat[l.targetId] ?? 0;
    }
    const ratio = l.amount > 0 ? spent / l.amount : 0;
    return {
      limitId: l.id,
      kind: l.kind,
      targetId: l.targetId,
      name,
      icon,
      group,
      limit: l.amount,
      spent,
      ratio,
      level: levelOf(ratio),
    };
  });
}

// локальные копии, чтобы не тянуть каталог в селекторы циклом
const GROUP_NAMES: Record<GroupKey, string> = {
  income: 'Доходы', family: 'Семья', housing: 'Жильё', staff: 'Персонал',
  transport: 'Транспорт', credit: 'Кредиты и долги', savings: 'Накопления',
  personal: 'Личные', subscriptions: 'Подписки', entertainment: 'Развлечения', other: 'Прочее',
};
const GROUP_ICONS: Record<GroupKey, string> = {
  income: '💰', family: '👨‍👩‍👧', housing: '🏠', staff: '👥', transport: '🚗',
  credit: '🏦', savings: '🎯', personal: '🧍', subscriptions: '📺', entertainment: '🎉', other: '📦',
};
export const groupName = (g: GroupKey) => GROUP_NAMES[g];
export const groupIcon = (g: GroupKey) => GROUP_ICONS[g];

// ---------- цели и кредиты ----------

export function goalSaved(state: AppState, goal: SavingsGoal): number {
  const contributed = state.transactions
    .filter((t) => t.goalId === goal.id && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  return goal.startSaved + contributed;
}

export function debtPaidTotal(state: AppState, debt: Debt): number {
  return state.transactions.filter((t) => t.debtId === debt.id).reduce((s, t) => s + t.amount, 0);
}

export function debtRemaining(state: AppState, debt: Debt): number {
  return Math.max(debt.startBalance - debtPaidTotal(state, debt), 0);
}

// ---------- персонал ----------

export interface StaffRow {
  employee: Employee;
  planned: number;
  paid: number;
  remaining: number;
  status: 'paid' | 'partial' | 'unpaid';
  txs: Transaction[];
}

export function staffMonth(state: AppState, month: string) {
  const txs = txsOfMonth(state, month).filter((t) => t.type === 'expense');
  const rows: StaffRow[] = state.employees
    .filter((e) => e.active)
    .map((e) => {
      const own = txs.filter((t) => t.employeeId === e.id);
      const paid = own.reduce((s, t) => s + t.amount, 0);
      const remaining = Math.max(e.salary - paid, 0);
      return {
        employee: e,
        planned: e.salary,
        paid,
        remaining,
        status: remaining <= 0.005 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        txs: own,
      };
    });
  const groupSpent = txs
    .filter((t) => groupOfTx(state, t) === 'staff')
    .reduce((s, t) => s + t.amount, 0);
  const planned = rows.reduce((s, r) => s + r.planned, 0);
  const remaining = rows.reduce((s, r) => s + r.remaining, 0);
  const staffTxs = txs
    .filter((t) => groupOfTx(state, t) === 'staff' || t.employeeId)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { rows, groupSpent, planned, remaining, staffTxs };
}

// ---------- доходы: план и факт ----------

export interface IncomePlanRow {
  category: Category;
  plan: number;
  fact: number;
  diff: number;
}

export function incomePlanRows(state: AppState, month: string): { rows: IncomePlanRow[]; sourceMonth: string | null } {
  const inh = inheritMonthly(state.incomePlans, month);
  const plans = inh?.value ?? {};
  const byCat = new Map<string, number>();
  for (const t of txsOfMonth(state, month)) {
    if (t.type !== 'income') continue;
    byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + t.amount);
  }
  const rows: IncomePlanRow[] = [];
  for (const cat of state.categories.filter((c) => c.type === 'income')) {
    const plan = plans[cat.id] ?? 0;
    const fact = byCat.get(cat.id) ?? 0;
    if (plan === 0 && fact === 0) continue;
    rows.push({ category: cat, plan, fact, diff: fact - plan });
  }
  rows.sort((a, b) => b.fact - a.fact || b.plan - a.plan);
  return { rows, sourceMonth: inh?.sourceMonth ?? null };
}

/** есть ли в месяце хоть одна операция */
export function monthHasData(state: AppState, month: string): boolean {
  return state.transactions.some((t) => monthKeyOf(t.date) === month);
}

/** список месяцев, в которых есть операции (по убыванию) */
export function monthsWithData(state: AppState): string[] {
  const set = new Set<string>();
  for (const t of state.transactions) set.add(monthKeyOf(t.date));
  return [...set].sort().reverse();
}
