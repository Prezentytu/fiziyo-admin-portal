import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEV_API_ORIGIN, PROD_API_ORIGIN } from "./promote-admin.mjs";
import {
  LEGACY_INTEGRATION_BRANCH,
  TRUNK_BRANCH,
  VERCEL_PRODUCTION_BRANCH,
  aliasDevDomain,
  assertDevIdentity,
  assertPreviewDeployment,
  assertTrunkIsNotProductionBranch,
  isDevDomain,
  listProjectDomains,
  pinDevportalDomain,
  planDevDomainAssignment,
  selectMainPreviewDeployment,
  shouldSkipAlias,
} from "./pin-devportal-domain.mjs";

const SHA = "b".repeat(40);
const DPL = "dpl_previewmain1234";
const PROD_DPL = "dpl_Cyw6Zg65zJ3EnSsLsGGmeCudToi9";
const ENV = { VERCEL_TOKEN: "n".repeat(24), VERCEL_PROJECT_ID: "prj_abc123" };
const noSleep = async () => {};

function identityHeaders({ sha = SHA, apiOrigin = DEV_API_ORIGIN, deploymentId = DPL } = {}) {
  return new Headers({
    "x-fiziyo-release-schema": "1",
    "x-fiziyo-admin-sha": sha,
    "x-fiziyo-deployment-id": deploymentId,
    "x-fiziyo-api-origin": apiOrigin,
  });
}

function json(payload, status = 200) {
  return { ok: status < 400, status, text: async () => JSON.stringify(payload) };
}

function vercelMock({ productionBranch = VERCEL_PRODUCTION_BRANCH, gitBranch = TRUNK_BRANCH, live = {}, commitRef = "main" } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined });
    if (url.endsWith("/sign-in")) return { ok: true, status: 200, headers: identityHeaders(live) };
    if (url.includes("/domains") && options.method === "GET") {
      return json({ domains: [{ name: "devportal.fiziyo.pl", gitBranch }] });
    }
    if (/\/v9\/projects\/[^/?]+(\?|$)/.test(url)) return json({ link: { productionBranch } });
    if (url.includes("/v6/deployments")) {
      return json({
        deployments: [{ id: DPL, target: "preview", readyState: "READY", meta: { githubCommitSha: SHA, githubCommitRef: commitRef } }],
      });
    }
    return json({});
  };
  return { calls, fetchImpl };
}

describe("pin-devportal-domain", () => {
  it("binds DEV domains to the trunk and never leaves them branchless", () => {
    assert.equal(isDevDomain("devportal.fiziyo.pl"), true);
    assert.deepEqual(planDevDomainAssignment({ name: "devportal.fiziyo.pl", gitBranch: LEGACY_INTEGRATION_BRANCH }), {
      action: "assign",
      gitBranch: TRUNK_BRANCH,
      previous: LEGACY_INTEGRATION_BRANCH,
    });
    assert.deepEqual(planDevDomainAssignment({ name: "devportal.fiziyo.pl", gitBranch: null }), {
      action: "assign",
      gitBranch: TRUNK_BRANCH,
      previous: null,
    });
    assert.deepEqual(planDevDomainAssignment({ name: "devportal.fiziyo.pl", gitBranch: TRUNK_BRANCH }), {
      action: "keep",
      gitBranch: TRUNK_BRANCH,
      previous: TRUNK_BRANCH,
    });
  });

  it("refuses a Vercel project whose Production Branch is the trunk", () => {
    assert.throws(() => assertTrunkIsNotProductionBranch({ link: { productionBranch: "main" } }), /Production Branch = "main"/);
    assert.throws(() => assertTrunkIsNotProductionBranch({}), /Production Branch/);
    assert.equal(assertTrunkIsNotProductionBranch({ link: { productionBranch: VERCEL_PRODUCTION_BRANCH } }), VERCEL_PRODUCTION_BRANCH);
  });

  it("never aliases production to the DEV host", () => {
    assert.throws(() => assertPreviewDeployment({ id: DPL, target: "production" }), /production/);
    assert.equal(
      selectMainPreviewDeployment(
        [{ id: DPL, target: "production", readyState: "READY", meta: { githubCommitSha: SHA, githubCommitRef: "main" } }],
        SHA
      ),
      null
    );
    const preview = { id: DPL, target: "preview", readyState: "READY", meta: { githubCommitSha: SHA, githubCommitRef: "main" } };
    assert.equal(selectMainPreviewDeployment([preview], SHA), preview);
    assert.equal(shouldSkipAlias({ environment: "Production" }), "production");
    assert.equal(shouldSkipAlias({ ref: "dev" }), "legacy-dev-branch");
    assert.equal(shouldSkipAlias({ ref: "main", environment: "Preview" }), "");
  });

  it("rejects DEV serving the production API or a stale SHA", () => {
    const observed = { schema: "1", sha: SHA, deploymentId: DPL, apiOrigin: PROD_API_ORIGIN };
    assert.throws(() => assertDevIdentity(observed), /zamiast https:\/\/fizjo-app-api/);
    assert.throws(() => assertDevIdentity({ ...observed, apiOrigin: DEV_API_ORIGIN }, { sha: "c".repeat(40) }), /SHA/);
    assert.equal(assertDevIdentity({ ...observed, apiOrigin: DEV_API_ORIGIN }, { sha: SHA }).deploymentId, DPL);
  });

  it("stops before touching domains when main is the Vercel Production Branch", async () => {
    const { calls, fetchImpl } = vercelMock({ productionBranch: "main", gitBranch: null });
    await assert.rejects(() => pinDevportalDomain({ ...ENV, DEPLOYMENT_SHA: SHA }, { fetchImpl, sleep: noSleep }), /Production Branch/);
    assert.equal(calls.some((item) => item.method === "PATCH" || item.url.includes("/v2/aliases")), false);
  });

  it("re-binds a branchless DEV domain, aliases Preview of main and verifies DEV API", async () => {
    const { calls, fetchImpl } = vercelMock({ gitBranch: null });
    const pinned = await pinDevportalDomain({ ...ENV, DEPLOYMENT_REF: SHA, DEPLOYMENT_SHA: SHA }, { fetchImpl, sleep: noSleep });
    assert.equal(pinned.aliased, true);
    assert.equal(pinned.deploymentId, DPL);
    assert.equal(pinned.apiOrigin, DEV_API_ORIGIN);
    assert.deepEqual(pinned.reassigned, [{ name: "devportal.fiziyo.pl", from: null, to: TRUNK_BRANCH }]);
    assert.equal(calls.some((item) => item.method === "PATCH" && item.body?.gitBranch === TRUNK_BRANCH), true);
    assert.equal(calls.some((item) => item.body && "gitBranch" in item.body && item.body.gitBranch === null), false);
    assert.equal(calls.some((item) => item.url.includes("/v2/aliases") && item.body?.alias === "devportal.fiziyo.pl"), true);
    await assert.rejects(() => aliasDevDomain(fetchImpl, ENV, "bad"));
  });

  it("skips a PR Preview without aliasing or failing, but still verifies the DEV API", async () => {
    const { calls, fetchImpl } = vercelMock({ commitRef: "cursor/k01-wyszukiwanie-a18f", live: { sha: "c".repeat(40) } });
    const result = await pinDevportalDomain(
      { ...ENV, DEPLOYMENT_REF: SHA, DEPLOYMENT_SHA: SHA, DEPLOYMENT_ENV: "Preview" },
      { fetchImpl, sleep: noSleep }
    );
    assert.equal(result.skipped, "feature-preview");
    assert.equal(result.aliased, false);
    assert.equal(result.apiOrigin, DEV_API_ORIGIN);
    assert.equal(calls.some((item) => item.url.includes("/v2/aliases")), false);
  });

  it("fails a Production deployment event when DEV ended up on the production build", async () => {
    const { calls, fetchImpl } = vercelMock({ live: { apiOrigin: PROD_API_ORIGIN, deploymentId: PROD_DPL } });
    await assert.rejects(
      () => pinDevportalDomain({ ...ENV, DEPLOYMENT_ENV: "Production", DEPLOYMENT_SHA: SHA }, { fetchImpl, sleep: noSleep }),
      /DEV serwuje API/
    );
    assert.equal(calls.some((item) => item.url.includes("/v2/aliases")), false);
  });

  it("skips the alias for a leftover dev deployment but still enforces the domain binding", async () => {
    const { calls, fetchImpl } = vercelMock({ gitBranch: LEGACY_INTEGRATION_BRANCH });
    const result = await pinDevportalDomain({ ...ENV, DEPLOYMENT_REF: "dev", DEPLOYMENT_SHA: SHA }, { fetchImpl, sleep: noSleep });
    assert.equal(result.skipped, "legacy-dev-branch");
    assert.equal(result.aliased, false);
    assert.equal(result.reassigned[0].from, "dev");
    assert.equal(calls.some((item) => item.url.includes("/v2/aliases")), false);
  });

  it("sends a team slug as slug and surfaces the Vercel 400 body", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      return json({ error: { code: "bad_request", message: "invalid teamId" } }, 400);
    };

    await assert.rejects(
      () => listProjectDomains(fetchImpl, { ...ENV, VERCEL_TEAM_ID: "prezentytus-projects" }),
      /400 bad_request: invalid teamId/
    );
    assert.match(calls[0], /[?&]slug=prezentytus-projects/);
    assert.doesNotMatch(calls[0], /teamId=/);
  });
});
