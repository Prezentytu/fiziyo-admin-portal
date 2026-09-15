import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  DEV_API_ORIGIN,
  DEV_APP_URL,
  PROJECT_NAME,
  assertProjectId,
  assertTeamId,
  normalizeDeploymentId,
  normalizeSha,
} from "./promote-admin.mjs";

export const DEV_DOMAINS = ["devportal.fiziyo.pl", "dev.portal.fiziyo.pl"];
export const TRUNK_BRANCH = "main";
export const LEGACY_INTEGRATION_BRANCH = "dev";

const TEAM_ID = /^(team_[A-Za-z0-9]+|[A-Za-z0-9_-]{2,64})$/;

export function isDevDomain(name) {
  return DEV_DOMAINS.includes(String(name ?? ""));
}

export function planDevDomainAssignment(domain) {
  const name = String(domain?.name ?? "");
  if (!isDevDomain(name)) throw new Error("Not a DEV domain.");
  if (domain.gitBranch === LEGACY_INTEGRATION_BRANCH) {
    return { action: "reassign", gitBranch: TRUNK_BRANCH, previous: LEGACY_INTEGRATION_BRANCH };
  }
  if (domain.gitBranch === TRUNK_BRANCH) {
    return { action: "keep", gitBranch: TRUNK_BRANCH, previous: TRUNK_BRANCH };
  }
  return { action: "reassign", gitBranch: TRUNK_BRANCH, previous: domain.gitBranch || null };
}

export function shouldSkipPin({ ref, environment } = {}) {
  if (environment === "Production") return "production";
  if (ref === LEGACY_INTEGRATION_BRANCH) return "legacy-dev-branch";
  return "";
}

export function assertPreviewDeployment(deployment) {
  if (!deployment) throw new Error("Brak deploymentu Preview dla DEV.");
  if (deployment.target === "production") {
    throw new Error("DEV domain cannot follow a production deployment.");
  }
  return deployment;
}

export function selectMainPreviewDeployment(deployments, sha) {
  const expected = normalizeSha(sha);
  const ready = (Array.isArray(deployments) ? deployments : []).filter((item) => {
    const state = item.readyState || item.state;
    const commit = String(item.meta?.githubCommitSha || item.meta?.gitCommitSha || "").toLowerCase();
    const ref = item.meta?.githubCommitRef || item.meta?.gitBranch;
    const onTrunk = !ref || ref === TRUNK_BRANCH;
    return state === "READY" && commit === expected && onTrunk && item.target !== "production";
  });
  return ready[0] || null;
}

function teamQuery(teamId) {
  const id = assertTeamId(teamId);
  return id ? `teamId=${encodeURIComponent(id)}` : "";
}

function withQuery(requestPath, teamId) {
  const query = teamQuery(teamId);
  return query ? `${requestPath}?${query}` : requestPath;
}

async function vercelJson(fetchImpl, token, method, requestPath, body) {
  if (!token || token.length < 20) throw new Error("Brak VERCEL_TOKEN.");
  const response = await fetchImpl(`https://api.vercel.com${requestPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Vercel API ${response.status}`);
  if (response.status === 202) return { accepted: true };
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

export async function listProjectDomains(fetchImpl, env) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  const payload = await vercelJson(fetchImpl, env.VERCEL_TOKEN, "GET", withQuery(`/v9/projects/${projectId}/domains`, env.VERCEL_TEAM_ID));
  return Array.isArray(payload.domains) ? payload.domains : [];
}

export async function assignDomainToMain(fetchImpl, env, domainName) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  const encoded = encodeURIComponent(domainName);
  return vercelJson(fetchImpl, env.VERCEL_TOKEN, "PATCH", withQuery(`/v9/projects/${projectId}/domains/${encoded}`, env.VERCEL_TEAM_ID), {
    gitBranch: TRUNK_BRANCH,
  });
}

export async function aliasDevDomain(fetchImpl, env, deploymentId) {
  const id = normalizeDeploymentId(deploymentId);
  return vercelJson(fetchImpl, env.VERCEL_TOKEN, "POST", withQuery("/v2/aliases", env.VERCEL_TEAM_ID), {
    alias: new URL(DEV_APP_URL).host,
    deploymentId: id,
  });
}

export async function listShaDeployments(fetchImpl, env, sha) {
  const projectId = assertProjectId(env.VERCEL_PROJECT_ID);
  const query = new URLSearchParams({ projectId, sha, limit: "20" });
  if (env.VERCEL_TEAM_ID && TEAM_ID.test(env.VERCEL_TEAM_ID)) query.set("teamId", env.VERCEL_TEAM_ID);
  const payload = await vercelJson(fetchImpl, env.VERCEL_TOKEN, "GET", `/v6/deployments?${query}`);
  return Array.isArray(payload.deployments) ? payload.deployments : [];
}

export async function pinDevportalDomain(env, { fetchImpl = fetch } = {}) {
  const skip = shouldSkipPin({ ref: env.DEPLOYMENT_REF, environment: env.DEPLOYMENT_ENV });
  if (skip === "production") {
    return { skipped: skip, reassigned: [], aliased: false };
  }

  const domains = (await listProjectDomains(fetchImpl, env)).filter((item) => isDevDomain(item.name));
  if (!domains.length) throw new Error("Brak domeny DEV w projekcie Vercel.");

  const reassigned = [];
  for (const domain of domains) {
    const plan = planDevDomainAssignment(domain);
    if (plan.action === "reassign") {
      await assignDomainToMain(fetchImpl, env, domain.name);
      reassigned.push({ name: domain.name, from: plan.previous, to: plan.gitBranch });
    }
  }

  if (skip === "legacy-dev-branch") {
    return { skipped: skip, reassigned, aliased: false };
  }

  const sha = env.DEPLOYMENT_SHA ? normalizeSha(env.DEPLOYMENT_SHA) : "";
  if (!sha) return { skipped: "", reassigned, aliased: false, apiOrigin: DEV_API_ORIGIN };

  const preview = assertPreviewDeployment(selectMainPreviewDeployment(await listShaDeployments(fetchImpl, env), sha));
  await aliasDevDomain(fetchImpl, env, preview.id || preview.uid);
  return {
    skipped: "",
    reassigned,
    aliased: true,
    deploymentId: normalizeDeploymentId(preview.id || preview.uid),
    project: env.VERCEL_PROJECT_NAME || PROJECT_NAME,
    apiOrigin: DEV_API_ORIGIN,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await pinDevportalDomain(process.env);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Pin DEV domain failed.");
    process.exitCode = 1;
  }
}
