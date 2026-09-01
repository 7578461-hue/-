// Обёртки над Recharts: единый стиль осей, сетки, тултипов и легенд.

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fmtCompact, fmtMoney } from '../lib/format';
import { useChartTheme, type ChartTheme } from '../lib/chartTheme';

// ---------- Тултип ----------

interface TipEntry { name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }

export function MoneyTip(props: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  currency: string;
  titleFormatter?: (label: string | number | undefined, payload?: TipEntry[]) => string;
}) {
  const { active, payload, label, currency, titleFormatter } = props;
  if (!active || !payload || payload.length === 0) return null;
  const title = titleFormatter ? titleFormatter(label, payload) : String(label ?? '');
  return (
    <div className="chart-tip">
      {title && <div className="tip-title">{title}</div>}
      {payload.map((p, i) => (
        <div key={i} className="tip-row">
          <i style={{ background: p.color ?? 'var(--axis)' }} />
          <b className="money">{fmtMoney(Number(p.value ?? 0), currency)}</b>
          <span className="muted">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="legend">
      {items.map((it) => (
        <span key={it.label} className="key"><i style={{ background: it.color }} /> {it.label}</span>
      ))}
    </div>
  );
}

const cursorFill = (t: ChartTheme) => (t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(20,19,17,0.05)');

const axisProps = (t: ChartTheme) => ({
  tick: { fill: t.ink3, fontSize: 11 },
  axisLine: { stroke: t.axis },
  tickLine: false as const,
});

// ---------- Доходы и расходы (столбцы по месяцам) ----------

export function IncomeExpenseChart({ data, currency }: {
  data: { name: string; income: number; expense: number }[];
  currency: string;
}) {
  const t = useChartTheme();
  return (
    <>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barGap={8}>
            <CartesianGrid vertical={false} stroke={t.grid} />
            <XAxis dataKey="name" {...axisProps(t)} />
            <YAxis {...axisProps(t)} tickFormatter={fmtCompact} width={58} />
            <Tooltip content={<MoneyTip currency={currency} />} cursor={{ fill: cursorFill(t) }} />
            <Bar dataKey="income" name="Доходы" fill={t.good} barSize={24} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Расходы" fill={t.bad} barSize={24} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: 'Доходы', color: t.good }, { label: 'Расходы', color: t.bad }]} />
    </>
  );
}

// ---------- Кольцевая диаграмма ----------

export interface DonutSlice { name: string; value: number; color: string }

export function CategoryDonut({ slices, total, centerLabel, currency }: {
  slices: DonutSlice[];
  total: number;
  centerLabel: string;
  currency: string;
}) {
  const t = useChartTheme();
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 180, height: 180, flex: 'none' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={86}
              paddingAngle={2}
              stroke={t.card}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
            >
              {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
            </Pie>
            <Tooltip content={<MoneyTip currency={currency} titleFormatter={(_l, p) => String(p?.[0]?.name ?? '')} />} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }} className="money">{fmtCompact(total)}</div>
            <div className="muted small">{centerLabel}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 200, flex: 1 }}>
        {slices.map((s) => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span className="dot" style={{ background: s.color }} />
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            <span className="muted" style={{ marginLeft: 'auto' }}>{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
            <b className="money">{fmtMoney(s.value, currency)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Расходы по дням ----------

export function DailyBarsChart({ data, currency, monthGenitive }: {
  data: { day: number; spent: number }[];
  currency: string;
  monthGenitive: string;
}) {
  const t = useChartTheme();
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis
            dataKey="day"
            {...axisProps(t)}
            ticks={data.filter((d) => d.day === 1 || d.day % 5 === 0).map((d) => d.day)}
          />
          <YAxis {...axisProps(t)} tickFormatter={fmtCompact} width={58} />
          <Tooltip
            content={<MoneyTip currency={currency} titleFormatter={(l) => `${l} ${monthGenitive}`} />}
            cursor={{ fill: cursorFill(t) }}
          />
          <Bar dataKey="spent" name="Расходы" fill={t.groups.family} barSize={12} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Динамика остатка ----------

export function BalanceAreaChart({ data, currency, monthGenitive }: {
  data: { day: number; balance: number }[];
  currency: string;
  monthGenitive: string;
}) {
  const t = useChartTheme();
  const color = t.groups.family;
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis
            dataKey="day"
            {...axisProps(t)}
            ticks={data.filter((d) => d.day === 1 || d.day % 10 === 0).map((d) => d.day)}
            tickFormatter={(d) => `${d} ${monthGenitive.slice(0, 3)}`}
          />
          <YAxis {...axisProps(t)} tickFormatter={fmtCompact} width={58} />
          <Tooltip
            content={<MoneyTip currency={currency} titleFormatter={(l) => `${l} ${monthGenitive}`} />}
            cursor={{ stroke: t.axis, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            name="Остаток"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: t.card }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Сравнение месяцев (горизонтальные пары) ----------

export function CompareGroupsChart({ data, currency, currentLabel, prevLabel }: {
  data: { name: string; current: number; prev: number }[];
  currency: string;
  currentLabel: string;
  prevLabel: string;
}) {
  const t = useChartTheme();
  const height = Math.max(data.length * 44 + 30, 140);
  return (
    <>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={3}>
            <CartesianGrid horizontal={false} stroke={t.grid} />
            <XAxis type="number" {...axisProps(t)} tickFormatter={fmtCompact} />
            <YAxis type="category" dataKey="name" width={96} tick={{ fill: t.ink2, fontSize: 12 }} axisLine={{ stroke: t.axis }} tickLine={false} />
            <Tooltip content={<MoneyTip currency={currency} />} cursor={{ fill: cursorFill(t) }} />
            <Bar dataKey="current" name={currentLabel} fill={t.groups.family} barSize={9} radius={[0, 3, 3, 0]} />
            <Bar dataKey="prev" name={prevLabel} fill={t.neutral} barSize={9} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: currentLabel, color: t.groups.family }, { label: prevLabel, color: t.neutral }]} />
    </>
  );
}
