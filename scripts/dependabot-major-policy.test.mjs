import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { BLOCKED_NPM_MAJORS, checkDependabotMajorPolicy } from "./dependabot-major-policy.mjs";

function writeTree(root, files) {
  for (const [relative, contents] of Object.entries(files)) {
    const full = path.join(root, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contents);
  }
}

const VALID = `version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    ignore:
      - dependency-name: "@clerk/nextjs"
        update-types: ["version-update:semver-major"]
      - dependency-name: graphql
        update-types: ["version-update:semver-major"]
      - dependency-name: typescript
        update-types: ["version-update:semver-major"]
      - dependency-name: eslint
        update-types: ["version-update:semver-major"]
      - dependency-name: "@tanstack/react-table"
        update-types: ["version-update:semver-major"]
      - dependency-name: lucide-react
        update-types: ["version-update:semver-major"]
      - dependency-name: "@types/node"
        update-types: ["version-update:semver-major"]
      - dependency-name: vitest
        update-types: ["version-update:semver-major"]
      - dependency-name: "@vitest/coverage-v8"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@vitejs/plugin-react"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@commitlint/cli"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@commitlint/config-conventional"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@testing-library/jest-dom"
        update-types: ["version-update:semver-major"]
      - dependency-name: jsdom
        update-types: ["version-update:semver-major"]
      - dependency-name: lint-staged
        update-types: ["version-update:semver-major"]
`;

test("repo dependabot policy matches the blocked major list", () => {
  assert.deepEqual(checkDependabotMajorPolicy(process.cwd()), []);
  assert.ok(BLOCKED_NPM_MAJORS.includes("@clerk/nextjs"));
  assert.ok(BLOCKED_NPM_MAJORS.includes("typescript"));
});

test("flags missing major ignores", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dependabot-"));
  try {
    writeTree(root, {
      ".github/dependabot.yml": `version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
`,
    });
    const errors = checkDependabotMajorPolicy(root).join("\n");
    assert.match(errors, /must ignore major updates for typescript/);
    assert.match(errors, /must ignore major updates for @clerk\/nextjs/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("flags labels that GitHub does not have", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dependabot-"));
  try {
    writeTree(root, {
      ".github/dependabot.yml": `${VALID}
  - package-ecosystem: github-actions
    directory: "/"
    labels:
      - ci
`,
    });
    const errors = checkDependabotMajorPolicy(root).join("\n");
    assert.match(errors, /missing GitHub label ci/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("accepts a complete ignore list without unknown labels", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dependabot-"));
  try {
    writeTree(root, { ".github/dependabot.yml": VALID });
    assert.deepEqual(checkDependabotMajorPolicy(root), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
