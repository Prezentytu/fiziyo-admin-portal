#!/usr/bin/env node
// Sędzia merge'u agenta: ocenia otwarte PR-y do gałęzi domyślnej i merguje najwyżej jeden, który spełnia
// wszystkie warunki. Biegnie z definicji z gałęzi domyślnej (workflow_run, schedule), nigdy z kodu PR.
// Polityka: baza-wiedzy/praca-z-agentami/model-pracy/auto-merge-2026-11-19.md
// Env: GITHUB_REPOSITORY, GH_TOKEN (odczyt i komentarze), AGENT_MERGE_APP_ID i AGENT_MERGE_APP_KEY
//      (opcjonalnie: token instalacji aplikacji GitHub do merge'u; bez nich merge idzie na GH_TOKEN),
//      AGENT_MERGE (off = wyłączony), DRY_RUN (1 = tylko wypisz).
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ocen, skrocPowody, stanCheckow, wzorce } from './reguly.mjs';

const tu = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(tu, 'config.json'), 'utf8'));
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GH_TOKEN;
let MERGE_TOKEN = TOKEN;
const DRY = process.env.DRY_RUN === '1';
const log = (...x) => process.stdout.write(`${x.join(' ')}\n`);
const ZNACZNIK = '<!-- agent-merge -->';

async function api(sciezka, { metoda = 'GET', body, token = TOKEN, surowo = false } = {}) {
  const res = await fetch(sciezka.startsWith('http') ? sciezka : `https://api.github.com/${sciezka}`, {
    method: metoda,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      accept: surowo ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = new Error(`${metoda} ${sciezka}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return surowo ? res.text() : res.status === 204 ? null : res.json();
}

async function wszystko(sciezka, klucz) {
  const out = [];
  for (let strona = 1; strona <= 30; strona++) {
    const d = await api(`${sciezka}${sciezka.includes('?') ? '&' : '?'}per_page=100&page=${strona}`);
    const lista = klucz ? d[klucz] : d;
    out.push(...lista);
    if (lista.length < 100) break;
  }
  return out;
}

async function plikZBazy(sciezka, ref) {
  try {
    return await api(`repos/${REPO}/contents/${sciezka}?ref=${ref}`, {
      surowo: true,
    });
  } catch (e) {
    if (e.status === 404) return '';
    throw e;
  }
}

async function watkiReview(n) {
  const [owner, name] = REPO.split('/');
  const q = `query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{isResolved isOutdated comments(first:100){nodes{author{login}}}}}}}}`;
  const d = await api('graphql', {
    metoda: 'POST',
    body: { query: q, variables: { o: owner, r: name, n } },
  });
  return d.data.repository.pullRequest.reviewThreads.nodes.map((t) => ({
    isResolved: t.isResolved,
    isOutdated: t.isOutdated,
    autorzy: t.comments.nodes.map((k) => k.author?.login ?? '?'),
  }));
}

// Czerwony main: commit status `cfg.statusMain` (np. E2E Dev Full) albo check run bramki `cfg.gate` na
// ostatnim commicie gałęzi domyślnej. Brak checków nie blokuje: bramka jest na main tylko tam, gdzie CI biegnie
// na push (ops, panel), a merge na GITHUB_TOKEN CI nie uruchamia. Gdzie jej nie ma (fizjo-app, fiziyo-tests),
// błąd z main i tak wychodzi w bramce na merge refie każdego PR.
async function mainCzerwony(galaz) {
  const zle = ['failure', 'error', 'timed_out'];
  if (cfg.statusMain) {
    const s = await api(`repos/${REPO}/commits/${galaz}/status`);
    const st = s.statuses.find((x) => x.context === cfg.statusMain);
    if (st && zle.includes(st.state)) return `${cfg.statusMain}: ${st.state}`;
  }
  const runy = await wszystko(
    `repos/${REPO}/commits/${galaz}/check-runs?filter=latest&check_name=${encodeURIComponent(cfg.gate)}`,
    'check_runs'
  );
  const c = stanCheckow(runy).get(cfg.gate);
  return c?.status === 'completed' && zle.includes(c.conclusion) ? `${cfg.gate}: ${c.conclusion}` : null;
}

async function pelnyPr(n) {
  for (let i = 0; i < 5; i++) {
    const pr = await api(`repos/${REPO}/pulls/${n}`);
    if (pr.mergeable !== null) return pr;
    await new Promise((r) => setTimeout(r, 4000));
  }
  return api(`repos/${REPO}/pulls/${n}`);
}

async function komentarz(n, tresc) {
  const body = `${ZNACZNIK}\n${tresc}`;
  const moje = (await wszystko(`repos/${REPO}/issues/${n}/comments`)).filter(
    (k) => k.user?.login === 'github-actions[bot]' && k.body?.startsWith(ZNACZNIK)
  );
  const ost = moje.at(-1);
  if (ost?.body === body) return;
  if (DRY) {
    log(`[dry] komentarz #${n}:\n${body}`);
    return;
  }
  if (ost)
    await api(`repos/${REPO}/issues/comments/${ost.id}`, {
      metoda: 'PATCH',
      body: { body },
    });
  else
    await api(`repos/${REPO}/issues/${n}/comments`, {
      metoda: 'POST',
      body: { body },
    });
}

// Token instalacji aplikacji GitHub z JWT RS256 (bez zewnętrznej akcji).
async function tokenAplikacji(appId, klucz) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const teraz = Math.floor(Date.now() / 1000);
  const tresc = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iat: teraz - 60, exp: teraz + 540, iss: String(appId) })}`;
  const jwt = `${tresc}.${createSign('RSA-SHA256').update(tresc).sign(klucz.replace(/\\n/g, '\n'), 'base64url')}`;
  const inst = await api(`repos/${REPO}/installation`, { token: jwt });
  return (
    await api(`app/installations/${inst.id}/access_tokens`, {
      metoda: 'POST',
      token: jwt,
    })
  ).token;
}

async function main() {
  if ((process.env.AGENT_MERGE || '').toLowerCase() === 'off') {
    log('AGENT_MERGE=off: sędzia wyłączony');
    return;
  }
  if (process.env.AGENT_MERGE_APP_ID && process.env.AGENT_MERGE_APP_KEY) {
    MERGE_TOKEN = await tokenAplikacji(process.env.AGENT_MERGE_APP_ID, process.env.AGENT_MERGE_APP_KEY);
    log('Merge tokenem aplikacji GitHub');
  } else log('Merge na GITHUB_TOKEN (brak AGENT_MERGE_APP_ID/KEY)');
  const repo = await api(`repos/${REPO}`);
  const baza = repo.default_branch;
  const dozwolone = wzorce(cfg.dozwolone.join('\n'), { poddrzewo: false });
  const drzwi = await plikZBazy('.github/drzwi-jednokierunkowe', baza);
  const zakazane = wzorce([...cfg.zakazane, drzwi].join('\n'));
  const czerwony = await mainCzerwony(baza);
  const otwarte = (await wszystko(`repos/${REPO}/pulls?state=open&base=${baza}&sort=created&direction=asc`)).filter(
    (p) => !p.draft
  );
  let zmergowany = false;
  for (const p of otwarte) {
    const pr = await pelnyPr(p.number);
    const sha = pr.head.sha;
    const [pliki, checkRuns, komentarze, reviews, watki] = await Promise.all([
      wszystko(`repos/${REPO}/pulls/${pr.number}/files`),
      wszystko(`repos/${REPO}/commits/${sha}/check-runs?filter=latest`, 'check_runs'),
      wszystko(`repos/${REPO}/issues/${pr.number}/comments`),
      wszystko(`repos/${REPO}/pulls/${pr.number}/reviews`),
      watkiReview(pr.number),
    ]);
    let wynik;
    try {
      wynik = ocen({
        pr,
        pliki,
        checkRuns,
        komentarze,
        reviews,
        watki,
        mainCzerwony: czerwony,
        cfg,
        zakazane,
        dozwolone,
      });
    } catch (e) {
      wynik = { stan: 'nie', powody: [`błąd oceny: ${e.message}`] };
    }
    log(
      `#${pr.number} @ ${sha.slice(0, 7)}: ${wynik.stan}${wynik.powody.length ? ` (${wynik.powody.join('; ')})` : ''}`
    );
    if (wynik.stan === 'czeka') continue;
    if (wynik.stan === 'nie' || zmergowany) {
      if (wynik.stan === 'nie')
        await komentarz(
          pr.number,
          `**Merge u człowieka** dla ${sha.slice(0, 7)}. Sędzia merge'u agenta nie zmerguje tego PR, bo:\n\n${skrocPowody(
            wynik.powody
          )
            .map((x) => `- ${x}`)
            .join(
              '\n'
            )}\n\nNowy commit albo zmiana stanu uruchamia ocenę ponownie. Polityka: [auto-merge](https://github.com/Prezentytu/baza-wiedzy/blob/main/praca-z-agentami/model-pracy/auto-merge-2026-11-19.md).`
        );
      continue;
    }
    // Merge po jednym na przebieg: następny PR oceni kolejny przebieg na nowym main.
    if (DRY) {
      log(`[dry] merge #${pr.number} @ ${sha}`);
      zmergowany = true;
      continue;
    }
    try {
      await api(`repos/${REPO}/pulls/${pr.number}/merge`, {
        metoda: 'PUT',
        token: MERGE_TOKEN,
        body: {
          sha,
          merge_method: cfg.metoda,
          commit_title: `${pr.title} (#${pr.number})`,
          commit_message: `Merge agenta (sędzia) @ ${sha.slice(0, 7)}`,
        },
      });
      zmergowany = true;
      await komentarz(
        pr.number,
        `**Zmergowane przez sędziego** (${cfg.metoda}) @ ${sha.slice(0, 7)}: zielony \`${cfg.gate}\`, PASS Claude review, tylko dozwolone ścieżki. Cofnięcie: \`git revert\` commita merge'u.`
      );
      if (cfg.usunGalaz && pr.head.repo?.full_name === REPO) {
        await api(`repos/${REPO}/git/refs/heads/${encodeURIComponent(pr.head.ref)}`, { metoda: 'DELETE' }).catch(
          () => {}
        );
      }
    } catch (e) {
      await komentarz(
        pr.number,
        `**Merge u człowieka** dla ${sha.slice(0, 7)}: GitHub odrzucił merge (${e.status}). ${String(e.message).slice(0, 200)}`
      );
    }
  }
}

main().catch((e) => {
  process.stderr.write(`${e?.stack || e}\n`);
  process.exit(1);
});
