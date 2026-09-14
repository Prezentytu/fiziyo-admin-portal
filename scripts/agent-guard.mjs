// Client-side shell gate for Cloud Agents. Not a permission boundary.
import { fileURLToPath } from "node:url";
import path from "node:path";

const PUSH_MAIN = /\bgit\b[\s\S]*\bpush\b[\s\S]*(?:\borigin\/)?(?:HEAD:)?(?:refs\/heads\/)?main\b/;
const GH_MERGE = /\bgh\b[\s\S]*\bpr\b[\s\S]*\bmerge\b/;
const VERCEL_PROD = /\bvercel\b[\s\S]*--prod\b/;
const PROMOTE = /\b(?:npm|pnpm|yarn|npx|gh)\b[\s\S]*\bpromote\b|\bworkflow[\s\S]*promote|\bpromote(?:\.yml|\.yaml)\b/;

function commandSegments(command) {
  return String(command ?? "")
    .split(/\s*(?:&&|\|\||;)\s*/)
    .map((segment) => segment.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function classifyShellCommand(command) {
  const reasons = [];
  for (const segment of commandSegments(command)) {
    if (PUSH_MAIN.test(segment)) reasons.push("push to main");
    if (GH_MERGE.test(segment)) reasons.push("pull request merge");
    if (VERCEL_PROD.test(segment)) reasons.push("production deploy");
    if (PROMOTE.test(segment)) reasons.push("promote workflow");
  }
  return reasons.length ? { permission: "deny", reasons: [...new Set(reasons)] } : { permission: "allow", reasons: [] };
}

export function hookResponse(command) {
  const result = classifyShellCommand(command);
  if (result.permission === "deny") {
    return {
      permission: "deny",
      agent_message: `Blocked: ${result.reasons.join(", ")}. Client hook only; server rules live in agent-ops.`,
      user_message: `Command blocked by agent-guard: ${result.reasons.join(", ")}`,
    };
  }
  return { permission: "allow" };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argvCommand = process.argv.slice(2).join(" ").trim();
  const input = argvCommand || JSON.parse((await readStdin()) || "{}").command || "";
  const response = hookResponse(input);
  process.stdout.write(`${JSON.stringify(response)}\n`);
  if (response.permission === "deny") process.exitCode = 2;
}
