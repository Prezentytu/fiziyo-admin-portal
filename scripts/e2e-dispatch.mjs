#!/usr/bin/env node
/**
 * Cross-repo E2E trigger: resolve scope, dispatch to fiziyo-tests, report commit status.
 * Preview deployments are not dispatched — they previously tested shared DEV.
 */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const PROD_URL = "https://portal.fiziyo.pl";
const DEV_URL = "https://devportal.fiziyo.pl";
const TESTS_REPO_DEFAULT = "fiziyo-tests";

const PROD_URL_RE = /^https:\/\/portal\.fiziyo\.pl(\/.*)?$/;
const DEV_URL_RE =
  /^https:\/\/(devportal\.fiziyo\.pl|dev\.portal\.fiziyo\.pl)(\/.*)?$/;

export function classifyGitHubError(error) {
  if (!error) {
    return {
      code: "unknown",
      message: "Nieznany błąd GitHub API.",
    };
  }

  if (error.code === "missing_secret") {
    return {
      code: "missing_secret",
      message:
        "Brak sekretu E2E_DISPATCH_PAT. Dodaj fine-grained PAT (Contents: read/write na Prezentytu/fiziyo-tests) w Settings → Secrets.",
    };
  }

  const status = Number(error.status ?? error.statusCode ?? 0);
  if (status === 401) {
    return {
      code: "invalid_token",
      message:
        "E2E_DISPATCH_PAT jest nieważny, wygasły albo wycofany (401). Utwórz nowy fine-grained PAT, autoryzuj SSO i zrotuj sekret.",
    };
  }

  if (status === 403 || status === 404) {
    return {
      code: "permission_or_sso",
      message:
        "Token nie ma dostępu do fiziyo-tests (403/404). Sprawdź Contents: write, dostęp do repo i autoryzację SSO.",
    };
  }

  return {
    code: "unknown",
    message: error.message || `GitHub API error ${status || ""}`.trim(),
  };
}

export function resolveE2eScope({
  environmentName = "",
  targetUrl = "",
  deploymentRef = "",
} = {}) {
  const isProductionUrl = PROD_URL_RE.test(targetUrl);
  const isDedicatedDevUrl = DEV_URL_RE.test(targetUrl);
  const ref = String(deploymentRef || "");
  const isTrunkRef =
    ref === "main" ||
    ref === "refs/heads/main" ||
    ref === "dev" ||
    ref === "refs/heads/dev";

  if (environmentName === "Production" || isProductionUrl) {
    return {
      action: "dispatch",
      project: "prod-safe",
      eventType: "e2e-prod-run",
      baseUrl: PROD_URL,
      reason: "production",
      statusContext: "E2E Prod Smoke",
    };
  }

  if (isDedicatedDevUrl || environmentName === "Development") {
    return {
      action: "dispatch",
      project: "all",
      eventType: "e2e-dev-run",
      baseUrl: DEV_URL,
      reason: isDedicatedDevUrl ? "dedicated-dev-domain" : "development-environment",
      statusContext: "E2E Dev Full",
    };
  }

  if (isTrunkRef && environmentName !== "Preview") {
    return {
      action: "dispatch",
      project: "all",
      eventType: "e2e-dev-run",
      baseUrl: DEV_URL,
      reason: "trunk-ref",
      statusContext: "E2E Dev Full",
    };
  }

  return {
    action: "skip",
    project: "",
    eventType: "",
    baseUrl: "",
    reason: environmentName === "Preview" ? "generic-preview" : "unrecognized-deployment",
    statusContext: "E2E Dispatch",
  };
}

export function repairInstructions(code) {
  const lines = [
    "### Naprawa E2E Dispatch",
    "",
    "1. Settings → Secrets and variables → Actions → `E2E_DISPATCH_PAT`.",
    "2. Fine-grained PAT konta technicznego, tylko `Prezentytu/fiziyo-tests`.",
    "3. Uprawnienia: Contents read/write (Metadata read dodaje się samo).",
    "4. Autoryzuj SSO organizacji, jeśli jest włączone.",
    "5. Zapisz nowy sekret, unieważnij stary token, ustaw datę wygaśnięcia i przypomnienie 14 dni wcześniej.",
    "6. Nie używaj `repo` scope, jeśli fine-grained działa.",
    "7. Docelowo zastąp PAT GitHub App (installation token tylko do dispatch + statuses).",
    "8. Weryfikacja tylko na DEV: ręczny dispatch `e2e-dev-run` na `https://devportal.fiziyo.pl`.",
  ];
  if (code) {
    lines.splice(2, 0, `Kod błędu: \`${code}\`.`, "");
  }
  return lines.join("\n");
}

function readEvent() {
  const raw = process.env.DEPLOYMENT_JSON;
  if (!raw) {
    throw new Error("DEPLOYMENT_JSON is required");
  }
  return JSON.parse(raw);
}

function writeOutput(name, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) {
    process.stdout.write(`${name}=${value}\n`);
    return;
  }
  fs.appendFileSync(out, `${name}=${String(value ?? "")}\n`);
}

function writeSummary(markdown) {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) {
    process.stdout.write(`${markdown}\n`);
    return;
  }
  fs.appendFileSync(summary, `${markdown}\n`);
}

async function githubJson(url, { token, method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "fiziyo-e2e-dispatch",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { status: response.status, data };
}

async function setCommitStatus({
  token,
  owner,
  repo,
  sha,
  state,
  context,
  description,
  targetUrl,
}) {
  if (!token || !owner || !repo || !sha) {
    return;
  }
  await githubJson(`https://api.github.com/repos/${owner}/${repo}/statuses/${sha}`, {
    token,
    method: "POST",
    body: {
      state,
      context,
      description: description.slice(0, 140),
      target_url: targetUrl || undefined,
    },
  });
}

export async function cmdResolve() {
  const event = readEvent();
  const environmentName = event.deployment_status?.environment ?? "";
  const targetUrl = event.deployment_status?.target_url ?? "";
  const deploymentRef = event.deployment?.ref ?? "";
  const deploymentSha = event.deployment?.sha ?? "";

  const scope = resolveE2eScope({ environmentName, targetUrl, deploymentRef });

  writeOutput("action", scope.action);
  writeOutput("project", scope.project);
  writeOutput("event_type", scope.eventType);
  writeOutput("base_url", scope.baseUrl);
  writeOutput("reason", scope.reason);
  writeOutput("status_context", scope.statusContext);
  writeOutput("sha", deploymentSha);
  writeOutput("environment", environmentName);
  writeOutput("target_url", targetUrl);

  writeSummary(
    [
      "## E2E trigger",
      "",
      `- action: \`${scope.action}\``,
      `- reason: \`${scope.reason}\``,
      `- env: \`${environmentName || "<empty>"}\``,
      `- url: \`${targetUrl || "<empty>"}\``,
      `- ref: \`${deploymentRef || "<empty>"}\``,
      `- sha: \`${deploymentSha || "<empty>"}\``,
      scope.action === "skip"
        ? "- Preview nie dostaje E2E. Full suite jedzie tylko z kanonicznego DEV (`devportal.fiziyo.pl`)."
        : `- dispatch ${scope.eventType} / ${scope.project} → ${scope.baseUrl}`,
    ].join("\n"),
  );
}

export async function cmdDispatch() {
  const event = readEvent();
  const deploymentSha = event.deployment?.sha ?? process.env.ADMIN_SHA ?? "";
  const environmentName = event.deployment_status?.environment ?? "";
  const targetUrl = event.deployment_status?.target_url ?? "";
  const adminOwner = process.env.GITHUB_REPOSITORY_OWNER;
  const adminRepo = (process.env.GITHUB_REPOSITORY || "").split("/")[1];
  const testsOwner = process.env.TESTS_REPO_OWNER || adminOwner;
  const testsRepo = process.env.TESTS_REPO_NAME || TESTS_REPO_DEFAULT;
  const eventType = process.env.EVENT_TYPE;
  const project = process.env.PROJECT;
  const baseUrl = process.env.BASE_URL;
  const statusContext = process.env.STATUS_CONTEXT || "E2E Dispatch";
  const dispatchToken = process.env.E2E_DISPATCH_PAT || "";
  const statusToken = process.env.GITHUB_TOKEN || "";
  const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

  if (!deploymentSha || !environmentName) {
    throw new Error("Missing deployment payload fields required for dispatch.");
  }

  if (!dispatchToken.trim()) {
    const classified = classifyGitHubError({ code: "missing_secret" });
    await setCommitStatus({
      token: statusToken,
      owner: adminOwner,
      repo: adminRepo,
      sha: deploymentSha,
      state: "failure",
      context: "E2E Dispatch",
      description: classified.message,
      targetUrl: runUrl,
    });
    writeSummary(repairInstructions(classified.code));
    throw new Error(classified.message);
  }

  try {
    await githubJson(`https://api.github.com/repos/${testsOwner}/${testsRepo}`, {
      token: dispatchToken,
    });
  } catch (error) {
    const classified = classifyGitHubError(error);
    await setCommitStatus({
      token: statusToken,
      owner: adminOwner,
      repo: adminRepo,
      sha: deploymentSha,
      state: "failure",
      context: "E2E Dispatch",
      description: classified.message,
      targetUrl: runUrl,
    });
    writeSummary(repairInstructions(classified.code));
    throw new Error(`${classified.code}: ${classified.message}`);
  }

  try {
    const result = await githubJson(
      `https://api.github.com/repos/${testsOwner}/${testsRepo}/dispatches`,
      {
        token: dispatchToken,
        method: "POST",
        body: {
          event_type: eventType,
          client_payload: {
            base_url: baseUrl,
            deployment_url: targetUrl || "",
            environment: environmentName,
            sha: deploymentSha,
            project,
            admin_owner: adminOwner,
            admin_repo: adminRepo,
            run_id: String(process.env.GITHUB_RUN_ID || ""),
            tests_sha: process.env.TESTS_SHA || "",
          },
        },
      },
    );

    if (result.status !== 204 && result.status !== 200) {
      throw Object.assign(new Error(`Unexpected dispatch status ${result.status}`), {
        status: result.status,
      });
    }

    await setCommitStatus({
      token: statusToken,
      owner: adminOwner,
      repo: adminRepo,
      sha: deploymentSha,
      state: "pending",
      context: statusContext,
      description: "E2E dispatch accepted (204)",
      targetUrl: runUrl,
    });

    writeSummary(
      [
        "## E2E dispatch",
        "",
        `- API: \`204\``,
        `- repo: \`${testsOwner}/${testsRepo}\``,
        `- event: \`${eventType}\``,
        `- project: \`${project}\``,
        `- base_url: \`${baseUrl}\``,
      ].join("\n"),
    );
  } catch (error) {
    const classified = classifyGitHubError(error);
    await setCommitStatus({
      token: statusToken,
      owner: adminOwner,
      repo: adminRepo,
      sha: deploymentSha,
      state: "failure",
      context: "E2E Dispatch",
      description: classified.message,
      targetUrl: runUrl,
    });
    writeSummary(repairInstructions(classified.code));
    throw new Error(`${classified.code}: ${classified.message}`);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const command = process.argv[2];
  const run = command === "dispatch" ? cmdDispatch : cmdResolve;
  run().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
