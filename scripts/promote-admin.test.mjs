import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  DEV_API_ORIGIN,
  DEV_APP_URL,
  PROD_API_ORIGIN,
  PROD_APP_URL,
  assertIdentity,
  canSkipDevIdentity,
  executePromote,
  normalizeDeploymentId,
  normalizeSha,
  planPromote,
  promoteAdmin,
  readIdentity,
  requireAncestor,
  requireMain,
  selectSourceDeployment,
} from "./promote-admin.mjs";

const SHA = "a".repeat(40);
const OTHER = "b".repeat(40);
const DPL = "dpl_abcdefgh12345678";
const PROD_DPL = "dpl_prodabcdefgh12";

const identityHeaders = (overrides = {}) =>
  new Headers({
    "x-fiziyo-release-schema": "1",
    "x-fiziyo-admin-sha": SHA,
    "x-fiziyo-deployment-id": DPL,
    "x-fiziyo-api-origin": DEV_API_ORIGIN,
    ...overrides,
  });

describe("promote-admin gates", () => {
  it("accepts a full SHA and the main tip fallback", () => {
    assert.equal(normalizeSha(SHA), SHA);
    assert.equal(normalizeSha("  ", SHA), SHA);
    assert.throws(() => normalizeSha("main"), /40/);
    requireMain("refs/heads/main");
    assert.throws(() => requireMain("refs/heads/dev"), /main/);
    requireAncestor("true");
    assert.throws(() => requireAncestor("false"), /main/);
  });

  it("skips only live DEV identity with a long override", () => {
    assert.equal(canSkipDevIdentity("hotfix outage"), true);
    assert.equal(canSkipDevIdentity("short"), false);
  });

  it("never aliases a preview deployment", () => {
    const preview = { id: DPL, target: "preview", readyState: "READY", meta: { githubCommitSha: SHA } };
    const production = { uid: PROD_DPL.slice(4), target: "production", readyState: "READY", meta: { githubCommitSha: SHA } };
    assert.deepEqual(selectSourceDeployment([preview], SHA), { kind: "preview", deployment: preview });
    assert.equal(selectSourceDeployment([preview], OTHER).kind, "missing");
    assert.deepEqual(planPromote({ source: { kind: "preview", deployment: preview } }), {
      action: "rebuild",
      sourceId: DPL,
      reason: "preview-cannot-alias",
    });
    assert.deepEqual(planPromote({ source: { kind: "production", deployment: production } }), {
      action: "alias",
      sourceId: PROD_DPL,
    });
    assert.deepEqual(planPromote({ source: { kind: "missing", deployment: null } }), { action: "create-git" });
    assert.equal(planPromote({ explicitDeployment: preview }).action, "rebuild");
    assert.equal(planPromote({ explicitDeployment: { id: PROD_DPL, target: "production" } }).action, "alias");
  });

  it("rejects a broken live identity", () => {
    assert.throws(
      () => assertIdentity(readIdentity(identityHeaders({ "x-fiziyo-api-origin": PROD_API_ORIGIN })), { sha: SHA, apiOrigin: DEV_API_ORIGIN }),
      /identity/
    );
    assert.throws(() => normalizeDeploymentId("dpl_bad/id"), /identyfikator/);
  });
});

describe("promote-admin vercel plan", () => {
  it("rebuilds preview and aliases only production", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, method: options.method, body: options.body });
      return { ok: true, status: 201, text: async () => JSON.stringify({ id: PROD_DPL }) };
    };
    const rebuilt = await executePromote(
      fetchImpl,
      { VERCEL_TOKEN: "v".repeat(24), VERCEL_PROJECT_ID: "prj_abc123", VERCEL_TEAM_ID: "team_1" },
      { action: "rebuild", sourceId: DPL },
      SHA
    );
    assert.equal(rebuilt.rebuilt, true);
    assert.match(calls[0].url, /\/v13\/deployments\?teamId=team_1/);
    assert.deepEqual(JSON.parse(calls[0].body), {
      name: "fiziyo-admin-portal",
      deploymentId: DPL,
      target: "production",
      meta: { action: "promote" },
    });

    const aliased = await executePromote(
      fetchImpl,
      { VERCEL_TOKEN: "v".repeat(24), VERCEL_PROJECT_ID: "prj_abc123" },
      { action: "alias", sourceId: PROD_DPL },
      SHA
    );
    assert.equal(aliased.rebuilt, false);
    assert.match(calls[1].url, /\/v10\/projects\/prj_abc123\/promote\/dpl_prodabcdefgh12$/);
    assert.equal(JSON.parse(calls[1].body).constructor, Object);
  });

  it("promotes a preview SHA through rebuild and waits for prod identity", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push(url);
      if (url === `${DEV_APP_URL}/sign-in`) {
        return { ok: true, headers: identityHeaders() };
      }
      if (url.startsWith("https://api.vercel.com/v6/deployments")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              deployments: [{ id: DPL, target: null, readyState: "READY", meta: { githubCommitSha: SHA } }],
            }),
        };
      }
      if (url.includes("/v13/deployments") && options.method === "POST") {
        return { ok: true, status: 201, text: async () => JSON.stringify({ id: PROD_DPL }) };
      }
      if (url.includes(`/v13/deployments/${PROD_DPL}`)) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ readyState: "READY", id: PROD_DPL }) };
      }
      if (url === `${PROD_APP_URL}/sign-in`) {
        return { ok: true, headers: identityHeaders({ "x-fiziyo-deployment-id": PROD_DPL, "x-fiziyo-api-origin": PROD_API_ORIGIN }) };
      }
      throw new Error(`unexpected ${url}`);
    };

    const result = await promoteAdmin(
      {
        GITHUB_REF: "refs/heads/main",
        ADMIN_SHA: SHA,
        IS_ANCESTOR: "true",
        VERCEL_TOKEN: "v".repeat(24),
        VERCEL_PROJECT_ID: "prj_abc123",
      },
      { fetchImpl, sleep: async () => undefined, now: () => "2026-09-15T00:00:00.000Z" }
    );

    assert.deepEqual(result, {
      schemaVersion: 1,
      action: "rebuild",
      sha: SHA,
      deploymentId: PROD_DPL,
      rebuilt: true,
      skippedDevIdentity: false,
      completedAt: "2026-09-15T00:00:00.000Z",
    });
    assert.equal(calls.some((url) => url.includes("/v10/projects/")), false);
  });

  it("fails closed on a missing token and does not hit Vercel", async () => {
    const calls = [];
    await assert.rejects(
      () =>
        promoteAdmin(
          {
            GITHUB_REF: "refs/heads/main",
            ADMIN_SHA: SHA,
            IS_ANCESTOR: "true",
            OVERRIDE_REASON: "break-glass DEV down",
            VERCEL_PROJECT_ID: "prj_abc123",
          },
          { fetchImpl: async (url) => { calls.push(url); throw new Error("network"); } }
        ),
      /VERCEL_TOKEN/
    );
    assert.deepEqual(calls, []);
  });
});

describe("promote-admin workflow contract", () => {
  it("is manual on main and keeps secrets in env", () => {
    const yaml = fs.readFileSync(new URL("../.github/workflows/promote.yml", import.meta.url), "utf8");
    assert.match(yaml, /^name: Promote admin/m);
    assert.match(yaml, /workflow_dispatch:/);
    assert.doesNotMatch(yaml, /push:/);
    assert.doesNotMatch(yaml, /pull_request:/);
    assert.match(yaml, /group: deploy-prod-admin/);
    assert.match(yaml, /name: production/);
    assert.match(yaml, /url: https:\/\/portal\.fiziyo\.pl/);
    assert.match(yaml, /secrets\.VERCEL_TOKEN/);
    assert.ok(yaml.includes("DEPLOYMENT_ID: ${{ inputs.deployment_id }}"));
    assert.match(yaml, /run: node scripts\/promote-admin\.mjs/);
    assert.doesNotMatch(yaml.split("- name: Promote")[1].split("run:")[1], /\$\{\{ inputs\./);
    assert.doesNotMatch(yaml, /vercel --prod/);
  });
});
