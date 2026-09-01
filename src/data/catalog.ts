import type { Category, GroupKey, PayMethod, TxType } from '../types';

export interface GroupInfo {
  key: GroupKey;
  name: string;
  icon: string;
}

// Порядок групп в диаграммах фиксированный — цвет закреплён за группой навсегда.
export const GROUPS: GroupInfo[] = [
  { key: 'income', name: 'Доходы', icon: '💰' },
  { key: 'family', name: 'Семья', icon: '👨‍👩‍👧' },
  { key: 'housing', name: 'Жильё', icon: '🏠' },
  { key: 'staff', name: 'Персонал', icon: '👥' },
  { key: 'transport', name: 'Транспорт', icon: '🚗' },
  { key: 'credit', name: 'Кредиты и долги', icon: '🏦' },
  { key: 'savings', name: 'Накопления', icon: '🎯' },
  { key: 'personal', name: 'Личные', icon: '🧍' },
  { key: 'subscriptions', name: 'Подписки', icon: '📺' },
  { key: 'entertainment', name: 'Развлечения', icon: '🎉' },
  { key: 'other', name: 'Прочее', icon: '📦' },
];

export const groupInfo = (key: GroupKey): GroupInfo =>
  GROUPS.find((g) => g.key === key) ?? GROUPS[GROUPS.length - 1];

export const DEFAULT_CATEGORIES: Category[] = [
  // Доходы
  { id: 'inc-my-salary', name: 'Моя зарплата', type: 'income', group: 'income', icon: '💼' },
  { id: 'inc-spouse', name: 'Доход супруга/супруги', type: 'income', group: 'income', icon: '👔' },
  { id: 'inc-business', name: 'Бизнес', type: 'income', group: 'income', icon: '🏢' },
  { id: 'inc-extra', name: 'Дополнительный доход', type: 'income', group: 'income', icon: '🪙' },
  { id: 'inc-invest', name: 'Инвестиции', type: 'income', group: 'income', icon: '📈' },
  { id: 'inc-refund', name: 'Возвраты', type: 'income', group: 'income', icon: '↩️' },
  { id: 'inc-other', name: 'Другие поступления', type: 'income', group: 'income', icon: '💸' },

  // Семья
  { id: 'fam-groceries', name: 'Продукты', type: 'expense', group: 'family', icon: '🛒' },
  { id: 'fam-kids', name: 'Дети', type: 'expense', group: 'family', icon: '🧒' },
  { id: 'fam-school', name: 'Школа и образование', type: 'expense', group: 'family', icon: '🎓' },
  { id: 'fam-health', name: 'Здоровье', type: 'expense', group: 'family', icon: '🩺' },
  { id: 'fam-pharmacy', name: 'Лекарства', type: 'expense', group: 'family', icon: '💊' },
  { id: 'fam-clothes', name: 'Одежда', type: 'expense', group: 'family', icon: '👕' },
  { id: 'fam-shopping', name: 'Семейные покупки', type: 'expense', group: 'family', icon: '🛍️' },
  { id: 'fam-vacation', name: 'Отдых', type: 'expense', group: 'family', icon: '🏖️' },
  { id: 'fam-restaurants', name: 'Рестораны', type: 'expense', group: 'family', icon: '🍽️' },
  { id: 'fam-fun', name: 'Развлечения для семьи', type: 'expense', group: 'family', icon: '🎠' },
  { id: 'fam-other', name: 'Прочее — семья', type: 'expense', group: 'family', icon: '📦' },

  // Жильё
  { id: 'hou-rent', name: 'Аренда', type: 'expense', group: 'housing', icon: '🔑' },
  { id: 'hou-utilities', name: 'Коммунальные услуги', type: 'expense', group: 'housing', icon: '🧾' },
  { id: 'hou-electricity', name: 'Электричество', type: 'expense', group: 'housing', icon: '💡' },
  { id: 'hou-water', name: 'Вода', type: 'expense', group: 'housing', icon: '🚰' },
  { id: 'hou-internet', name: 'Интернет', type: 'expense', group: 'housing', icon: '🌐' },
  { id: 'hou-phone', name: 'Телефон', type: 'expense', group: 'housing', icon: '📱' },
  { id: 'hou-repair', name: 'Ремонт', type: 'expense', group: 'housing', icon: '🔨' },
  { id: 'hou-furniture', name: 'Мебель', type: 'expense', group: 'housing', icon: '🛋️' },
  { id: 'hou-goods', name: 'Товары для дома', type: 'expense', group: 'housing', icon: '🧴' },
  { id: 'hou-other', name: 'Прочее — жильё', type: 'expense', group: 'housing', icon: '📦' },

  // Персонал
  { id: 'stf-salary', name: 'Зарплата персонала', type: 'expense', group: 'staff', icon: '💵' },
  { id: 'stf-advance', name: 'Аванс', type: 'expense', group: 'staff', icon: '💴' },
  { id: 'stf-premium', name: 'Премия', type: 'expense', group: 'staff', icon: '🏅' },
  { id: 'stf-bonus', name: 'Бонус', type: 'expense', group: 'staff', icon: '🎁' },
  { id: 'stf-nanny', name: 'Няня', type: 'expense', group: 'staff', icon: '🍼' },
  { id: 'stf-housekeeper', name: 'Домработница', type: 'expense', group: 'staff', icon: '🧹' },
  { id: 'stf-driver', name: 'Водитель', type: 'expense', group: 'staff', icon: '🚘' },
  { id: 'stf-assistant', name: 'Помощник', type: 'expense', group: 'staff', icon: '🧑‍💼' },
  { id: 'stf-other-staff', name: 'Другой персонал', type: 'expense', group: 'staff', icon: '👤' },
  { id: 'stf-tax', name: 'Налоги за персонал', type: 'expense', group: 'staff', icon: '🧾' },
  { id: 'stf-fees', name: 'Взносы за персонал', type: 'expense', group: 'staff', icon: '📄' },
  { id: 'stf-other', name: 'Прочее — персонал', type: 'expense', group: 'staff', icon: '📦' },

  // Транспорт
  { id: 'trn-fuel', name: 'Топливо', type: 'expense', group: 'transport', icon: '⛽' },
  { id: 'trn-taxi', name: 'Такси', type: 'expense', group: 'transport', icon: '🚕' },
  { id: 'trn-public', name: 'Общественный транспорт', type: 'expense', group: 'transport', icon: '🚌' },
  { id: 'trn-parking', name: 'Парковка', type: 'expense', group: 'transport', icon: '🅿️' },
  { id: 'trn-service', name: 'Обслуживание автомобиля', type: 'expense', group: 'transport', icon: '🔧' },
  { id: 'trn-repair', name: 'Ремонт автомобиля', type: 'expense', group: 'transport', icon: '🛠️' },
  { id: 'trn-insurance', name: 'Страховка', type: 'expense', group: 'transport', icon: '🛡️' },
  { id: 'trn-fines', name: 'Штрафы', type: 'expense', group: 'transport', icon: '🚨' },
  { id: 'trn-other', name: 'Прочее — транспорт', type: 'expense', group: 'transport', icon: '📦' },

  // Кредиты и долги
  { id: 'crd-payment', name: 'Платёж по кредиту', type: 'expense', group: 'credit', icon: '🏦' },
  { id: 'crd-debt', name: 'Возврат долга', type: 'expense', group: 'credit', icon: '🤝' },

  // Накопления
  { id: 'sav-goal', name: 'Взнос в накопления', type: 'expense', group: 'savings', icon: '🎯' },

  // Личные
  { id: 'per-me', name: 'Личные расходы', type: 'expense', group: 'personal', icon: '🧍' },
  { id: 'per-beauty', name: 'Красота и уход', type: 'expense', group: 'personal', icon: '💇' },
  { id: 'per-hobby', name: 'Хобби', type: 'expense', group: 'personal', icon: '🎨' },
  { id: 'per-sport', name: 'Спорт', type: 'expense', group: 'personal', icon: '🏋️' },

  // Подписки
  { id: 'sub-digital', name: 'Подписки', type: 'expense', group: 'subscriptions', icon: '📺' },

  // Развлечения
  { id: 'ent-fun', name: 'Развлечения', type: 'expense', group: 'entertainment', icon: '🎉' },
  { id: 'ent-cinema', name: 'Кино и концерты', type: 'expense', group: 'entertainment', icon: '🎬' },

  // Прочее
  { id: 'oth-gifts', name: 'Подарки', type: 'expense', group: 'other', icon: '🎁' },
  { id: 'oth-charity', name: 'Благотворительность', type: 'expense', group: 'other', icon: '💝' },
  { id: 'oth-other', name: 'Прочее', type: 'expense', group: 'other', icon: '📦' },
];

export const PAY_METHODS: { key: PayMethod; name: string }[] = [
  { key: 'card', name: 'Карта' },
  { key: 'cash', name: 'Наличные' },
  { key: 'transfer', name: 'Перевод' },
  { key: 'other', name: 'Другое' },
];

export const payMethodName = (key: PayMethod): string =>
  PAY_METHODS.find((m) => m.key === key)?.name ?? key;

export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'RUB', label: '₽ — российский рубль' },
  { code: 'USD', label: '$ — доллар США' },
  { code: 'EUR', label: '€ — евро' },
  { code: 'KZT', label: '₸ — казахстанский тенге' },
  { code: 'BYN', label: 'Br — белорусский рубль' },
  { code: 'UAH', label: '₴ — украинская гривна' },
  { code: 'UZS', label: 'сум — узбекский сум' },
  { code: 'AMD', label: '֏ — армянский драм' },
  { code: 'GEL', label: '₾ — грузинский лари' },
  { code: 'AED', label: 'د.إ — дирхам ОАЭ' },
  { code: 'TRY', label: '₺ — турецкая лира' },
  { code: 'GBP', label: '£ — фунт стерлингов' },
  { code: 'CNY', label: '¥ — китайский юань' },
];

export const typeName = (t: TxType) => (t === 'income' ? 'Доход' : 'Расход');
