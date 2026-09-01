// Демонстрационный набор данных. Все суммы условные и помечены demo:true,
// поэтому их можно удалить одной кнопкой в настройках, не трогая свои записи.
// Данные строятся относительно текущего месяца: «этот месяц» + «прошлый месяц».

import type {
  AppState, BudgetLimit, Debt, Employee, FamilyMember, RecurringPayment,
  SavingsGoal, Transaction, PayMethod,
} from '../types';
import { addMonths } from '../lib/format';
import { uid } from '../lib/id';

type Row = [
  day: number,
  categoryId: string,
  amount: number,
  description: string,
  memberId: string | null,
  method: PayMethod,
  mandatory?: 1,
  links?: Partial<Pick<Transaction, 'employeeId' | 'debtId' | 'goalId' | 'recurringId'>>,
];

const lim = (kind: 'group' | 'category', targetId: string, amount: number): BudgetLimit => ({
  id: uid('lim'),
  kind,
  targetId,
  amount,
});

export interface DemoData {
  members: FamilyMember[];
  employees: Employee[];
  recurring: RecurringPayment[];
  debts: Debt[];
  goals: SavingsGoal[];
  transactions: Transaction[];
  budgets: AppState['budgets'];
  incomePlans: AppState['incomePlans'];
  demoMonths: string[];
}

export function buildDemo(baseMonth: string): DemoData {
  const M = baseMonth;
  const P = addMonths(baseMonth, -1);

  const members: FamilyMember[] = [{ id: 'mem-spouse', name: 'Супруга', demo: true }];

  const employees: Employee[] = [
    { id: 'emp-anna', name: 'Анна', position: 'Няня', salary: 45000, payDay: 5, active: true, demo: true },
    { id: 'emp-maria', name: 'Мария', position: 'Домработница', salary: 24000, payDay: 1, active: true, demo: true },
    { id: 'emp-sergey', name: 'Сергей', position: 'Водитель', salary: 30000, payDay: 10, active: true, demo: true },
  ];

  const recurring: RecurringPayment[] = [
    { id: 'rec-rent', name: 'Аренда квартиры', amount: 65000, day: 1, categoryId: 'hou-rent', kind: 'rent', demo: true },
    { id: 'rec-utils', name: 'Коммунальные услуги', amount: 12500, day: 5, categoryId: 'hou-utilities', kind: 'utility', demo: true },
    { id: 'rec-inet', name: 'Интернет', amount: 900, day: 20, categoryId: 'hou-internet', kind: 'utility', demo: true },
    { id: 'rec-cinema', name: 'Онлайн-кинотеатр', amount: 599, day: 3, categoryId: 'sub-digital', kind: 'subscription', demo: true },
    { id: 'rec-music', name: 'Подписка на музыку', amount: 299, day: 25, categoryId: 'sub-digital', kind: 'subscription', demo: true },
    { id: 'rec-insur', name: 'Страховка авто (рассрочка)', amount: 8400, day: 28, categoryId: 'trn-insurance', kind: 'other', demo: true },
  ];

  const debts: Debt[] = [
    { id: 'debt-car', name: 'Автокредит', total: 900000, startBalance: 320000, monthlyPayment: 15200, payDay: 15, rate: 11.9, demo: true },
    { id: 'debt-friend', name: 'Долг за ремонт', total: 60000, startBalance: 40000, monthlyPayment: 10000, payDay: 20, rate: 0, demo: true },
  ];

  const goals: SavingsGoal[] = [
    { id: 'goal-reserve', name: 'Резервный фонд', icon: '🛟', target: 500000, startSaved: 180000, demo: true },
    { id: 'goal-vacation', name: 'Отпуск', icon: '🏖️', target: 250000, startSaved: 64500, demo: true },
    { id: 'goal-car', name: 'Новый автомобиль', icon: '🚗', target: 1500000, startSaved: 210000, demo: true },
  ];

  // -------- операции текущего месяца --------
  const incomeM: Row[] = [
    [1, 'inc-my-salary', 280000, 'Зарплата за прошлый месяц', 'me', 'transfer'],
    [5, 'inc-spouse', 90000, 'Зарплата супруги', 'mem-spouse', 'transfer'],
    [10, 'inc-business', 60000, 'Прибыль из бизнеса', 'me', 'transfer'],
    [18, 'inc-extra', 12000, 'Частная консультация', 'me', 'card'],
    [22, 'inc-refund', 8000, 'Возврат за отменённые билеты', 'me', 'card'],
  ];
  const expenseM: Row[] = [
    [1, 'hou-rent', 65000, 'Аренда квартиры', 'me', 'transfer', 1, { recurringId: 'rec-rent' }],
    [1, 'sav-goal', 20000, 'Взнос — Резервный фонд', 'me', 'transfer', undefined, { goalId: 'goal-reserve' }],
    [1, 'stf-advance', 10000, 'Аванс — Мария', 'me', 'cash', 1, { employeeId: 'emp-maria' }],
    [1, 'stf-salary', 14000, 'Зарплата — Мария, остаток', 'me', 'cash', 1, { employeeId: 'emp-maria' }],
    [1, 'stf-advance', 9000, 'Аванс — Сергей', 'me', 'transfer', 1, { employeeId: 'emp-sergey' }],
    [2, 'fam-groceries', 8400, 'Закупка продуктов на неделю', 'mem-spouse', 'card'],
    [3, 'sub-digital', 599, 'Онлайн-кинотеатр', 'me', 'card', 1, { recurringId: 'rec-cinema' }],
    [4, 'trn-taxi', 1250, 'Поездки по городу', 'mem-spouse', 'card'],
    [5, 'stf-salary', 45000, 'Зарплата — Анна', 'me', 'cash', 1, { employeeId: 'emp-anna' }],
    [5, 'hou-utilities', 12500, 'ЖКУ за прошлый месяц', 'me', 'transfer', 1, { recurringId: 'rec-utils' }],
    [6, 'fam-kids', 3500, 'Кружок рисования', 'mem-spouse', 'card'],
    [7, 'fam-groceries', 6200, 'Продукты', 'mem-spouse', 'card'],
    [8, 'trn-fuel', 3800, 'Заправка', 'me', 'card'],
    [9, 'fam-restaurants', 5400, 'Семейный ужин', 'me', 'card'],
    [10, 'fam-pharmacy', 2300, 'Витамины детям', 'mem-spouse', 'card'],
    [11, 'fam-groceries', 7100, 'Продукты', 'me', 'card'],
    [12, 'oth-gifts', 4000, 'Подарок на день рождения', 'mem-spouse', 'card'],
    [13, 'fam-school', 14800, 'Оплата обучения в школе', 'me', 'transfer', 1],
    [14, 'fam-clothes', 6800, 'Одежда детям', 'mem-spouse', 'card'],
    [15, 'crd-payment', 15200, 'Автокредит — ежемесячный платёж', 'me', 'transfer', 1, { debtId: 'debt-car' }],
    [15, 'trn-parking', 700, 'Парковка в центре', 'me', 'card'],
    [16, 'fam-groceries', 8900, 'Продукты и хозтовары', 'mem-spouse', 'card'],
    [17, 'ent-fun', 2800, 'Парк аттракционов', 'mem-spouse', 'card'],
    [18, 'per-beauty', 4200, 'Салон красоты', 'mem-spouse', 'card'],
    [19, 'trn-fuel', 3600, 'Заправка', 'me', 'card'],
    [20, 'hou-internet', 900, 'Интернет', 'me', 'card', 1, { recurringId: 'rec-inet' }],
    [20, 'sav-goal', 10000, 'Взнос — Отпуск', 'me', 'transfer', undefined, { goalId: 'goal-vacation' }],
    [20, 'fam-groceries', 12600, 'Большая закупка продуктов', 'me', 'card'],
    [21, 'fam-pharmacy', 1800, 'Лекарства', 'me', 'card'],
    [22, 'fam-shopping', 3200, 'Игрушки и мелочи', 'mem-spouse', 'card'],
    [23, 'fam-groceries', 5000, 'Продукты', 'mem-spouse', 'card'],
    [24, 'per-sport', 3000, 'Абонемент в зал', 'me', 'card'],
    [25, 'sub-digital', 299, 'Подписка на музыку', 'me', 'card', 1, { recurringId: 'rec-music' }],
    [26, 'fam-restaurants', 6300, 'Ресторан с друзьями', 'me', 'card'],
    [27, 'trn-fuel', 2900, 'Заправка', 'me', 'card'],
    [27, 'trn-fines', 800, 'Штраф за парковку', 'me', 'card'],
    [28, 'ent-fun', 6500, 'Детский праздник', 'mem-spouse', 'card'],
  ];

  // -------- операции прошлого месяца --------
  const incomeP: Row[] = [
    [1, 'inc-my-salary', 272000, 'Зарплата', 'me', 'transfer'],
    [5, 'inc-spouse', 88000, 'Зарплата супруги', 'mem-spouse', 'transfer'],
    [12, 'inc-business', 52000, 'Прибыль из бизнеса', 'me', 'transfer'],
    [20, 'inc-extra', 20000, 'Разовый проект', 'me', 'transfer'],
  ];
  const expenseP: Row[] = [
    [1, 'hou-rent', 65000, 'Аренда квартиры', 'me', 'transfer', 1, { recurringId: 'rec-rent' }],
    [1, 'stf-advance', 10000, 'Аванс — Мария', 'me', 'cash', 1, { employeeId: 'emp-maria' }],
    [1, 'stf-salary', 14000, 'Зарплата — Мария, остаток', 'me', 'cash', 1, { employeeId: 'emp-maria' }],
    [1, 'stf-advance', 9000, 'Аванс — Сергей', 'me', 'transfer', 1, { employeeId: 'emp-sergey' }],
    [2, 'sav-goal', 15000, 'Взнос — Резервный фонд', 'me', 'transfer', undefined, { goalId: 'goal-reserve' }],
    [3, 'sub-digital', 599, 'Онлайн-кинотеатр', 'me', 'card', 1, { recurringId: 'rec-cinema' }],
    [5, 'stf-salary', 45000, 'Зарплата — Анна', 'me', 'cash', 1, { employeeId: 'emp-anna' }],
    [5, 'hou-utilities', 13200, 'ЖКУ', 'me', 'transfer', 1, { recurringId: 'rec-utils' }],
    [6, 'fam-groceries', 9800, 'Продукты', 'mem-spouse', 'card'],
    [8, 'trn-fuel', 4100, 'Заправка', 'me', 'card'],
    [9, 'fam-kids', 7500, 'Сборы к школе', 'mem-spouse', 'card'],
    [10, 'stf-salary', 21000, 'Зарплата — Сергей, остаток', 'me', 'transfer', 1, { employeeId: 'emp-sergey' }],
    [11, 'fam-groceries', 8300, 'Продукты', 'me', 'card'],
    [12, 'fam-health', 6200, 'Приём врача', 'mem-spouse', 'card'],
    [13, 'fam-restaurants', 4900, 'Обед всей семьёй', 'me', 'card'],
    [15, 'crd-payment', 15200, 'Автокредит — ежемесячный платёж', 'me', 'transfer', 1, { debtId: 'debt-car' }],
    [16, 'fam-groceries', 9400, 'Продукты', 'mem-spouse', 'card'],
    [17, 'fam-school', 9500, 'Учебники и канцелярия', 'me', 'card'],
    [18, 'ent-cinema', 3200, 'Кино', 'mem-spouse', 'card'],
    [19, 'per-me', 5600, 'Личные покупки', 'me', 'card'],
    [20, 'hou-internet', 900, 'Интернет', 'me', 'card', 1, { recurringId: 'rec-inet' }],
    [20, 'crd-debt', 10000, 'Возврат долга за ремонт', 'me', 'cash', 1, { debtId: 'debt-friend' }],
    [21, 'fam-groceries', 7600, 'Продукты', 'mem-spouse', 'card'],
    [22, 'trn-fuel', 3900, 'Заправка', 'me', 'card'],
    [23, 'fam-clothes', 9200, 'Одежда к осени', 'mem-spouse', 'card'],
    [24, 'fam-vacation', 22000, 'Выходные за городом', 'me', 'card'],
    [25, 'sub-digital', 299, 'Подписка на музыку', 'me', 'card', 1, { recurringId: 'rec-music' }],
    [26, 'fam-groceries', 8100, 'Продукты', 'mem-spouse', 'card'],
    [27, 'trn-service', 6700, 'ТО автомобиля', 'me', 'card'],
    [28, 'oth-gifts', 3500, 'Подарок коллеге', 'me', 'card'],
    [29, 'fam-restaurants', 5100, 'Ужин в ресторане', 'me', 'card'],
    [30, 'per-beauty', 3800, 'Салон красоты', 'mem-spouse', 'card'],
  ];

  const toTx = (month: string, type: 'income' | 'expense') => (r: Row): Transaction => ({
    id: uid('tx'),
    type,
    amount: r[2],
    date: `${month}-${String(r[0]).padStart(2, '0')}`,
    categoryId: r[1],
    description: r[3],
    memberId: r[4] ?? undefined,
    method: r[5],
    mandatory: r[6] === 1,
    ...(r[7] ?? {}),
    demo: true,
  });

  const transactions: Transaction[] = [
    ...incomeM.map(toTx(M, 'income')),
    ...expenseM.map(toTx(M, 'expense')),
    ...incomeP.map(toTx(P, 'income')),
    ...expenseP.map(toTx(P, 'expense')),
  ];

  const monthLimits = (): BudgetLimit[] => [
    lim('category', 'fam-groceries', 60000),
    lim('group', 'family', 115000),
    lim('group', 'housing', 100000),
    lim('group', 'staff', 100000),
    lim('group', 'transport', 25000),
    lim('group', 'entertainment', 8000),
    lim('group', 'personal', 20000),
  ];

  const budgets: AppState['budgets'] = {
    [M]: { total: 420000, limits: monthLimits() },
    [P]: { total: 420000, limits: monthLimits() },
  };

  const plan = { 'inc-my-salary': 280000, 'inc-spouse': 90000, 'inc-business': 80000, 'inc-extra': 10000 };
  const incomePlans: AppState['incomePlans'] = { [M]: { ...plan }, [P]: { ...plan } };

  return { members, employees, recurring, debts, goals, transactions, budgets, incomePlans, demoMonths: [M, P] };
}
