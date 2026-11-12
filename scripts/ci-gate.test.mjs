import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  auditVerdict,
  classifyCheckRuns,
  evaluateNeeds,
  summarizeAudit,
  waitForChecks,
} from "./ci-gate.mjs";

describe("evaluateNeeds", () => {
  it("passes only when every needed job succeeded", () => {
    assert.equal(evaluateNeeds({ validate: { result: "success" }, audit: { result: "success" } }).ok, true);
  });

  it("fails on failure, cancelled and skipped jobs", () => {
    for (const result of ["failure", "cancelled", "skipped"]) {
      const verdict = evaluateNeeds({ validate: { result }, audit: { result: "success" } });
      assert.equal(verdict.ok, false, result);
      assert.deepEqual(verdict.failed, [{ job: "validate", result }]);
    }
  });

  it("fails closed on empty or malformed input", () => {
    assert.equal(evaluateNeeds({}).ok, false);
    assert.equal(evaluateNeeds(null).ok, false);
  });
});

const run = (overrides) => ({ id: 1, name: "review", status: "completed", conclusion: "success", ...overrides });

describe("classifyCheckRuns", () => {
  it("is pending while the required check does not exist yet", () => {
    assert.equal(classifyCheckRuns([], ["review"], { draft: false }).state, "pending");
  });

  it("is pending while the check is queued or running", () => {
    assert.equal(classifyCheckRuns([run({ status: "in_progress", conclusion: null })], ["review"], {}).state, "pending");
  });

  it("passes on success", () => {
    assert.equal(classifyCheckRuns([run()], ["review"], { draft: false }).state, "pass");
  });

  it("fails on failure, cancelled, timed_out and action_required", () => {
    for (const conclusion of ["failure", "cancelled", "timed_out", "action_required"]) {
      assert.equal(classifyCheckRuns([run({ conclusion })], ["review"], {}).state, "fail", conclusion);
    }
  });

  it("looks only at the newest run of a name", () => {
    const runs = [run({ id: 1, conclusion: "cancelled" }), run({ id: 2, conclusion: "success" })];
    assert.equal(classifyCheckRuns(runs, ["review"], {}).state, "pass");
    const reversed = [run({ id: 3, conclusion: "failure" }), run({ id: 2, conclusion: "success" })];
    assert.equal(classifyCheckRuns(reversed, ["review"], {}).state, "fail");
  });

  it("accepts skipped review on a draft but not on a ready PR", () => {
    const skipped = [run({ conclusion: "skipped" })];
    assert.equal(classifyCheckRuns(skipped, ["review"], { draft: true }).state, "pass");
    assert.equal(classifyCheckRuns(skipped, ["review"], { draft: false }).state, "pending");
  });

  it("ignores checks that are not required, including the gate itself", () => {
    const runs = [run({ name: "gate", status: "in_progress", conclusion: null, id: 9 }), run()];
    assert.equal(classifyCheckRuns(runs, ["review"], {}).state, "pass");
  });

  it("fail wins over pending", () => {
    const runs = [run({ name: "a", conclusion: "failure" }), run({ name: "b", status: "queued", conclusion: null })];
    assert.equal(classifyCheckRuns(runs, ["a", "b"], {}).state, "fail");
  });
});

function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms) => { t += ms; } };
}

describe("waitForChecks", () => {
  it("polls until the check completes", async () => {
    const { now, sleep } = clock();
    const answers = [[], [run({ status: "queued", conclusion: null })], [run()]];
    let calls = 0;
    const result = await waitForChecks({
      listCheckRuns: async () => answers[Math.min(calls++, answers.length - 1)],
      required: ["review"],
      draft: false,
      timeoutMs: 60_000,
      intervalMs: 5_000,
      now,
      sleep,
    });
    assert.equal(result.ok, true);
    assert.equal(calls, 3);
  });

  it("fails immediately when a required check failed", async () => {
    const { now, sleep } = clock();
    let calls = 0;
    const result = await waitForChecks({
      listCheckRuns: async () => { calls++; return [run({ conclusion: "failure" })]; },
      required: ["review"],
      draft: false,
      timeoutMs: 60_000,
      intervalMs: 5_000,
      now,
      sleep,
    });
    assert.equal(result.ok, false);
    assert.equal(calls, 1);
  });

  it("fails on timeout when the check never completes", async () => {
    const { now, sleep } = clock();
    const result = await waitForChecks({
      listCheckRuns: async () => [],
      required: ["review"],
      draft: false,
      timeoutMs: 20_000,
      intervalMs: 5_000,
      now,
      sleep,
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /timeout/i);
  });

  it("survives a transient API error and keeps polling", async () => {
    const { now, sleep } = clock();
    let calls = 0;
    const result = await waitForChecks({
      listCheckRuns: async () => { if (calls++ === 0) throw new Error("502"); return [run()]; },
      required: ["review"],
      draft: false,
      timeoutMs: 60_000,
      intervalMs: 5_000,
      now,
      sleep,
    });
    assert.equal(result.ok, true);
  });
});

describe("audit", () => {
  const report = {
    vulnerabilities: {
      "fast-uri": { name: "fast-uri", severity: "moderate" },
      "source-map-js": { name: "source-map-js", severity: "high" },
      lodash: { name: "lodash", severity: "critical" },
    },
  };

  it("lists high and critical findings as blocking", () => {
    const summary = summarizeAudit(report);
    assert.deepEqual(summary.blocking.map((v) => v.name).sort(), ["lodash", "source-map-js"]);
    assert.equal(summary.error, undefined);
  });

  it("report mode never blocks, enforce mode blocks on findings", () => {
    const summary = summarizeAudit(report);
    assert.equal(auditVerdict(summary, "report").exitCode, 0);
    assert.equal(auditVerdict(summary, "enforce").exitCode, 1);
  });

  it("is clean without high findings", () => {
    const summary = summarizeAudit({ vulnerabilities: { x: { name: "x", severity: "low" } } });
    assert.equal(auditVerdict(summary, "enforce").exitCode, 0);
  });

  it("treats an npm error payload as unavailable: warns in report, fails in enforce", () => {
    const summary = summarizeAudit({ error: { code: "ENOTFOUND", summary: "network" } });
    assert.ok(summary.error);
    assert.equal(auditVerdict(summary, "report").exitCode, 0);
    assert.equal(auditVerdict(summary, "enforce").exitCode, 1);
  });

  it("treats unparsable output as unavailable", () => {
    assert.ok(summarizeAudit(undefined).error);
  });

  it("rejects an unknown mode", () => {
    assert.throws(() => auditVerdict(summarizeAudit(report), "yolo"));
  });
});
