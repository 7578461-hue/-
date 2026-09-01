import type { Category } from '../types';

export function CatChip({ category }: { category?: Category }) {
  if (!category) return <span className="muted">—</span>;
  return (
    <span className="cat-chip">
      <span className="cat-dot" style={{ background: `var(--c-${category.group})` }} />
      {category.name}
    </span>
  );
}
