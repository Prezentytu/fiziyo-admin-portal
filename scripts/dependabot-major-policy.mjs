import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

/** Majory, których tygodniowa grupa łamie CI Node 20 albo wymaga Ask First / migracji API. */
export const BLOCKED_NPM_MAJORS = Object.freeze([
  "@clerk/nextjs",
  "graphql",
  "typescript",
  "eslint",
  "@tanstack/react-table",
  "lucide-react",
  "@types/node",
  "vitest",
  "@vitest/coverage-v8",
  "@vitejs/plugin-react",
  "@commitlint/cli",
  "@commitlint/config-conventional",
  "@testing-library/jest-dom",
  "jsdom",
  "lint-staged",
]);

const UNKNOWN_LABELS = new Set(["dependencies", "ci"]);

function readYaml(root, relative) {
  return yaml.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function npmUpdate(config) {
  const updates = Array.isArray(config?.updates) ? config.updates : [];
  return updates.find((entry) => entry?.["package-ecosystem"] === "npm") ?? null;
}

function ignoredMajorNames(update) {
  const ignores = Array.isArray(update?.ignore) ? update.ignore : [];
  return new Set(
    ignores
      .filter((entry) => Array.isArray(entry?.["update-types"]) && entry["update-types"].includes("version-update:semver-major"))
      .map((entry) => entry["dependency-name"])
      .filter((name) => typeof name === "string"),
  );
}

export function checkDependabotMajorPolicy(root = process.cwd()) {
  const errors = [];
  const config = readYaml(root, ".github/dependabot.yml");
  const updates = Array.isArray(config?.updates) ? config.updates : [];

  for (const entry of updates) {
    const labels = Array.isArray(entry?.labels) ? entry.labels : [];
    for (const label of labels) {
      if (UNKNOWN_LABELS.has(label)) {
        errors.push(`dependabot ${entry["package-ecosystem"]} uses missing GitHub label ${label}`);
      }
    }
  }

  const npm = npmUpdate(config);
  if (!npm) {
    errors.push("dependabot.yml is missing the npm ecosystem");
    return errors;
  }

  const ignored = ignoredMajorNames(npm);
  for (const name of BLOCKED_NPM_MAJORS) {
    if (!ignored.has(name)) {
      errors.push(`dependabot must ignore major updates for ${name}`);
    }
  }

  return errors;
}
