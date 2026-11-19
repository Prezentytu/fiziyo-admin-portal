// Czyste reguły sędziego merge'u agenta. Bez sieci: wejście to dane PR, wyjście to lista powodów.
// Polityka: baza-wiedzy/praca-z-agentami/model-pracy/auto-merge-2026-11-19.md

// Wzorzec w stylu .gitignore: "/" na początku kotwiczy w katalogu głównym, "/" na końcu oznacza katalog,
// wzorzec bez "/" w środku pasuje do nazwy na dowolnym poziomie, "**" to dowolna liczba katalogów,
// "*" i "?" nie przechodzą przez "/". Negacja, klasy znaków i ucieczki nie są obsługiwane: rzucają błąd,
// a sędzia traktuje błąd jak brak zgody. `poddrzewo`: wzorzec bez "/" na końcu pasuje też do wszystkiego pod
// nazwą (dla listy zakazanych, gdzie nadmiar jest bezpieczny); lista dozwolonych bierze poddrzewo tylko z "/".
export function wzorzecNaRegex(wzorzec, { poddrzewo = true } = {}) {
  let w = wzorzec.trim();
  if (!w || w.startsWith('#')) return null;
  if (/[![\]\\]/.test(w)) throw new Error(`nieobsługiwana składnia wzorca: ${wzorzec}`);
  const katalog = w.endsWith('/');
  if (katalog) w = w.slice(0, -1);
  const kotwica = w.startsWith('/') || w.slice(0, -1).includes('/');
  if (w.startsWith('/')) w = w.slice(1);
  let re = '';
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    if (c === '*' && w[i + 1] === '*') {
      if (w[i + 2] === '/') {
        re += '(?:.*/)?';
        i += 2;
      } else {
        re += '.*';
        i += 1;
      }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|]/g, '\\$&');
  }
  const poczatek = kotwica ? '^' : '^(?:.*/)?';
  const pod = katalog || poddrzewo ? '(?:/.*)?' : '';
  return new RegExp(`${poczatek}${re}${pod}$`);
}

export function wzorce(tekst, opcje) {
  return tekst
    .split('\n')
    .map((w) => wzorzecNaRegex(w, opcje))
    .filter(Boolean);
}

export const pasuje = (sciezka, lista) => lista.some((r) => r.test(sciezka));

const TEST_PLIK = /(^|\/)(__tests__|tests?|e2e)\/|\.(test|spec)\.[cm]?[jt]sx?$|Tests?\.cs$|\.Tests\//;
// Nazwa pliku testu (sam katalog `tests/` nie wystarcza: `x.spec.ts.off` też w nim leży).
const TEST_NAZWA = /\.(test|spec|setup)\.[cm]?[jt]sx?$|Tests?\.cs$/;
const ASERCJA =
  /\b(expect|assert\w*|Assert\.\w+|toBe\w*|toEqual|toMatch\w*|toHaveBeenCalled\w*|should\.\w+)\b|\b(it|test|describe)(\.each)?\(|\[(Fact|Theory)/;
// Nowa server action w Next.js to nowy publiczny endpoint zapisu, niezależnie od nazwy pliku.
const SERVER_ACTION = /["']use server["']/;
const WYLACZENIE =
  /\b(it|test|describe)(\.concurrent)?\.(skip|only|todo|skipIf|runIf|fixme|fails?)\b|\b(test\.info\(\)|testInfo)\.(skip|fixme|fail)\b|\b(ctx|context|t)\.skip\(|\(\s*\{[^}]*\bskip\b[^}]*\}\s*\)\s*=>|\b(xit|xdescribe|fit|fdescribe)\(|Skip\s*=\s*"|\[Ignore\]|@ts-nocheck/;

// pliki: [{filename, previous_filename?, status, additions, deletions, patch?}]
export function ocenPliki(pliki, { dozwolone, zakazane }) {
  const powody = [];
  for (const p of pliki) {
    for (const s of [p.filename, p.previous_filename].filter(Boolean)) {
      if (pasuje(s, zakazane)) powody.push(`plik poza zasięgiem agenta: \`${s}\``);
      else if (!pasuje(s, dozwolone)) powody.push(`plik spoza listy dozwolonych: \`${s}\``);
    }
    const test = TEST_PLIK.test(p.filename) || (p.previous_filename && TEST_PLIK.test(p.previous_filename));
    // Rename pliku testu blokuje zawsze: nazwa, która wygląda na test, nie musi pasować do `testMatch`
    // runnera (`x.spec.ts` → `x.test.ts` w Playwright), a zmiana nazwy testu rzadko jest konieczna.
    const wypadlZTestow =
      p.status === 'renamed' &&
      p.previous_filename &&
      TEST_PLIK.test(p.previous_filename) &&
      (!TEST_PLIK.test(p.filename) || TEST_NAZWA.test(p.previous_filename));
    if (wypadlZTestow)
      powody.push(`test przeniesiony albo przemianowany: \`${p.previous_filename}\` → \`${p.filename}\``);
    if (test && p.status === 'removed') powody.push(`usunięty plik testu: \`${p.filename}\``);
    if (p.patch === undefined && (p.additions || p.deletions))
      powody.push(`brak diffu do sprawdzenia (za duży albo binarny): \`${p.filename}\``);
    // Zmiana oczekiwania (linia z asercją usunięta i dodana) jest w porządku; spadek liczby asercji nie.
    if (test) {
      let bilans = 0;
      for (const linia of (p.patch || '').split('\n')) {
        if (/^-(?!--)/.test(linia) && ASERCJA.test(linia)) bilans--;
        if (/^\+(?!\+\+)/.test(linia) && ASERCJA.test(linia)) bilans++;
      }
      if (bilans < 0) powody.push(`ubyło asercji albo testów (${bilans}) w \`${p.filename}\``);
    }
    for (const linia of (p.patch || '').split('\n')) {
      if (linia.startsWith('+') && !linia.startsWith('+++') && WYLACZENIE.test(linia)) {
        powody.push(`wyłączony test albo sprawdzenie w \`${p.filename}\``);
        break;
      }
    }
    for (const linia of (p.patch || '').split('\n')) {
      if (/^\+(?!\+\+)/.test(linia) && SERVER_ACTION.test(linia)) {
        powody.push(`nowa server action (\`use server\`) w \`${p.filename}\``);
        break;
      }
    }
  }
  return [...new Set(powody)];
}

// Ostatni run każdego checka (po id, bo rerun dostaje nowy).
export function stanCheckow(checkRuns) {
  const ostatni = new Map();
  for (const c of checkRuns) {
    const b = ostatni.get(c.name);
    if (!b || c.id > b.id) ostatni.set(c.name, c);
  }
  return ostatni;
}

// Werdykt: tylko nieedytowany komentarz aplikacji claude[bot], pierwsza linia „PASS|FAIL <sha>” dla heada.
export function werdykt(komentarze, headSha) {
  let pass = false,
    fail = false;
  for (const k of komentarze) {
    if (k.user?.login !== 'claude[bot]' || k.user?.type !== 'Bot' || k.created_at !== k.updated_at) continue;
    const m = /^(PASS|FAIL) ([0-9a-f]{7,40})\s*$/.exec((k.body || '').split('\n')[0]);
    if (!m || !headSha.startsWith(m[2])) continue;
    if (m[1] === 'FAIL') fail = true;
    else pass = true;
  }
  return fail ? 'FAIL' : pass ? 'PASS' : 'brak';
}

export function drzwiZOpisu(body) {
  const t = body || '';
  const dwu = /^\s*-\s*\[[xX]\]\s*Dwukierunkowe/m.test(t);
  const jedno = /^\s*-\s*\[[xX]\]\s*Jednokierunkowe/m.test(t);
  return dwu && !jedno;
}

// Pełna ocena. Zwraca {stan: "czeka"|"nie"|"tak", powody}. „czeka” = checki jeszcze trwają, bez komentarza.
export function ocen({
  pr,
  pliki,
  checkRuns,
  komentarze,
  reviews,
  watki = [],
  mainCzerwony,
  cfg,
  zakazane,
  dozwolone,
}) {
  const powody = [];
  if (pr.draft) return { stan: 'czeka', powody: ['szkic'] };
  const etykiety = (pr.labels || []).map((l) => l.name);
  for (const e of ['hold', 'needs-adam']) if (etykiety.includes(e)) powody.push(`etykieta \`${e}\``);
  if (pr.head.repo?.full_name !== pr.base.repo.full_name) powody.push('PR z forka');

  const checki = stanCheckow(checkRuns);
  for (const nazwa of [cfg.gate, cfg.review]) {
    const c = checki.get(nazwa);
    if (!c || c.status !== 'completed') return { stan: 'czeka', powody: [`check \`${nazwa}\` w toku`] };
    if (c.conclusion !== 'success') powody.push(`check \`${nazwa}\`: ${c.conclusion}`);
  }
  const w = werdykt(komentarze, pr.head.sha);
  if (w !== 'PASS') powody.push(`werdykt Claude review dla ${pr.head.sha.slice(0, 7)}: ${w}`);
  if (mainCzerwony) powody.push(`main jest czerwony (${mainCzerwony}): merge'e wstrzymane do zielonego`);
  if (!drzwiZOpisu(pr.body)) powody.push('opis PR nie ma zaznaczonych wyłącznie drzwi dwukierunkowych');
  const linie = pr.additions + pr.deletions;
  if (linie > cfg.maxLinii) powody.push(`za duży: ${linie} linii (limit ${cfg.maxLinii})`);
  if (pr.changed_files > cfg.maxPlikow) powody.push(`za dużo plików: ${pr.changed_files} (limit ${cfg.maxPlikow})`);
  if (pliki.length < pr.changed_files) powody.push('nie odczytano wszystkich plików PR');
  powody.push(...ocenPliki(pliki, { dozwolone, zakazane }));
  const ostatnie = new Map();
  for (const r of reviews) if (r.user && r.state !== 'COMMENTED') ostatnie.set(r.user.login, r.state);
  for (const [kto, s] of ostatnie) if (s === 'CHANGES_REQUESTED') powody.push(`prośba o zmiany od ${kto}`);
  const otwarte = otwarteWatki(watki, w === 'PASS');
  if (otwarte > 0) powody.push(`nierozwiązane wątki review: ${otwarte}`);
  if (pr.mergeable !== true) powody.push(`GitHub nie widzi PR jako mergeable (${pr.mergeable_state})`);
  return { stan: powody.length ? 'nie' : 'tak', powody };
}

// Wątki, które blokują merge. Wątek z komentarzem kogokolwiek poza recenzentem CI blokuje, dopóki ktoś go
// nie rozwiąże, także gdy kod pod nim się zmienił. Wątek samego recenzenta CI blokuje tylko bez jego PASS
// dla heada i tylko, gdy nie jest przestarzały (PASS rozlicza jego znaleziska; P3 inline nie blokuje).
export function otwarteWatki(watki, pass) {
  return watki.filter((t) => {
    if (t.isResolved) return false;
    const tylkoRecenzent = t.autorzy.length > 0 && t.autorzy.every((a) => a === 'claude');
    if (!tylkoRecenzent) return true;
    return !t.isOutdated && !pass;
  }).length;
}
