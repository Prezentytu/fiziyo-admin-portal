import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { classifyShellCommand, hookResponse } from "./agent-guard.mjs";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const OTHER_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const REPO = "Prezentytu/fiziyo-admin-portal";
const MINUTE = 60_000;

function zgoda({ repo = REPO, pr = 12, sha = SHA, ageMs = 0 } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "zgody-"));
  const file = path.join(dir, repo, `${pr}__${sha}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, "");
  const at = new Date(Date.now() - ageMs);
  utimesSync(file, at, at);
  return dir;
}

const merge = (extra = "") => `gh pr merge 12 --merge --match-head-commit ${SHA} --delete-branch ${extra}`.trim();
const opts = (consentDir) => ({ consentDir, remoteUrl: () => `git@github.com:${REPO}.git` });

describe("agent-guard", () => {
  it("blocks push to main, promote and vercel prod", () => {
    assert.equal(classifyShellCommand("git push origin main").permission, "deny");
    assert.equal(classifyShellCommand("git push origin HEAD:main").permission, "deny");
    assert.equal(classifyShellCommand("gh workflow run promote.yml").permission, "deny");
    assert.equal(classifyShellCommand("vercel --prod").permission, "deny");
  });

  it("allows ordinary portal work", () => {
    assert.equal(classifyShellCommand("git push -u origin HEAD").permission, "allow");
    assert.equal(
      classifyShellCommand("git push -u origin HEAD && git log --oneline origin/main..HEAD").permission,
      "allow"
    );
    assert.equal(classifyShellCommand("npm run validate").permission, "allow");
    assert.equal(classifyShellCommand("gh pr create --draft").permission, "allow");
    assert.equal(classifyShellCommand("gh pr view 12 --json state").permission, "allow");
  });

  it("returns hook JSON and exits 2 for a blocked argv command", () => {
    const result = spawnSync(process.execPath, ["scripts/agent-guard.mjs", "git", "push", "origin", "main"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).permission, "deny");
    assert.equal(hookResponse("npm run test:run").permission, "allow");
  });
});

describe("agent-guard: merge przez agenta", () => {
  it("blocks a merge without consent", () => {
    assert.equal(classifyShellCommand("gh pr merge --squash 12").permission, "deny");
    assert.equal(classifyShellCommand("gh pr merge 12 --merge", opts(zgoda())).permission, "deny");
  });

  it("allows a merge with --match-head-commit and a fresh consent file", () => {
    assert.equal(classifyShellCommand(merge(), opts(zgoda())).permission, "allow");
  });

  it("accepts --match-head-commit=<sha> and --repo", () => {
    const dir = zgoda({ repo: "Prezentytu/inne" });
    const command = `gh pr merge 12 --merge --match-head-commit=${SHA} --repo Prezentytu/inne`;
    assert.equal(classifyShellCommand(command, opts(dir)).permission, "allow");
    assert.equal(classifyShellCommand(`gh pr merge 12 --merge --match-head-commit ${SHA} -R Prezentytu/inne`, opts(dir)).permission, "allow");
  });

  it("takes owner, repo and number from a PR url", () => {
    const dir = zgoda({ repo: "Prezentytu/inne", pr: 7 });
    const command = `gh pr merge https://github.com/Prezentytu/inne/pull/7 --merge --match-head-commit ${SHA}`;
    assert.equal(classifyShellCommand(command, { consentDir: dir, remoteUrl: () => undefined }).permission, "allow");
  });

  it("takes the repo from the origin remote of the command directory", () => {
    const dir = zgoda();
    let asked;
    const result = classifyShellCommand(merge(), {
      consentDir: dir,
      cwd: "/work/tree",
      remoteUrl: (cwd) => {
        asked = cwd;
        return `https://github.com/${REPO}.git`;
      },
    });
    assert.equal(result.permission, "allow");
    assert.equal(asked, "/work/tree");
  });

  it("follows cd inside the command for the remote lookup", () => {
    let asked;
    classifyShellCommand(`cd /other/repo && ${merge()}`, {
      consentDir: zgoda(),
      cwd: "/work/tree",
      remoteUrl: (cwd) => {
        asked = cwd;
        return `git@github.com:${REPO}.git`;
      },
    });
    assert.equal(asked, "/other/repo");
  });

  it("blocks when the repo cannot be determined", () => {
    const result = classifyShellCommand(merge(), { consentDir: zgoda(), remoteUrl: () => undefined });
    assert.equal(result.permission, "deny");
  });

  it("blocks a missing, short or substituted head sha", () => {
    const dir = zgoda();
    assert.equal(classifyShellCommand("gh pr merge 12 --merge", opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand("gh pr merge 12 --merge --match-head-commit 0123456", opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand("gh pr merge 12 --merge --match-head-commit $(git rev-parse HEAD)", opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand("gh pr merge 12 --merge --match-head-commit `git rev-parse HEAD`", opts(dir)).permission, "deny");
  });

  it("blocks --admin and --auto even with consent", () => {
    const dir = zgoda();
    assert.equal(classifyShellCommand(merge("--admin"), opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(merge("--auto"), opts(dir)).permission, "deny");
  });

  it("blocks a consent for another sha, number or repo", () => {
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ sha: OTHER_SHA }))).permission, "deny");
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ pr: 13 }))).permission, "deny");
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ repo: "Prezentytu/inne" }))).permission, "deny");
  });

  it("blocks a consent older than 30 minutes and accepts one just under", () => {
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ ageMs: 31 * MINUTE }))).permission, "deny");
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ ageMs: 29 * MINUTE }))).permission, "allow");
  });

  it("blocks a consent dated in the future", () => {
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ ageMs: -10 * MINUTE }))).permission, "deny");
  });

  it("blocks a merge without a pull request number", () => {
    assert.equal(classifyShellCommand(`gh pr merge --merge --match-head-commit ${SHA}`, opts(zgoda())).permission, "deny");
  });

  it("does not let a merge ride along with another blocked command", () => {
    const dir = zgoda();
    assert.equal(classifyShellCommand(`${merge()} && git push origin main`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`${merge()} && gh pr merge 99 --merge --match-head-commit ${SHA}`, opts(dir)).permission, "deny");
  });

  it("keeps merge through the API blocked, also with consent", () => {
    const dir = zgoda();
    assert.equal(classifyShellCommand(`gh api -X PUT repos/${REPO}/pulls/12/merge -f sha=${SHA}`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`gh api graphql -f query='mutation { mergePullRequest(input:{pullRequestId:"x"}) { clientMutationId } }'`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`curl -X PUT https://api.github.com/repos/${REPO}/pulls/12/merge`, opts(dir)).permission, "deny");
  });

  it("explains the reason in the hook response", () => {
    const response = hookResponse("gh pr merge 12 --merge");
    assert.equal(response.permission, "deny");
    assert.match(response.agent_message, /match-head-commit/);
  });

  it("reads tool_input.command and cwd from a Claude Code hook payload on stdin", () => {
    const payload = JSON.stringify({ tool_input: { command: "gh pr merge 12 --merge" }, cwd: process.cwd() });
    const result = spawnSync(process.execPath, ["scripts/agent-guard.mjs"], { encoding: "utf8", input: payload });
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).permission, "deny");
  });
});
