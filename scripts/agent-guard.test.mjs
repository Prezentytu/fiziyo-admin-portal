import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { classifyShellCommand, hookResponse } from "./agent-guard.mjs";

describe("agent-guard", () => {
  it("blocks push to main, merge, promote and vercel prod", () => {
    assert.equal(classifyShellCommand("git push origin main").permission, "deny");
    assert.equal(classifyShellCommand("git push origin HEAD:main").permission, "deny");
    assert.equal(classifyShellCommand("gh pr merge --squash 12").permission, "deny");
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
