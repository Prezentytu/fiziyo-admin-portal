import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { SHARED_DOCS, parseHeader, stripHeader, syncSharedDocs, withHeader } from "./sync-shared-docs.mjs";

const SHA = "a".repeat(40);

test("header round-trips sha and path", () => {
  const text = withHeader("# Vision\n", SHA, ".ai/VISION.md");
  assert.equal(text.split("\n")[0], `<!-- kopia z Prezentytu/fizjo-app@${SHA}:.ai/VISION.md; nie edytuj, odśwież: npm run docs:sync -->`);
  assert.deepEqual(parseHeader(text), { repo: "Prezentytu/fizjo-app", sha: SHA, path: ".ai/VISION.md" });
  assert.match(text.split("\n")[2], /dotyczą \*\*fizjo-app\*\*/);
  assert.equal(stripHeader(text), "# Vision\n");
  assert.equal(parseHeader("# Vision\n"), null);
});

test("sync writes active docs, skips held ones, and dry-run writes nothing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "shared-docs-"));
  try {
    fs.mkdirSync(path.join(root, ".ai"));
    for (const doc of SHARED_DOCS) fs.writeFileSync(path.join(root, doc.local), "old\n");
    const fetch = { fetchHeadSha: () => SHA, fetchFile: (remote) => `canon ${remote}\n` };

    const dry = syncSharedDocs(root, { dryRun: true, fetch });
    assert.match(dry.report.join("\n"), /would {4}\.ai\/VISION\.md/);
    assert.equal(fs.readFileSync(path.join(root, ".ai/VISION.md"), "utf8"), "old\n");

    const run = syncSharedDocs(root, { fetch });
    assert.equal(parseHeader(fs.readFileSync(path.join(root, ".ai/VISION.md"), "utf8")).sha, SHA);
    for (const doc of SHARED_DOCS.filter((d) => d.held)) {
      assert.equal(fs.readFileSync(path.join(root, doc.local), "utf8"), "old\n");
      assert.match(run.report.join("\n"), new RegExp(`held +${doc.local.replace(".", "\\.")}`));
    }
    assert.match(syncSharedDocs(root, { fetch }).report[0], /^ok/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
