import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Structural check only. Trusted execution configuration lives in agent-ops.
export function checkAdapter(root) {
  const adapter = JSON.parse(fs.readFileSync(path.join(root, ".ai/agent-adapter.json"), "utf8"));
  const errors = [];
  if (adapter.schemaVersion !== 1) errors.push("Unknown adapter version");
  if (!/^[\w.-]+\/[\w.-]+$/.test(adapter.repository)) errors.push("Invalid repository");
  if (!Array.isArray(adapter.externalRepositories) || adapter.externalRepositories.some(repo => !/^[\w.-]+\/[\w.-]+$/.test(repo))) errors.push("Invalid external repositories");
  const local = relative => {
    if (typeof relative !== "string" || !relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) return false;
    let current = root;
    for (const part of relative.split("/")) {
      current = path.join(current, part);
      if (fs.lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) return false;
    }
    return fs.existsSync(current);
  };
  for (const field of ["instructions", "surfaces"]) {
    if (!Array.isArray(adapter[field]) || !adapter[field].length) errors.push(`Missing ${field}`);
    else for (const relative of adapter[field]) if (!local(relative)) errors.push(`Missing or unsafe ${field}: ${relative}`);
  }
  if (adapter.skillRoot !== null && !local(adapter.skillRoot)) errors.push("Missing skill root");
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  if (!Array.isArray(adapter.checks) || !adapter.checks.length) errors.push("Missing checks");
  else for (const check of adapter.checks) {
    if (!local(check.cwd) || !Array.isArray(check.args) || check.args.some(arg => typeof arg !== "string")) {
      errors.push("Invalid check arguments or cwd");
    } else if (check.command === "npm" && check.args.length === 2 && check.args[0] === "run") {
      if (check.cwd !== "." || !Object.hasOwn(pkg.scripts ?? {}, check.args[1])) errors.push(`Missing npm script: ${check.args[1]}`);
    } else if (check.command === "node" && check.args[0] === "--test" && check.args.length > 1) {
      for (const script of check.args.slice(1)) if (!local(path.join(check.cwd, script))) errors.push(`Missing test: ${script}`);
    } else errors.push("Check must be a named npm script or explicit Node test files");
  }
  if (adapter.activation !== "unverified") errors.push("Local manifest must not claim service activation");
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkAdapter(process.cwd());
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else console.log("Adapter files and commands present; service permissions/activation unverified.");
}
