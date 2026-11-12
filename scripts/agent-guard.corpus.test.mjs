import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const corpus = path.join(path.dirname(fileURLToPath(import.meta.url)), "agent-guard.corpus.sh");

// Korpus przypadków z baza-wiedzy PR #57 @ 7d07b6f (rundy 1–28 i korpus sesji), przeniesiony 1:1 w agent-guard.corpus.sh.
// Każdy przypadek uruchamia strażnika jak hook: JSON na stdin, polecenie nigdy nie jest wykonywane.
describe("agent-guard: korpus baza-wiedzy#57 @ 7d07b6f", () => {
  it("wszystkie przypadki dają oczekiwaną decyzję", { timeout: 300_000 }, () => {
    const result = spawnSync("bash", [corpus], { encoding: "utf8", timeout: 290_000 });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /guard: wszystkie przypadki OK/);
    const total = Number(/przypadków: (\d+)/.exec(result.stdout)?.[1]);
    assert.ok(total >= 480, `za mało przypadków w korpusie: ${total}`);
  });
});
