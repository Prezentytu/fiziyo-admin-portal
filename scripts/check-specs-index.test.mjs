import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkSpecsIndex, parseFrontmatter } from "./check-specs-index.mjs";

test("flags missing index row and missing frontmatter", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "specs-"));
  try {
    const specs = path.join(root, ".ai/specs");
    fs.mkdirSync(specs, { recursive: true });
    fs.writeFileSync(path.join(specs, "README.md"), "| Nr |\n| --- |\n| 001 |\n");
    fs.writeFileSync(path.join(specs, "SPEC-001-demo.md"), "---\nspec: SPEC-001\nrepo: x\nissues: []\nprs: []\nboard:\n---\n# Demo\n");
    fs.writeFileSync(path.join(specs, "SPEC-002-demo.md"), "# No frontmatter\n");
    const errors = checkSpecsIndex(root).join("\n");
    assert.match(errors, /Missing index row for SPEC-002/);
    assert.match(errors, /SPEC-002-demo.md: missing YAML frontmatter/);
    assert.equal(parseFrontmatter("---\nspec: SPEC-001\n---\n").spec, "SPEC-001");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
