// Форматирование денег и дат. Все суммы выводятся в валюте из настроек.

const moneyCache = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string, digits: number): Intl.NumberFormat {
  const key = `${currency}:${digits}`;
  let f = moneyCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      });
    } catch {
      f = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits });
    }
    moneyCache.set(key, f);
  }
  return f;
}

export function fmtMoney(n: number, currency: string): string {
  const digits = Number.isInteger(Math.round(n * 100) / 100) && Number.isInteger(n) ? 0 : 2;
  return moneyFormatter(currency, digits).format(n);
}

/** со знаком: +12 300 ₽ / −4 500 ₽ */
export function fmtSigned(n: number, currency: string): string {
  const s = fmtMoney(Math.abs(n), currency);
  return (n >= 0 ? '+' : '−') + s;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n);
}

/** компактно для осей графиков: 65 000 -> 65 тыс. */
export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return fmtNum(n / 1_000_000) + ' млн';
  if (Math.abs(n) >= 10_000) return fmtNum(Math.round(n / 1000)) + ' тыс.';
  return fmtNum(n);
}

export const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

export const MONTHS_RU_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** '2026-09' -> 'Сентябрь 2026' */
export function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_RU[m - 1]} ${y}`;
}

/** '2026-09' -> 'сентябрь' */
export function monthName(month: string): string {
  const m = Number(month.split('-')[1]);
  return MONTHS_RU[m - 1].toLowerCase();
}

export function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** '2026-09-05' -> '05.09' */
export function fmtDayShort(date: string): string {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`;
}

/** '2026-09-05' -> '5 сентября' */
export function fmtDayLong(date: string): string {
  const m = Number(date.slice(5, 7));
  return `${Number(date.slice(8, 10))} ${MONTHS_RU_GEN[m - 1]}`;
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (d === 1) return one;
  if (d >= 2 && d <= 4) return few;
  return many;
}

/** процент 0..∞ -> '80%' */
export function fmtPct(ratio: number): string {
  return Math.round(ratio * 100) + '%';
}
