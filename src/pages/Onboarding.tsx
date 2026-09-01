// Первый запуск: выбор основной валюты и стартового наполнения.

import { useState } from 'react';
import { CURRENCIES } from '../data/catalog';
import { useAppDispatch } from '../state/store';
import { Field } from '../components/ui';

export function Onboarding() {
  const dispatch = useAppDispatch();
  const [currency, setCurrency] = useState('RUB');

  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Первая настройка">
        <div>
          <h3 style={{ fontSize: 18 }}>👋 Добро пожаловать!</h3>
          <p className="muted" style={{ marginTop: 6 }}>
            Это ваш центр контроля личных и семейных финансов: доходы, расходы, персонал,
            кредиты, накопления и бюджеты — в одном месте. Две минуты настройки:
          </p>
        </div>

        <Field label="Основная валюта (можно поменять в настройках)">
          <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>

        <div className="onboard-choice">
          <button onClick={() => dispatch({ type: 'onboard', currency, withDemo: true })}>
            <b>🧪 Посмотреть с демо-данными</b>
            <span className="muted small">
              Приложение наполнится условными тестовыми суммами: удобно осмотреться. Удаляются одной кнопкой.
            </span>
          </button>
          <button onClick={() => dispatch({ type: 'onboard', currency, withDemo: false })}>
            <b>🚀 Начать с чистого листа</b>
            <span className="muted small">
              Пустое приложение: добавьте первую операцию, сотрудников и бюджеты под себя.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
