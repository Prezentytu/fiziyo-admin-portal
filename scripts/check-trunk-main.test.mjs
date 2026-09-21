import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { checkTrunkMain } from "./check-trunk-main.mjs";

const FILES = {
  "vercel.json": JSON.stringify({ git: { deploymentEnabled: { dev: false } } }),
  ".github/workflows/ci.yml": "on:\n  pull_request:\n    branches: [main]\n",
  ".github/workflows/e2e-trigger.yml": "env:\n  REPO_READ_TOKEN: token\nscript: compare/${sha}...main\nif (ref === 'dev') return;\n",
  ".github/workflows/pin-devportal.yml": "name: Pin DEV portal to main\n",
  "scripts/pin-devportal-domain.mjs": "export {}\n",
  "scripts/pin-devportal-domain.mjs": "export const LEGACY_INTEGRATION_BRANCH = \"dev\";\nexport const TRUNK_BRANCH = \"main\";\n",
  ".github/workflows/pin-devportal.yml": "name: Pin DEV portal to main\n",
  ".github/PULL_REQUEST_TEMPLATE.md": "- [ ] PR targetuje `main`\n",
  "CONTRIBUTING.md": "Create a branch from `main`\nOpen a PR against `main`\n",
  "docs/architecture/cloud-agent-policy.md": "PR-y targetują `main`.\n",
  "docs/testing/e2e-cross-repo-pipeline.md": "Merge do `main` wdraża DEV.\n",
  "docs/PROJECT_OVERVIEW.md": "GitHub Actions na PR do `main`.\n",
};

function writeTree(root, overrides = {}) {
  for (const [relative, contents] of Object.entries({ ...FILES, ...overrides })) {
    const full = path.join(root, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }
}

test("repo trunk is main-only", () => {
  assert.deepEqual(checkTrunkMain(process.cwd()), []);
});

test("flags leftover dev integration branch", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trunk-"));
  try {
    writeTree(root, {
      ".github/workflows/ci.yml": "on:\n  pull_request:\n    branches: [dev, main]\n",
      "CONTRIBUTING.md": "Open a PR against `dev`\n",
      "vercel.json": JSON.stringify({ git: { deploymentEnabled: {} } }),
      "scripts/pin-devportal-domain.mjs": "export const TRUNK_BRANCH = \"main\";\n",
    });
    const errors = checkTrunkMain(root).join("\n");
    assert.match(errors, /CI still lists git branch dev/);
    assert.match(errors, /CONTRIBUTING still uses branch dev/);
    assert.match(errors, /git.deploymentEnabled.dev/);
    assert.match(errors, /Pin DEV domain script must move leftover branch dev onto main/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("flags pin that still fails Vercel Preview PR deployments", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trunk-"));
  try {
    writeTree(root, {
      "scripts/pin-devportal-domain.mjs":
        'export const LEGACY_INTEGRATION_BRANCH = "dev";\nexport const TRUNK_BRANCH = "main";\n',
      ".github/workflows/pin-devportal.yml": "name: Pin DEV portal to main\n",
    });
    const errors = checkTrunkMain(root).join("\n");
    assert.match(errors, /skip Vercel Preview deployments/);
    assert.match(errors, /must not run the pin job on Vercel Preview PR/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("flags assigning the production branch to a Preview domain", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trunk-"));
  try {
    writeTree(root, {
      "scripts/pin-devportal-domain.mjs":
        'export const LEGACY_INTEGRATION_BRANCH = "dev";\nexport const TRUNK_BRANCH = "main";\n{ gitBranch: TRUNK_BRANCH }\n',
    });
    const errors = checkTrunkMain(root).join("\n");
    assert.match(errors, /production branch to a Preview domain/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
