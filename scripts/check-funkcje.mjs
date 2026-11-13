// Mapa funkcji `docs/funkcje/`: każdy plik funkcji ma cztery niepuste sekcje (Rola, Jak dotrzeć, Jak sprawdzić,
// Uważaj na), jest w indeksie README, a każda ścieżka w backtickach i każdy link do innego pliku istnieje.
// Ścieżka z prefiksem `<repo>:` (np. `fizjo-app:backend/...`) wskazuje inne repo i nie jest sprawdzana.
// Kopia `fizjo-app:scripts/check-funkcje.mjs`; różni się tylko listą katalogów repo (ROOTS).
// Mapa, która kłamie, jest gorsza niż brak mapy, więc martwy wskaźnik zatrzymuje `agent:check`.
//   npm run check:funkcje
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DIR = 'docs/funkcje';
export const SECTIONS = ['Rola', 'Jak dotrzeć', 'Jak sprawdzić', 'Uważaj na'];
// Token w backtickach traktujemy jako ścieżkę, gdy zaczyna się od katalogu repo albo jest plikiem z korzenia.
const ROOTS = /^(src|docs|scripts|public|\.ai|\.cursor|\.github)\//;
const ROOT_FILE = /^[\w.-]+\.(md|json|ts|js|mjs|cjs|yml|yaml)$/;

const sectionsOf = (text) => {
  const out = new Map();
  for (const part of `\n${text.replace(/\r/g, '')}`.split(/\n## /).slice(1)) {
    const [title, ...body] = part.split('\n');
    out.set(title.trim(), body.join('\n').trim());
  }
  return out;
};

// Ścieżki tego repo wskazane w backtickach, bez numeru linii i kotwicy.
export function pathsIn(text) {
  const out = [];
  for (const [, token] of text.matchAll(/`([^`\s]+)`/g)) {
    if (/^[\w-]+:/.test(token)) continue; // inne repo albo URL
    const clean = token.replace(/[#:].*$/, '').replace(/\/$/, '');
    if (ROOTS.test(clean) || ROOT_FILE.test(clean)) out.push(clean);
  }
  return out;
}

// Plik funkcji → ścieżki tego repo, które wskazuje (dla ostrzeżenia o dryfie mapy).
export function funkcjePaths(root, dir = DIR) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return new Map();
  return new Map(
    fs
      .readdirSync(base)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .map((f) => [`${dir}/${f}`, pathsIn(fs.readFileSync(path.join(base, f), 'utf8'))])
  );
}

export function checkFunkcje(root, dir = DIR) {
  const base = path.join(root, dir);
  if (!fs.existsSync(path.join(base, 'README.md'))) return [`${dir}/README.md: brak indeksu mapy funkcji`];
  const index = fs.readFileSync(path.join(base, 'README.md'), 'utf8');
  const files = fs
    .readdirSync(base)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort();
  if (!files.length) return [`${dir}: brak plików funkcji`];
  const errors = [];
  for (const file of files) {
    const where = `${dir}/${file}`;
    const text = fs.readFileSync(path.join(base, file), 'utf8');
    if (!index.includes(`(${file})`)) errors.push(`${where}: brak wpisu w ${dir}/README.md`);
    const sections = sectionsOf(text);
    for (const name of SECTIONS) {
      if (!sections.has(name)) errors.push(`${where}: brak sekcji „## ${name}”`);
      else if (!sections.get(name)) errors.push(`${where}: pusta sekcja „## ${name}”`);
    }
    for (const clean of pathsIn(text)) {
      if (!fs.existsSync(path.join(root, clean))) errors.push(`${where}: ścieżka ${clean} nie istnieje`);
    }
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
      const clean = target.replace(/#.*$/, '');
      if (!fs.existsSync(path.resolve(base, clean))) errors.push(`${where}: link ${clean} nie istnieje`);
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const errors = checkFunkcje(root);
  for (const error of errors) console.error(`Funkcje: ${error}`);
  if (errors.length) process.exit(1);
  console.log(
    `Funkcje: ${fs.readdirSync(path.join(root, DIR)).filter((f) => f.endsWith('.md') && f !== 'README.md').length} plików, wskaźniki istnieją.`
  );
}
