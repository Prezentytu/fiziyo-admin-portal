import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkLessonMarkers, checkSharedDocs } from "./check-agent-context.mjs";
import { SHARED_DOCS, withHeader } from "./sync-shared-docs.mjs";

function tempRoot(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-context-"));
  try {
    fs.mkdirSync(path.join(root, ".ai"));
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("copy without header is a warning, not an error", () => {
  tempRoot((root) => {
    const [first, ...rest] = SHARED_DOCS;
    fs.writeFileSync(path.join(root, first.local), withHeader("# x\n", "b".repeat(40), first.remote));
    for (const doc of rest) fs.writeFileSync(path.join(root, doc.local), "# local copy\n");
    const { warnings, errors } = checkSharedDocs(root);
    assert.deepEqual(errors, []);
    assert.equal(warnings.length, rest.length);
    assert.match(warnings[0], /no "kopia z Prezentytu\/fizjo-app@<sha>" header/);
  });
});

test("lesson marker must point at an existing file", () => {
  tempRoot((root) => {
    fs.mkdirSync(path.join(root, "scripts"));
    fs.writeFileSync(path.join(root, "scripts/real.test.mjs"), "");
    fs.writeFileSync(
      path.join(root, ".ai/lessons.md"),
      "Marker `[egzekwowane: <ścieżka>]`\n- **Reguła**: a [egzekwowane: scripts/real.test.mjs]\n- **Reguła**: b [egzekwowane: scripts/gone.test.mjs, scripts/real.test.mjs `x`]\n",
    );
    assert.deepEqual(checkLessonMarkers(root), [".ai/lessons.md:3: [egzekwowane] points at missing scripts/gone.test.mjs"]);
  });
});
