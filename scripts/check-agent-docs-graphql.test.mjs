import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkAgentDocsGraphql } from "./check-agent-docs-graphql.mjs";

test("flags operations named in AGENTS.md that src/ does not export", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-docs-"));
  try {
    fs.mkdirSync(path.join(root, "src/graphql"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/features/demo"), { recursive: true });
    fs.writeFileSync(path.join(root, "src/graphql/demo.queries.ts"), "export const GET_LIVE_QUERY = gql``;\n");
    fs.writeFileSync(path.join(root, "AGENTS.md"), "Use `GET_LIVE_QUERY`.\n");
    fs.writeFileSync(path.join(root, "src/features/demo/AGENTS.md"), "Intro\nUse `GET_REMOVED_QUERY`.\n");
    assert.deepEqual(checkAgentDocsGraphql(root), [
      "src/features/demo/AGENTS.md:2: GET_REMOVED_QUERY is not exported from src/",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
