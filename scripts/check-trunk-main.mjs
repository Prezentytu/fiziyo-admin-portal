import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORKFLOW_DEV_BRANCH = /branches:\s*\[[^\]]*\bdev\b/;
const FORBIDDEN_SNIPPETS = [
  [".github/workflows/ci.yml", WORKFLOW_DEV_BRANCH, "CI still lists git branch dev"],
  [".github/workflows/e2e-trigger.yml", /status\.environment === ['"]Development['"]/, "E2E trigger treats Vercel environment Development as DEV"],
  [".github/PULL_REQUEST_TEMPLATE.md", /targetuje `dev`/, "PR template still sends humans to branch dev"],
  ["CONTRIBUTING.md", /PR against `dev`|branch from `dev`/, "CONTRIBUTING still uses branch dev as integration"],
  ["docs/architecture/cloud-agent-policy.md", /targetują `dev`/, "cloud-agent-policy still targets branch dev"],
  ["docs/testing/e2e-cross-repo-pipeline.md", /brancha `dev`|dev -> main|Deploy na `dev`/, "E2E runbook still routes through branch dev"],
  ["docs/PROJECT_OVERVIEW.md", /PR do `dev`/, "PROJECT_OVERVIEW still mentions PRs to branch dev"],
];

export function checkTrunkMain(root) {
  const errors = [];
  const vercelPath = path.join(root, "vercel.json");
  if (!fs.existsSync(vercelPath)) {
    errors.push("vercel.json must disable git deployments from branch dev");
  } else {
    try {
      const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
      if (vercel.git?.deploymentEnabled?.dev !== false) {
        errors.push("vercel.json must set git.deploymentEnabled.dev to false");
      }
    } catch {
      errors.push("vercel.json is not valid JSON");
    }
  }

  const trigger = fs.readFileSync(path.join(root, ".github/workflows/e2e-trigger.yml"), "utf8");
  if (!trigger.includes("${sha}...main") && !trigger.includes("...main")) {
    errors.push("E2E trigger must require the deployment SHA to be on main");
  }
  if (!trigger.includes("REPO_READ_TOKEN")) {
    errors.push("E2E trigger must compare SHA against main with the repo token");
  }
  if (!trigger.includes("=== 'dev'")) {
    errors.push("E2E trigger must ignore leftover git branch dev");
  }
  if (!fs.existsSync(path.join(root, "scripts/pin-devportal-domain.mjs"))) {
    errors.push("Missing pin-devportal-domain script that keeps DEV on main");
  }
  if (!fs.existsSync(path.join(root, ".github/workflows/pin-devportal.yml"))) {
    errors.push("Missing pin-devportal workflow that reassigns leftover branch domains");
  }

  const pinScript = path.join(root, "scripts/pin-devportal-domain.mjs");
  const pinWorkflow = path.join(root, ".github/workflows/pin-devportal.yml");
  if (!fs.existsSync(pinScript) || !fs.existsSync(pinWorkflow)) {
    errors.push("Pin DEV domain script and workflow are required so leftover branch dev cannot keep the alias");
  } else {
    const pin = fs.readFileSync(pinScript, "utf8");
    if (!pin.includes('LEGACY_INTEGRATION_BRANCH = "dev"') || !pin.includes('TRUNK_BRANCH = "main"')) {
      errors.push("Pin DEV domain script must move leftover branch dev onto main");
    }
  }

  for (const [relative, pattern, message] of FORBIDDEN_SNIPPETS) {
    const text = fs.readFileSync(path.join(root, relative), "utf8");
    if (pattern.test(text)) errors.push(message);
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkTrunkMain(process.cwd());
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Trunk is main-only; leftover branch dev cannot re-enter the train.");
}
