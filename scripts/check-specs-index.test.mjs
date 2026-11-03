import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkSpecsIndex, parseFrontmatter, parseIndexRows } from "./check-specs-index.mjs";

const FRONTMATTER = (spec) => `---\nspec: ${spec}\nrepo: x\nissues: []\nprs: []\n---\n# Demo\n`;

function withSpecs(readmeRows, files, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "specs-"));
  try {
    const specs = path.join(root, ".ai/specs");
    fs.mkdirSync(specs, { recursive: true });
    const readme = `# Specs\n\n## Indeks specyfikacji\n\n| Nr | Tytuł | Opis | Status |\n| --- | --- | --- | --- |\n${readmeRows.join("\n")}\n\n## Planowane\n\n| 099 | Plan | x |\n`;
    fs.writeFileSync(path.join(specs, "README.md"), readme);
    for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(specs, name), body);
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("flags missing index row and missing frontmatter", () => {
  withSpecs(["| 001 | a | b | implemented |"], { "SPEC-001-demo.md": FRONTMATTER("SPEC-001"), "SPEC-002-demo.md": "# No frontmatter\n" }, (root) => {
    const errors = checkSpecsIndex(root).errors.join("\n");
    assert.match(errors, /Missing index row for SPEC-002/);
    assert.match(errors, /SPEC-002-demo.md: missing YAML frontmatter/);
    assert.equal(parseFrontmatter("---\nspec: SPEC-001\n---\n").spec, "SPEC-001");
  });
});

test("index row without a spec file is an error; planned table is ignored", () => {
  withSpecs(["| 001 | a | b | draft |", "| 018 | a | b | draft |"], { "SPEC-001-demo.md": FRONTMATTER("SPEC-001") }, (root) => {
    const { errors } = checkSpecsIndex(root);
    assert.deepEqual(errors, ["Index row 018 has no SPEC-018-*.md file"]);
  });
});

test("Aktywny warns for listed legacy rows and fails for new ones", () => {
  const files = { "SPEC-001-demo.md": FRONTMATTER("SPEC-001"), "SPEC-002-demo.md": FRONTMATTER("SPEC-002") };
  withSpecs(["| 001 | a | b | Aktywny |", "| 002 | a | b | Aktywny |"], files, (root) => {
    const { errors, warnings } = checkSpecsIndex(root, { legacyAktywny: ["001"] });
    assert.deepEqual(errors, ["Index row 002: status Aktywny is legacy; use draft/approved/in-progress/implemented/verified/deprecated"]);
    assert.match(warnings.join("\n"), /1 spec\(s\) still on legacy status Aktywny: 001/);
    const done = checkSpecsIndex(root, { legacyAktywny: [] });
    assert.equal(done.errors.length, 2);
  });
});

test("unknown status is an error", () => {
  withSpecs(["| 001 | a | b | WDROŻONE |"], { "SPEC-001-demo.md": FRONTMATTER("SPEC-001") }, (root) => {
    assert.match(checkSpecsIndex(root).errors.join("\n"), /unknown status "WDROŻONE"/);
  });
});

test("parseIndexRows reads only the index section", () => {
  const rows = parseIndexRows("## Indeks specyfikacji\n| 001 | x | y | verified |\n## Planowane\n| 018 | z | w |\n");
  assert.deepEqual(rows, [{ number: "001", status: "verified" }]);
});
