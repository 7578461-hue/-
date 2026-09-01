// Модель данных приложения.
// Единственный источник правды о деньгах — список операций (Transaction).
// Всё остальное (остатки по кредитам, прогресс целей, статусы платежей,
// использование лимитов) вычисляется из операций селекторами.

export type TxType = 'income' | 'expense';
export type PayMethod = 'card' | 'cash' | 'transfer' | 'other';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  /** 'YYYY-MM-DD' */
  date: string;
  categoryId: string;
  description: string;
  /** кто из семьи потратил/получил */
  memberId?: string;
  method: PayMethod;
  mandatory: boolean;
  comment?: string;
  /** связь с сотрудником — выплата персоналу */
  employeeId?: string;
  /** связь с кредитом — платёж уменьшает остаток долга */
  debtId?: string;
  /** связь с целью — взнос увеличивает накопленное */
  goalId?: string;
  /** связь с регулярным платежом — закрывает его в месяце операции */
  recurringId?: string;
  demo?: boolean;
}

export type GroupKey =
  | 'income'
  | 'family'
  | 'housing'
  | 'staff'
  | 'transport'
  | 'credit'
  | 'savings'
  | 'personal'
  | 'subscriptions'
  | 'entertainment'
  | 'other';

export interface Category {
  id: string;
  name: string;
  type: TxType;
  group: GroupKey;
  icon: string;
  custom?: boolean;
  demo?: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  demo?: boolean;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  /** оклад в месяц */
  salary: number;
  /** день выплаты, 1–28 */
  payDay: number;
  active: boolean;
  notes?: string;
  demo?: boolean;
}

export type RecurringKind = 'rent' | 'utility' | 'subscription' | 'credit' | 'other';

export interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  /** день месяца, 1–28 */
  day: number;
  categoryId: string;
  kind: RecurringKind;
  demo?: boolean;
}

export interface Debt {
  id: string;
  name: string;
  /** общая сумма кредита/долга */
  total: number;
  /** остаток на момент добавления в приложение */
  startBalance: number;
  monthlyPayment: number;
  payDay: number;
  /** ставка, % годовых */
  rate: number;
  demo?: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  target: number;
  /** накоплено до начала учёта в приложении */
  startSaved: number;
  demo?: boolean;
}

export interface BudgetLimit {
  id: string;
  kind: 'group' | 'category';
  /** GroupKey либо id категории */
  targetId: string;
  amount: number;
}

export interface MonthBudget {
  /** общий лимит месяца */
  total?: number;
  limits: BudgetLimit[];
}

export interface Settings {
  /** ISO-код основной валюты: RUB, USD, EUR… */
  currency: string;
  onboarded: boolean;
  /** в данных есть загруженный демонабор */
  hasDemo: boolean;
  /** месяцы, для которых демонабор создал бюджеты и планы */
  demoMonths?: string[];
}

export interface AppState {
  schema: number;
  settings: Settings;
  members: FamilyMember[];
  categories: Category[];
  transactions: Transaction[];
  employees: Employee[];
  recurring: RecurringPayment[];
  debts: Debt[];
  goals: SavingsGoal[];
  /** ключ — месяц 'YYYY-MM'; если месяц не задан, наследуется последний предыдущий */
  budgets: Record<string, MonthBudget>;
  /** план доходов: месяц -> id категории -> сумма; наследуется как бюджеты */
  incomePlans: Record<string, Record<string, number>>;
}

export type PaymentStatus = 'paid' | 'soon' | 'overdue' | 'upcoming';

export interface ScheduledPayment {
  key: string;
  source: 'recurring' | 'employee' | 'debt';
  refId: string;
  name: string;
  subtitle: string;
  amount: number;
  day: number;
  /** 'YYYY-MM-DD' в месяце расчёта */
  date: string;
  categoryId: string;
  group: GroupKey;
  paidAmount: number;
  status: PaymentStatus;
}
