// Цвета графиков подобраны и провалидированы для светлой и тёмной темы.
// Recharts не умеет CSS-переменные в атрибутах SVG, поэтому конкретные
// hex-значения выбираются на лету по активной теме.

import { useEffect, useState } from 'react';
import type { GroupKey } from '../types';

export interface ChartTheme {
  dark: boolean;
  groups: Record<GroupKey, string>;
  good: string;
  bad: string;
  warn: string;
  accent: string;
  neutral: string;
  ink2: string;
  ink3: string;
  grid: string;
  axis: string;
  card: string;
}

const LIGHT: ChartTheme = {
  dark: false,
  groups: {
    income: '#0ca30c',
    family: '#2a78d6',
    housing: '#eb6834',
    staff: '#1baf7a',
    transport: '#eda100',
    credit: '#e87ba4',
    savings: '#008300',
    personal: '#4a3aa7',
    subscriptions: '#7a8699',
    entertainment: '#e34948',
    other: '#8f8d84',
  },
  good: '#0ca30c',
  bad: '#d03b3b',
  warn: '#fab219',
  accent: '#2062c8',
  neutral: '#c3c2b7',
  ink2: '#52514e',
  ink3: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  card: '#fdfdfb',
};

const DARK: ChartTheme = {
  dark: true,
  groups: {
    income: '#0ca30c',
    family: '#3987e5',
    housing: '#d95926',
    staff: '#199e70',
    transport: '#c98500',
    credit: '#d55181',
    savings: '#1d9a1d',
    personal: '#9085e9',
    subscriptions: '#8c99ad',
    entertainment: '#e66767',
    other: '#84827a',
  },
  good: '#0ca30c',
  bad: '#e66767',
  warn: '#fab219',
  accent: '#3f83e8',
  neutral: '#55544f',
  ink2: '#c3c2b7',
  ink3: '#8f8d86',
  grid: '#2c2c2a',
  axis: '#383835',
  card: '#1c1c1a',
};

function detectDark(): boolean {
  if (typeof document === 'undefined') return false;
  const stamped = document.documentElement.getAttribute('data-theme');
  if (stamped === 'dark') return true;
  if (stamped === 'light') return false;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useChartTheme(): ChartTheme {
  const [dark, setDark] = useState(detectDark);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(detectDark());
    mq.addEventListener('change', update);
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq.removeEventListener('change', update);
      obs.disconnect();
    };
  }, []);

  return dark ? DARK : LIGHT;
}
