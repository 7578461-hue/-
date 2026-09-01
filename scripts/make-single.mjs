// Собирает dist/artifact.html — однофайловую версию приложения:
// JS и CSS сборки инлайнятся, файл готов к публикации как страница
// (без обёрток doctype/html/head/body — их добавляет хостинг страницы).

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');

const scripts = [];
const styles = [];
const externalHead = [];

for (const m of html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)) {
  const src = m[1];
  if (src.startsWith('http')) continue;
  scripts.push(readFileSync(resolve(dist, '.' + src), 'utf8'));
}
for (const m of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) {
  const href = m[1];
  if (href.startsWith('http')) externalHead.push(m[0]);
  else styles.push(readFileSync(resolve(dist, '.' + href), 'utf8'));
}
for (const m of html.matchAll(/<link[^>]*rel="preconnect"[^>]*>/g)) {
  externalHead.push(m[0]);
}

const title = (html.match(/<title>([^<]*)<\/title>/) ?? [, 'Семейный бюджет'])[1];
// защита от преждевременного закрытия инлайн-скрипта
const js = scripts.join('\n').replaceAll('</script', '<\\/script');

const out = [
  `<title>${title}</title>`,
  ...externalHead,
  `<style>\n${styles.join('\n')}\n</style>`,
  `<div id="root"></div>`,
  `<script type="module">\n${js}\n</script>`,
].join('\n');

writeFileSync(resolve(dist, 'artifact.html'), out);
console.log(`dist/artifact.html: ${(out.length / 1024).toFixed(0)} KB`);
