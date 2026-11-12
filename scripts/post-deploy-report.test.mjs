import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertDevUrl,
  buildComment,
  pickMergedPr,
  waitForDeploy,
} from "./post-deploy-report.mjs";

const MERGE = "a".repeat(40);
const LATER = "b".repeat(40);
const OLDER = "c".repeat(40);

function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms) => { t += ms; } };
}

const base = (extra) => ({
  mergeSha: MERGE,
  timeoutMs: 60_000,
  intervalMs: 5_000,
  ...clock(),
  ...extra,
});

describe("waitForDeploy", () => {
  it("confirms when devportal serves the merge commit", async () => {
    const result = await waitForDeploy(base({
      readDeployed: async () => ({ sha: MERGE, deploymentId: "dpl_12345678" }),
      compare: async () => { throw new Error("not needed for identical sha"); },
    }));
    assert.equal(result.state, "identical");
    assert.equal(result.deployedSha, MERGE);
    assert.equal(result.deploymentId, "dpl_12345678");
  });

  it("confirms a later commit that contains the merge commit", async () => {
    const result = await waitForDeploy(base({
      readDeployed: async () => ({ sha: LATER }),
      compare: async (from, to) => { assert.deepEqual([from, to], [MERGE, LATER]); return "ahead"; },
    }));
    assert.equal(result.state, "later");
  });

  it("keeps polling while devportal serves an older commit, then confirms", async () => {
    const served = [OLDER, OLDER, MERGE];
    let i = 0;
    const result = await waitForDeploy(base({
      readDeployed: async () => ({ sha: served[i++] }),
      compare: async () => "behind",
    }));
    assert.equal(result.state, "identical");
    assert.equal(i, 3);
  });

  it("reports timeout with the last observed sha when it never catches up", async () => {
    const result = await waitForDeploy(base({
      readDeployed: async () => ({ sha: OLDER }),
      compare: async () => "behind",
    }));
    assert.equal(result.state, "timeout");
    assert.equal(result.deployedSha, OLDER);
  });

  it("treats a diverged commit as not deployed", async () => {
    const result = await waitForDeploy(base({
      readDeployed: async () => ({ sha: OLDER }),
      compare: async () => "diverged",
    }));
    assert.equal(result.state, "timeout");
  });

  it("survives unreachable devportal and reports timeout without sha", async () => {
    const result = await waitForDeploy(base({
      readDeployed: async () => { throw new Error("ECONNRESET"); },
      compare: async () => "ahead",
    }));
    assert.equal(result.state, "timeout");
    assert.equal(result.deployedSha, undefined);
  });

  it("ignores a header that is not a 40-char sha", async () => {
    const result = await waitForDeploy(base({
      readDeployed: async () => ({ sha: "not-a-sha" }),
      compare: async () => "ahead",
    }));
    assert.equal(result.state, "timeout");
  });
});

describe("assertDevUrl", () => {
  it("accepts devportal", () => {
    assert.equal(assertDevUrl("https://devportal.fiziyo.pl"), "https://devportal.fiziyo.pl");
  });

  it("refuses PROD and anything else", () => {
    assert.throws(() => assertDevUrl("https://portal.fiziyo.pl"));
    assert.throws(() => assertDevUrl("https://portal.fiziyo.pl/sign-in"));
    assert.throws(() => assertDevUrl("https://devportal.fiziyo.pl.evil.example"));
    assert.throws(() => assertDevUrl("http://devportal.fiziyo.pl"));
  });
});

describe("pickMergedPr", () => {
  it("picks the PR merged by this commit", () => {
    const prs = [
      { number: 1, merged_at: null, merge_commit_sha: MERGE },
      { number: 2, merged_at: "2026-11-12T00:00:00Z", merge_commit_sha: OLDER },
      { number: 3, merged_at: "2026-11-12T00:00:00Z", merge_commit_sha: MERGE },
    ];
    assert.equal(pickMergedPr(prs, MERGE).number, 3);
  });

  it("returns undefined for a direct push", () => {
    assert.equal(pickMergedPr([], MERGE), undefined);
  });
});

describe("buildComment", () => {
  const ctx = {
    repo: "Prezentytu/fiziyo-admin-portal",
    pr: 216,
    mergeSha: MERGE,
    url: "https://devportal.fiziyo.pl",
    runUrl: "https://github.com/Prezentytu/fiziyo-admin-portal/actions/runs/1",
    waitedMs: 4 * 60_000,
  };

  it("says confirmed and links the commit, devportal and the run", () => {
    const text = buildComment({ ...ctx, result: { state: "identical", deployedSha: MERGE, deploymentId: "dpl_12345678" } });
    assert.match(text, /^<!-- post-deploy-devportal:/);
    assert.match(text, /potwierdzone/i);
    assert.ok(text.includes(`/commit/${MERGE}`));
    assert.ok(text.includes(ctx.runUrl));
    assert.ok(text.includes("https://devportal.fiziyo.pl"));
    assert.ok(text.includes("dpl_12345678"));
  });

  it("mentions the later commit when devportal is ahead", () => {
    const text = buildComment({ ...ctx, result: { state: "later", deployedSha: LATER } });
    assert.match(text, /potwierdzone/i);
    assert.ok(text.includes(LATER.slice(0, 7)));
  });

  it("says not confirmed on timeout and shows what devportal returned", () => {
    const text = buildComment({ ...ctx, result: { state: "timeout", deployedSha: OLDER } });
    assert.match(text, /nie potwierdzone/i);
    assert.ok(text.includes(OLDER.slice(0, 7)));
  });

  it("says not confirmed on timeout when devportal was unreachable", () => {
    const text = buildComment({ ...ctx, result: { state: "timeout" } });
    assert.match(text, /nie potwierdzone/i);
    assert.match(text, /brak odczytu/i);
  });
});
