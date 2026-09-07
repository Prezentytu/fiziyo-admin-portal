import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyGitHubError,
  repairInstructions,
  resolveE2eScope,
} from "./e2e-dispatch.mjs";

describe("resolveE2eScope", () => {
  it("routes production to prod-safe", () => {
    const scope = resolveE2eScope({
      environmentName: "Production",
      targetUrl: "https://portal.fiziyo.pl",
    });
    assert.equal(scope.action, "dispatch");
    assert.equal(scope.eventType, "e2e-prod-run");
    assert.equal(scope.project, "prod-safe");
    assert.equal(scope.baseUrl, "https://portal.fiziyo.pl");
  });

  it("routes dedicated DEV domain to full suite", () => {
    const scope = resolveE2eScope({
      environmentName: "Preview",
      targetUrl: "https://devportal.fiziyo.pl",
    });
    assert.equal(scope.action, "dispatch");
    assert.equal(scope.eventType, "e2e-dev-run");
    assert.equal(scope.project, "all");
    assert.equal(scope.baseUrl, "https://devportal.fiziyo.pl");
  });

  it("skips generic Vercel preview", () => {
    const scope = resolveE2eScope({
      environmentName: "Preview",
      targetUrl: "https://fiziyo-admin-portal-okjoxc1w8-prezentytus-projects.vercel.app",
      deploymentRef: "feat/foo",
    });
    assert.equal(scope.action, "skip");
    assert.equal(scope.reason, "generic-preview");
  });

  it("does not send Preview SHA to shared DEV", () => {
    const scope = resolveE2eScope({
      environmentName: "Preview",
      targetUrl: "https://fiziyo-admin-portal-okjoxc1w8-prezentytus-projects.vercel.app",
      deploymentRef: "dev",
    });
    assert.equal(scope.action, "skip");
  });
});

describe("classifyGitHubError", () => {
  it("classifies missing secret", () => {
    const result = classifyGitHubError({ code: "missing_secret" });
    assert.equal(result.code, "missing_secret");
  });

  it("classifies 401 as invalid token", () => {
    const result = classifyGitHubError({ status: 401, message: "Bad credentials" });
    assert.equal(result.code, "invalid_token");
    assert.match(result.message, /401/);
  });

  it("classifies 403 as permission or SSO", () => {
    const result = classifyGitHubError({ status: 403, message: "Resource not accessible" });
    assert.equal(result.code, "permission_or_sso");
  });

  it("repair instructions mention PAT rotation", () => {
    assert.match(repairInstructions("invalid_token"), /E2E_DISPATCH_PAT/);
    assert.match(repairInstructions("invalid_token"), /invalid_token/);
  });
});
