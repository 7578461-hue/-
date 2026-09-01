import { useMemo, useState } from 'react';
import type { AppState, FamilyMember, GroupKey } from '../types';
import { CURRENCIES, GROUPS } from '../data/catalog';
import { uid } from '../lib/id';
import { useAppDispatch, useAppState } from '../state/store';
import { useUi } from '../state/ui';
import { ConfirmDelete, Field, Modal } from '../components/ui';

export function Settings() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { toast } = useUi();
  const [memberModal, setMemberModal] = useState<FamilyMember | 'new' | null>(null);
  const [catModal, setCatModal] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  const exportJson = useMemo(() => (showExport ? JSON.stringify(state, null, 2) : ''), [state, showExport]);

  const doImport = () => {
    setImportError('');
    try {
      const parsed = JSON.parse(importText) as AppState;
      if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.transactions)) {
        setImportError('Это не похоже на экспорт приложения: нет списка операций.');
        return;
      }
      dispatch({ type: 'data/import', state: parsed });
      setImportText('');
      toast('Данные импортированы');
    } catch {
      setImportError('Не получилось разобрать JSON. Скопируйте экспорт целиком.');
    }
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      toast('Экспорт скопирован в буфер обмена');
    } catch {
      toast('Скопируйте текст из поля вручную');
    }
  };

  return (
    <>
      <div className="page-head"><h2 className="page-title">⚙️ Настройки</h2></div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Валюта</h3>
          <Field label="Основная валюта — в ней показываются все суммы">
            <select
              className="select"
              value={state.settings.currency}
              onChange={(e) => { dispatch({ type: 'settings/currency', currency: e.target.value }); toast('Валюта изменена'); }}
            >
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <p className="muted small" style={{ marginTop: 8 }}>
            Суммы не пересчитываются по курсу — меняется только формат отображения.
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h3 style={{ fontSize: 15 }}>Члены семьи</h3>
            <span className="spacer" />
            <button className="btn btn-ghost btn-sm" onClick={() => setMemberModal('new')}>＋ Добавить</button>
          </div>
          {state.members.map((m) => (
            <div key={m.id} className="pay-row">
              <div className="grow"><b>{m.name}</b>{m.id === 'me' && <span className="muted small"> — это вы</span>}</div>
              <button className="row-menu" title="Переименовать" onClick={() => setMemberModal(m)}>✏️</button>
              {m.id !== 'me' && (
                <button className="row-menu" title="Удалить"
                  onClick={() => { dispatch({ type: 'member/delete', id: m.id }); toast('Участник удалён'); }}>🗑</button>
              )}
            </div>
          ))}
          <p className="muted small" style={{ marginTop: 8 }}>Участники доступны в поле «Кто» при добавлении операций.</p>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h3 style={{ fontSize: 15 }}>Свои категории</h3>
          <span className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => setCatModal(true)}>＋ Категория</button>
        </div>
        <p className="muted small">
          В приложении уже есть {state.categories.length} категорий по 11 направлениям. Не хватает своей — добавьте: она появится во всех формах, фильтрах и отчётах.
        </p>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 8 }}>Данные</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {state.settings.hasDemo ? (
            <ConfirmDelete label="Удалить демо-данные" onConfirm={() => { dispatch({ type: 'demo/clear' }); toast('Демо-данные удалены'); }} />
          ) : (
            <button className="btn btn-ghost" onClick={() => { dispatch({ type: 'demo/load' }); toast('Демо-данные загружены'); }}>
              Загрузить демо-данные
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowExport(!showExport)}>
            {showExport ? 'Скрыть экспорт' : 'Экспорт данных (JSON)'}
          </button>
          <span className="spacer" />
          <ConfirmDelete label="Очистить всё" onConfirm={() => { dispatch({ type: 'data/clearAll' }); toast('Все данные удалены'); }} />
        </div>

        {showExport && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea className="textarea money" readOnly rows={7} value={exportJson} onFocus={(e) => e.currentTarget.select()} />
            <div><button className="btn btn-accent btn-sm" onClick={copyExport}>Скопировать</button></div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <Field label="Импорт: вставьте JSON экспорта (заменит текущие данные)">
            <textarea className="textarea" rows={4} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"schema":1, ...}' />
          </Field>
          {importError && <p className="neg small" style={{ marginTop: 6 }}>{importError}</p>}
          {importText.trim() && (
            <div style={{ marginTop: 8 }}>
              <ConfirmDelete label="Импортировать" onConfirm={doImport} />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>Как хранятся данные</h3>
        <p className="muted small">
          Всё сохраняется локально в вашем браузере (localStorage) и переживает перезагрузку страницы.
          Данные не покидают устройство. Слой хранения в коде изолирован, поэтому позже можно подключить
          базу данных, авторизацию, несколько пользователей и импорт банковских выписок или Excel/CSV —
          интерфейс при этом не изменится. Резервную копию можно сделать через экспорт JSON выше.
        </p>
      </div>

      {memberModal && (
        <MemberModal
          member={memberModal === 'new' ? null : memberModal}
          onClose={() => setMemberModal(null)}
          onSave={(m) => {
            dispatch({ type: 'member/upsert', member: m });
            toast(memberModal === 'new' ? 'Участник добавлен' : 'Сохранено');
            setMemberModal(null);
          }}
        />
      )}
      {catModal && <CategoryModal onClose={() => setCatModal(false)} />}
    </>
  );
}

function MemberModal({ member, onClose, onSave }: {
  member: FamilyMember | null;
  onClose: () => void;
  onSave: (m: FamilyMember) => void;
}) {
  const [name, setName] = useState(member?.name ?? '');
  return (
    <Modal title={member ? 'Член семьи' : 'Новый член семьи'} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-accent" disabled={!name.trim()}
          onClick={() => onSave({ id: member?.id ?? uid('mem'), name: name.trim(), demo: member?.demo })}>
          Сохранить
        </button>
      </>}
    >
      <Field label="Имя">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Супруга, Сын" autoFocus />
      </Field>
    </Modal>
  );
}

function CategoryModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { toast } = useUi();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🔖');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [group, setGroup] = useState<GroupKey>('other');

  const save = () => {
    if (!name.trim()) return;
    dispatch({
      type: 'category/add',
      category: {
        id: uid('cat'),
        name: name.trim(),
        icon: icon.trim() || '🔖',
        type,
        group: type === 'income' ? 'income' : group,
        custom: true,
      },
    });
    toast('Категория добавлена');
    onClose();
  };

  return (
    <Modal title="Своя категория" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
        <button className="btn btn-accent" disabled={!name.trim()} onClick={save}>Добавить</button>
      </>}
    >
      <div className="form-grid">
        <Field label="Название" className="wide">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: репетиторы" autoFocus />
        </Field>
        <Field label="Значок (эмодзи)">
          <input className="input" value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} />
        </Field>
        <Field label="Тип">
          <select className="select" value={type} onChange={(e) => setType(e.target.value as 'expense' | 'income')}>
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </select>
        </Field>
        {type === 'expense' && (
          <Field label="Направление" className="wide">
            <select className="select" value={group} onChange={(e) => setGroup(e.target.value as GroupKey)}>
              {GROUPS.filter((g) => g.key !== 'income').map((g) => (
                <option key={g.key} value={g.key}>{g.icon} {g.name}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
