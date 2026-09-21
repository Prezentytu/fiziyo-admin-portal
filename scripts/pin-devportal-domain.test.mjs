import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LEGACY_INTEGRATION_BRANCH,
  TRUNK_BRANCH,
  aliasDevDomain,
  assertPreviewDeployment,
  isDevDomain,
  listProjectDomains,
  pinDevportalDomain,
  planDevDomainAssignment,
  selectMainPreviewDeployment,
  shouldSkipPin,
} from "./pin-devportal-domain.mjs";

const SHA = "b".repeat(40);
const DPL = "dpl_previewmain1234";

describe("pin-devportal-domain", () => {
  it("detaches leftover git branches instead of assigning the production branch", () => {
    assert.equal(isDevDomain("devportal.fiziyo.pl"), true);
    assert.deepEqual(planDevDomainAssignment({ name: "devportal.fiziyo.pl", gitBranch: LEGACY_INTEGRATION_BRANCH }), {
      action: "detach",
      gitBranch: null,
      previous: LEGACY_INTEGRATION_BRANCH,
    });
    assert.deepEqual(planDevDomainAssignment({ name: "devportal.fiziyo.pl", gitBranch: TRUNK_BRANCH }), {
      action: "detach",
      gitBranch: null,
      previous: TRUNK_BRANCH,
    });
    assert.deepEqual(planDevDomainAssignment({ name: "devportal.fiziyo.pl", gitBranch: null }), {
      action: "keep",
      gitBranch: null,
      previous: null,
    });
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
    const preview = {
      id: DPL,
      target: "preview",
      readyState: "READY",
      meta: { githubCommitSha: SHA, githubCommitRef: "main" },
    };
    assert.equal(selectMainPreviewDeployment([preview], SHA), preview);
    assert.equal(shouldSkipPin({ environment: "Production" }), "production");
    assert.equal(shouldSkipPin({ ref: "dev" }), "legacy-dev-branch");
    assert.equal(shouldSkipPin({ ref: "main", environment: "Preview" }), "");
  });

  it("pins Preview of main and ignores a leftover dev deployment", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined });
      if (url.includes("/domains") && options.method === "GET") {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ domains: [{ name: "devportal.fiziyo.pl", gitBranch: "dev" }] }),
        };
      }
      if (url.includes("/v6/deployments")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              deployments: [
                { id: DPL, target: "preview", readyState: "READY", meta: { githubCommitSha: SHA, githubCommitRef: "main" } },
              ],
            }),
        };
      }
      return { ok: true, status: 200, text: async () => "{}" };
    };

    const ignored = await pinDevportalDomain(
      {
        VERCEL_TOKEN: "n".repeat(24),
        VERCEL_PROJECT_ID: "prj_abc123",
        DEPLOYMENT_REF: "dev",
        DEPLOYMENT_SHA: SHA,
      },
      { fetchImpl }
    );
    assert.equal(ignored.aliased, false);
    assert.equal(ignored.skipped, "legacy-dev-branch");
    assert.equal(ignored.reassigned[0].from, "dev");

    const pinned = await pinDevportalDomain(
      {
        VERCEL_TOKEN: "n".repeat(24),
        VERCEL_PROJECT_ID: "prj_abc123",
        DEPLOYMENT_REF: "main",
        DEPLOYMENT_SHA: SHA,
      },
      { fetchImpl }
    );
    assert.equal(pinned.aliased, true);
    assert.equal(pinned.deploymentId, DPL);
    assert.equal(
      calls.some((item) => item.method === "PATCH" && item.url.includes("/domains/") && item.body?.gitBranch === null),
      true
    );
    assert.equal(calls.some((item) => item.body?.gitBranch === "main"), false);
    assert.equal(calls.some((item) => item.url.includes("/v2/aliases") && item.body?.alias === "devportal.fiziyo.pl"), true);
    await assert.rejects(() => aliasDevDomain(fetchImpl, { VERCEL_TOKEN: "n".repeat(24), VERCEL_PROJECT_ID: "prj_abc123" }, "bad"));
  });

  it("sends a team slug as slug and surfaces the Vercel 400 body", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { code: "bad_request", message: "invalid teamId" } }),
      };
    };

    await assert.rejects(
      () =>
        listProjectDomains(fetchImpl, {
          VERCEL_TOKEN: "n".repeat(24),
          VERCEL_PROJECT_ID: "prj_abc123",
          VERCEL_TEAM_ID: "prezentytus-projects",
        }),
      /400 bad_request: invalid teamId/
    );
    assert.match(calls[0], /[?&]slug=prezentytus-projects/);
    assert.doesNotMatch(calls[0], /teamId=/);
  });
});
