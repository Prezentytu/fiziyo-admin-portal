import { fileURLToPath } from "node:url";
import path from "node:path";

import { DEV_API_ORIGIN, DEV_APP_URL, normalizeSha, readIdentity } from "./promote-admin.mjs";
import { assertDevIdentity } from "./pin-devportal-domain.mjs";

// E2E Dev Full po przepięciu devportal na nowy commit main. Vercel zgłasza deployment_status z URL-em
// *.vercel.app, więc e2e-trigger.yml go nie certyfikuje, a jedyny inny dispatch idzie z fizjo-app po merge API.
// Bez tego merge panelu w trakcie E2E po merge API zostawia czubek fizjo-app bez dowodu i Release staje na „Kandydat”.

export const TESTS_REPOSITORY = "Prezentytu/fiziyo-tests";

export function buildE2eDevPayload({ adminSha, apiSha }) {
  return {
    event_type: "e2e-dev-run",
    client_payload: {
      base_url: DEV_APP_URL,
      sha: normalizeSha(adminSha),
      project: "all",
      admin_owner: "Prezentytu",
      admin_repo: "fiziyo-admin-portal",
      api_sha: normalizeSha(apiSha),
    },
  };
}

async function readJson(fetchImpl, url, init) {
  const response = await fetchImpl(url, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    ...init,
  });
  if (!response.ok) throw new Error(`${new URL(url).host} ${response.status}`);
  return response;
}

export async function dispatchE2eDev(env, { fetchImpl = fetch } = {}) {
  const adminSha = normalizeSha(env.ADMIN_SHA);
  const token = String(env.E2E_DISPATCH_PAT ?? "").trim();
  if (token.length < 20) throw new Error("Brak E2E_DISPATCH_PAT.");

  // Dowód w fiziyo-tests porówna panel jeszcze raz; tu nie wysyłamy E2E dla panelu, który już nie stoi na DEV.
  const live = await readJson(fetchImpl, `${DEV_APP_URL}/sign-in`, { method: "HEAD" });
  assertDevIdentity(readIdentity(live.headers), { sha: adminSha });

  const health = await (await readJson(fetchImpl, `${DEV_API_ORIGIN}/health/live`, { method: "GET" })).json();
  const payload = buildE2eDevPayload({ adminSha, apiSha: health?.version });

  await readJson(fetchImpl, `https://api.github.com/repos/${TESTS_REPOSITORY}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return payload.client_payload;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const sent = await dispatchE2eDev(process.env);
    console.log(`E2E Dev Full: panel ${sent.sha.slice(0, 12)}, API ${sent.api_sha.slice(0, 12)}.`);
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : "Dispatch E2E Dev nie powiódł się."}`);
    process.exitCode = 1;
  }
}
