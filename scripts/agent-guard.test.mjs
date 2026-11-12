import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { classifyShellCommand, hookResponse } from "./agent-guard.mjs";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const OTHER_SHA = "fedcba9876543210fedcba9876543210fedcba98";
const REPO = "Prezentytu/fiziyo-admin-portal";
const MINUTE = 60_000;

function zgoda({ repo = REPO, pr = 12, sha = SHA, ageMs = 0 } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "zgody-"));
  const file = path.join(dir, repo.toLowerCase(), `${pr}__${sha}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, "");
  const at = new Date(Date.now() - ageMs);
  utimesSync(file, at, at);
  return dir;
}

const merge = (extra = "") => `gh pr merge 12 -R ${REPO} --merge --match-head-commit ${SHA} --delete-branch ${extra}`.trim();
const opts = (consentDir) => ({ consentDir });

describe("agent-guard", () => {
  it("blocks push to main, promote and vercel prod", () => {
    assert.equal(classifyShellCommand("git push origin main").permission, "deny");
    assert.equal(classifyShellCommand("git push origin HEAD:main").permission, "deny");
    assert.equal(classifyShellCommand("gh workflow run promote.yml").permission, "deny");
    assert.equal(classifyShellCommand("vercel --prod").permission, "deny");
  });

  it("allows ordinary portal work", () => {
    assert.equal(classifyShellCommand("git push -u origin HEAD").permission, "allow");
    assert.equal(
      classifyShellCommand("git push -u origin HEAD && git log --oneline origin/main..HEAD").permission,
      "allow"
    );
    assert.equal(classifyShellCommand("npm run validate").permission, "allow");
    assert.equal(classifyShellCommand("gh pr create --draft").permission, "allow");
    assert.equal(classifyShellCommand("gh pr view 12 --json state").permission, "allow");
  });

  it("returns hook JSON and exits 2 for a blocked argv command", () => {
    const result = spawnSync(process.execPath, ["scripts/agent-guard.mjs", "git", "push", "origin", "main"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).permission, "deny");
    assert.equal(hookResponse("npm run test:run").permission, "allow");
  });
});

describe("agent-guard: merge przez agenta", () => {
  it("blocks a merge without consent", () => {
    assert.equal(classifyShellCommand("gh pr merge --squash 12").permission, "deny");
    assert.equal(classifyShellCommand(`gh pr merge 12 -R ${REPO} --merge`, opts(zgoda())).permission, "deny");
  });

  it("allows a merge with --match-head-commit and a fresh consent file", () => {
    assert.equal(classifyShellCommand(merge(), opts(zgoda())).permission, "allow");
  });

  it("accepts --match-head-commit=<sha> and --repo", () => {
    const dir = zgoda({ repo: "Prezentytu/inne" });
    const command = `gh pr merge 12 --merge --match-head-commit=${SHA} --repo Prezentytu/inne`;
    assert.equal(classifyShellCommand(command, opts(dir)).permission, "allow");
    assert.equal(classifyShellCommand(`gh pr merge 12 --merge --match-head-commit ${SHA} -R Prezentytu/inne`, opts(dir)).permission, "allow");
  });

  it("blocks a missing, short or substituted head sha", () => {
    const dir = zgoda();
    const base = `gh pr merge 12 -R ${REPO} --merge`;
    assert.equal(classifyShellCommand(base, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`${base} --match-head-commit 0123456`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`${base} --match-head-commit $(git rev-parse HEAD)`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`${base} --match-head-commit \`git rev-parse HEAD\``, opts(dir)).permission, "deny");
  });

  it("blocks --admin and --auto even with consent", () => {
    const dir = zgoda();
    assert.equal(classifyShellCommand(merge("--admin"), opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(merge("--auto"), opts(dir)).permission, "deny");
  });

  it("blocks a consent for another sha, number or repo", () => {
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ sha: OTHER_SHA }))).permission, "deny");
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ pr: 13 }))).permission, "deny");
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ repo: "Prezentytu/inne" }))).permission, "deny");
  });

  it("blocks a consent older than 30 minutes and accepts one just under", () => {
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ ageMs: 31 * MINUTE }))).permission, "deny");
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ ageMs: 29 * MINUTE }))).permission, "allow");
  });

  it("blocks a consent dated in the future", () => {
    assert.equal(classifyShellCommand(merge(), opts(zgoda({ ageMs: -10 * MINUTE }))).permission, "deny");
  });

  it("blocks a merge without a pull request number", () => {
    assert.equal(classifyShellCommand(`gh pr merge -R ${REPO} --merge --match-head-commit ${SHA}`, opts(zgoda())).permission, "deny");
  });

  it("does not let a merge ride along with another blocked command", () => {
    const dir = zgoda();
    assert.equal(classifyShellCommand(`${merge()} && git push origin main`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`${merge()} && gh pr merge 99 -R ${REPO} --merge --match-head-commit ${SHA}`, opts(dir)).permission, "deny");
  });

  it("keeps merge through the API blocked, also with consent", () => {
    const dir = zgoda();
    assert.equal(classifyShellCommand(`gh api -X PUT repos/${REPO}/pulls/12/merge -f sha=${SHA}`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`gh api graphql -f query='mutation { mergePullRequest(input:{pullRequestId:"x"}) { clientMutationId } }'`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`curl -X PUT https://api.github.com/repos/${REPO}/pulls/12/merge`, opts(dir)).permission, "deny");
  });

  it("takes the repo only from an explicit -R/--repo in every spelling", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    for (const flag of [`-R ${REPO}`, `-R=${REPO}`, `-R${REPO}`, `--repo ${REPO}`, `--repo=${REPO}`]) {
      assert.equal(classifyShellCommand(`gh pr merge 12 ${flag} --merge --match-head-commit ${SHA}`, { consentDir: dir }).permission, "allow", flag);
    }
  });

  it("ignores the origin remote, cwd and a PR url: no explicit repo means deny", () => {
    const options = { consentDir: zgoda(), cwd: "/work/tree", remoteUrl: () => `git@github.com:${REPO}.git` };
    assert.equal(classifyShellCommand(`gh pr merge 12 --merge --match-head-commit ${SHA}`, options).permission, "deny");
    assert.equal(classifyShellCommand(`cd /x && gh pr merge 12 --merge --match-head-commit ${SHA}`, options).permission, "deny");
    assert.equal(classifyShellCommand(`gh pr merge https://github.com/${REPO}/pull/12 --merge --match-head-commit ${SHA}`, options).permission, "deny");
  });

  it("denies GH_REPO and GH_HOST assignments in the command", () => {
    const dir = zgoda();
    assert.equal(classifyShellCommand(`GH_REPO=inne/repo ${merge()}`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`GH_HOST=example.com ${merge()}`, opts(dir)).permission, "deny");
    assert.equal(classifyShellCommand(`export GH_REPO=inne/repo && ${merge()}`, opts(dir)).permission, "deny");
  });

  it("lowercases owner, repo and sha, also in the consent path", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    assert.equal(classifyShellCommand(`gh pr merge 12 -R PREZENTYTU/Fiziyo-Admin-Portal --merge --match-head-commit ${SHA.toUpperCase()}`, { consentDir: dir }).permission, "allow");
    assert.equal(classifyShellCommand(merge(), { consentDir: dir }).permission, "allow");
  });

  it("lets the exact ship.mjs command through", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    const command = `gh pr merge 12 -R ${REPO} --merge --match-head-commit ${SHA} --delete-branch --body "Merge agenta (ship.mjs gotowe-agent) @ ${SHA.slice(0, 7)}"`;
    assert.equal(classifyShellCommand(command, { consentDir: dir }).permission, "allow");
  });

  it("treats gh under a full path like gh", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    assert.equal(classifyShellCommand(`/opt/homebrew/bin/gh pr merge 12 -R ${REPO} --merge`, { consentDir: dir }).permission, "deny");
    assert.equal(classifyShellCommand(merge().replace("gh ", "/opt/homebrew/bin/gh "), { consentDir: dir }).permission, "allow");
    assert.equal(classifyShellCommand("/opt/homebrew/bin/gh pr review 12 --approve").permission, "deny");
    assert.equal(classifyShellCommand("/usr/local/bin/gh api repos/o/r/pulls/12/reviews -f event=APPROVE").permission, "deny");
  });

  it("blocks approve in every form", () => {
    for (const command of [
      "gh pr review 12 --approve",
      "gh pr review 12 --approve=true",
      "gh pr review 12 -a",
      "gh pr review 12 -ab 'ok'",
      'gh pr review 12 "--approve"',
      "gh pr review 12 '-a'",
      "gh api repos/o/r/pulls/12/reviews -f event=APPROVE",
    ]) {
      assert.equal(classifyShellCommand(command).permission, "deny", command);
    }
    assert.equal(classifyShellCommand("gh pr review 12 --comment -b 'ok'").permission, "allow");
    assert.equal(classifyShellCommand("gh pr review 12 --request-changes -b 'x'").permission, "allow");
  });

  it("fails closed on review creation through the API unless the event is visibly COMMENT or REQUEST_CHANGES", () => {
    for (const command of [
      "gh api repos/o/r/pulls/12/reviews --input review.json",
      "gh api repos/o/r/pulls/12/reviews --input - <<< '{\"event\":\"COMMENT\"}'",
      "gh api repos/o/r/pulls/12/reviews -F body=@plik.md",
      "gh api repos/o/r/pulls/12/reviews -f body=ok",
      "gh api -X POST repos/o/r/pulls/12/reviews",
      "echo '{\"event\":\"APPROVE\"}' | gh api repos/o/r/pulls/12/reviews --input -",
      "gh api repos/o/r/pulls/12/reviews -f event=COMMENT -f event=APPROVE",
      "gh api repos/o/r/pulls/12/reviews -f event=APPROVE",
      "gh api graphql -f query='mutation { addPullRequestReview(input:{pullRequestId:\"x\"}) { clientMutationId } }'",
      "gh api graphql -f query='mutation { submitPullRequestReview(input:{pullRequestReviewId:\"x\", event: COMMENT}) { clientMutationId } }' --input q.json",
      "gh api graphql -f query='mutation { submitPullRequestReview(input:{pullRequestReviewId:\"x\", event: APPROVE}) { clientMutationId } }'",
    ]) {
      assert.equal(classifyShellCommand(command).permission, "deny", command);
    }
    for (const command of [
      "gh api repos/o/r/pulls/12/reviews -f event=COMMENT -f body=ok",
      "gh api repos/o/r/pulls/12/reviews -f event=REQUEST_CHANGES -f body=x",
      "gh api repos/o/r/pulls/12/reviews -f event=COMMENT",
      "gh api graphql -f query='mutation { addPullRequestReview(input:{pullRequestId:\"x\", event: COMMENT}) { clientMutationId } }'",
    ]) {
      assert.equal(classifyShellCommand(command).permission, "allow", command);
    }
    assert.equal(classifyShellCommand("gh api repos/o/r/pulls/12/comments").permission, "allow");
  });

  it("blocks gh pr merge inside shell constructs, even with consent", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    const m = `gh pr merge 12 -R ${REPO} --merge --match-head-commit ${SHA}`;
    for (const command of [
      `for i in 1; do ${m}; done`,
      `if true; then ${m}; fi`,
      `if false; then :; else ${m}; fi`,
      `exec ${m}`,
      `echo 12 | xargs ${m}`,
      `xargs -n1 ${m}`,
      `( ${m} )`,
      `{ ${m}; }`,
      `echo $(${m})`,
      `echo \`${m}\``,
      `echo "$(${m})"`,
      `echo "\`${m}\`"`,
      `\\${m}`,
      m.replace("gh ", '"gh" '),
      m.replace("gh ", "'gh' "),
    ]) {
      assert.equal(classifyShellCommand(command, { consentDir: dir }).permission, "deny", command);
    }
    assert.equal(classifyShellCommand(m, { consentDir: dir }).permission, "allow");
  });

  it("blocks gh alias set and import when the alias holds merge, review or api", () => {
    for (const command of [
      "gh alias set m 'pr merge'",
      "gh alias set --shell x 'gh pr merge $1'",
      "gh alias set r 'pr review'",
      "gh alias set a 'api'",
      "gh alias import aliases.yml merge",
      "/opt/homebrew/bin/gh alias set m 'pr merge'",
    ]) {
      assert.equal(classifyShellCommand(command).permission, "deny", command);
    }
    assert.equal(classifyShellCommand("gh alias set co 'pr checkout'").permission, "allow");
    assert.equal(classifyShellCommand("gh alias list").permission, "allow");
  });

  it("blocks API merge variants always", () => {
    for (const command of [
      "gh api graphql -f query='mutation { enablePullRequestAutoMerge(input:{pullRequestId:\"x\"}) { clientMutationId } }'",
      `gh api -X POST repos/${REPO}/merges -f base=main -f head=x`,
      `gh api repos/${REPO}/merges -f base=main -f head=x`,
      `gh api -X PATCH repos/${REPO}/git/refs/heads/main -f sha=${SHA}`,
      `gh api --method PUT repos/${REPO}/git/refs/heads/master -f sha=${SHA}`,
      `gh api repos/${REPO}/git/refs/heads/main -f sha=${SHA}`,
      `gh api repos/${REPO}/git/refs/heads/main --input ref.json`,
      "gh api graphql -f query=@merge.graphql",
      "gh api graphql -F query=@merge.graphql",
      "gh api graphql --input query.json",
    ]) {
      assert.equal(classifyShellCommand(command).permission, "deny", command);
    }
    assert.equal(classifyShellCommand(`gh api repos/${REPO}/git/refs/heads/main`).permission, "allow");
    assert.equal(classifyShellCommand(`gh api repos/${REPO}/git/refs/heads/feature-x -X PATCH -f sha=${SHA}`).permission, "allow");
  });

  it("blocks review writes through the API unless event is visibly COMMENT or REQUEST_CHANGES", () => {
    assert.equal(classifyShellCommand("gh api repos/o/r/pulls/12/reviews -X POST -f body=x").permission, "deny");
    assert.equal(classifyShellCommand("gh api repos/o/r/pulls/12/reviews -X POST -f event=COMMENT -f body=x").permission, "allow");
    assert.equal(classifyShellCommand("gh api graphql -f query='mutation { submitPullRequestReview(input:{event: REQUEST_CHANGES}) { clientMutationId } }'").permission, "allow");
    assert.equal(classifyShellCommand("gh api graphql -f query='mutation { submitPullRequestReview(input:{event: APPROVE}) { clientMutationId } }'").permission, "deny");
  });

  it("blocks bundled short flags containing R", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    assert.equal(classifyShellCommand(`gh pr merge 12 -dR ${REPO} --merge --match-head-commit ${SHA}`, { consentDir: dir }).permission, "deny");
    assert.equal(classifyShellCommand(`gh pr merge 12 -dR${REPO} --merge --match-head-commit ${SHA}`, { consentDir: dir }).permission, "deny");
    assert.equal(classifyShellCommand(`gh pr merge 12 -R ${REPO} -d --merge --match-head-commit ${SHA}`, { consentDir: dir }).permission, "allow");
  });

  it("treats quoted text as data: gh in a commit or PR text is not a command", () => {
    for (const command of [
      'git commit -m"fix gh pr merge"',
      'git commit -m "fix gh pr merge"',
      'git commit -m "guard: \\"do\\" i gh pr merge w pętli"',
      'gh pr create --title t --body="Po review: gh pr merge 12"',
      'gh pr create --title t --body "Po review: gh pr merge 12; potem gh pr review --approve"',
      "git commit -m 'gh pr merge 12 && gh alias set m merge'",
    ]) {
      assert.equal(classifyShellCommand(command).permission, "allow", command);
    }
    assert.equal(classifyShellCommand('echo "$(gh pr merge 12)"').permission, "deny");
    assert.equal(classifyShellCommand("nice -n 5 gh pr merge 12").permission, "deny");
  });

  it("treats an explicit GET with -f/-F as a read, plain GET lists too", () => {
    assert.equal(classifyShellCommand("gh api -X GET repos/o/r/pulls/12/reviews -F per_page=100").permission, "allow");
    assert.equal(classifyShellCommand('gh api repos/o/r/pulls/12/reviews --method GET -f per_page=100 --jq ".[].state"').permission, "allow");
    assert.equal(classifyShellCommand("gh api -X GET repos/o/r/git/refs/heads/main -f x=1").permission, "allow");
    assert.equal(classifyShellCommand("gh api repos/o/r/pulls/12/reviews").permission, "allow");
    assert.equal(classifyShellCommand("gh api -X GET repos/o/r/pulls/12/reviews --input body.json").permission, "deny");
  });

  it("blocks enqueuePullRequest and GraphQL queries built by substitution", () => {
    assert.equal(classifyShellCommand('gh api graphql -f query="mutation{enqueuePullRequest(input:{pullRequestId:1}){clientMutationId}}"').permission, "deny");
    assert.equal(classifyShellCommand('gh api graphql -f query="$(cat q.graphql)"').permission, "deny");
    assert.equal(classifyShellCommand("gh api graphql -f query=`cat q.graphql`").permission, "deny");
  });

  it("derives the gh api method from words: the last -X/--method wins, text does not count", () => {
    for (const command of [
      'gh api repos/o/r/pulls/1/reviews -f event=APPROVE -f body="Sprawdzone: gh api --method GET zwraca 200"',
      'gh api -X PATCH repos/o/r/git/refs/heads/main -f sha=abc -f message="nie -X GET"',
      "gh api --method=GET -X PUT repos/o/r/git/refs/heads/main -f sha=abc",
      "gh api -X GET -X POST repos/o/r/git/refs/heads/main -f sha=abc",
      "gh api -XPUT repos/o/r/git/refs/heads/main -f sha=abc",
    ]) {
      assert.equal(classifyShellCommand(command).permission, "deny", command);
    }
    assert.equal(classifyShellCommand("gh api -XGET repos/o/r/git/refs/heads/main -f x=1").permission, "allow");
    assert.equal(classifyShellCommand("gh api -X POST -X GET repos/o/r/git/refs/heads/main -f x=1").permission, "allow");
  });

  it("blocks gh pr merge in assignments and substitutions, allows other gh in them", () => {
    for (const command of [
      "out=$(gh pr merge 12 --squash)",
      'out="$(gh pr merge 12)"',
      "export X=$(gh pr merge 12)",
      "local x=`gh pr merge 12`",
      'git commit -m"$(gh pr merge 12)"',
    ]) {
      assert.equal(classifyShellCommand(command).permission, "deny", command);
    }
    assert.equal(classifyShellCommand("out=$(gh pr view 12 --json state)").permission, "allow");
    assert.equal(classifyShellCommand("git commit -m 'opis: $(gh pr merge 12)'").permission, "deny");
  });

  it("tracks quote state char by char: an apostrophe inside double quotes is a plain char, \\\" does not close them", () => {
    for (const command of [
      `echo "it's $(gh pr merge 12)" 'x'`,
      `git commit -m "don't" -m "$(gh pr merge 12)" -m "won't"`,
      `git commit -m "say \\"hi\\" it's $(gh pr merge 12)" 'x'`,
    ]) {
      assert.equal(classifyShellCommand(command).permission, "deny", command);
    }
    assert.equal(classifyShellCommand(`echo "it's fine" '$(gh pr merge 12)'`).permission, "deny");
  });

  it("finds $(gh …) and `gh …` in the raw command, whatever the quoting, and treats them as nested", () => {
    for (const command of [
      `echo "$(echo "it's")" "$(gh pr merge 12)"`,
      `echo hi # it's\necho "$(gh pr merge 12)"`,
      `echo $'it\\'s' "$(gh pr merge 12)"`,
      `cat <<EOF\nit's $(gh pr merge 12)\nEOF`,
      "echo `gh pr merge 12`",
      `echo "$(gh pr review 12 --approve)"`,
      `echo '$(gh api -X PUT repos/o/r/git/refs/heads/main -f sha=x)'`,
    ]) {
      assert.equal(classifyShellCommand(command).permission, "deny", command);
    }
    assert.equal(classifyShellCommand("cat <<EOF\nopis: gh pr merge 12\nEOF").permission, "allow");
    assert.equal(classifyShellCommand("cat <<'EOF'\nopis: gh pr merge 12 $(date)\nEOF").permission, "allow");
    assert.equal(classifyShellCommand("echo $(gh pr view 12 --json state)").permission, "allow");
  });

  it("denies repo flags before the subcommand (only the canonical form passes, even with consent)", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    const tail = `--merge --match-head-commit ${SHA}`;
    for (const command of [`gh -R ${REPO} pr merge 12 ${tail}`, `gh --repo ${REPO} pr merge 12 ${tail}`, `gh --repo=${REPO} pr merge 12 ${tail}`, `gh pr -R ${REPO} merge 12 ${tail}`]) {
      assert.equal(classifyShellCommand(command, { consentDir: dir }).permission, "deny", command);
    }
    assert.equal(classifyShellCommand(`gh -R ${REPO} pr review 12 --approve`).permission, "deny");
    assert.equal(classifyShellCommand("gh -R o/r alias set m 'pr merge'").permission, "deny");
    assert.equal(classifyShellCommand("gh -R o/r pr view 12").permission, "allow");
  });

  it("skips bodies of quoted heredocs in the substitution scan, keeps scanning unquoted ones", () => {
    const body = "komenda: \\`gh pr merge 12\\`";
    assert.equal(classifyShellCommand(`gh pr create --body "$(cat <<'EOF'\n${body}\nEOF\n)"`).permission, "allow");
    assert.equal(classifyShellCommand(`gh pr create --body "$(cat <<"EOF"\n${body}\nEOF\n)"`).permission, "allow");
    assert.equal(classifyShellCommand(`gh pr create --body "$(cat <<EOF\n${body}\nEOF\n)"`).permission, "deny");
  });

  it("recognises the gh subcommand by bare words and denies non-canonical merge forms", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    const tail = `-R ${REPO} --merge --match-head-commit ${SHA}`;
    for (const command of [
      `gh -R ${REPO} pr merge 12 --match-head-commit ${SHA}`,
      `gh -b x pr merge 12 ${tail}`,
      `gh --admin=true pr merge 12 ${tail}`,
      `gh pr --delete-branch=true merge 12 ${tail}`,
      `gh pr -R ${REPO} merge 12 --match-head-commit ${SHA}`,
      "gh --approve=true pr review 12",
      "gh -a pr review 12",
      "gh --method=PUT api repos/o/r/git/refs/heads/main -f sha=x",
      "gh -X PUT api repos/o/r/git/refs/heads/main -f sha=x",
    ]) {
      assert.equal(classifyShellCommand(command, { consentDir: dir }).permission, "deny", command);
    }
    assert.equal(classifyShellCommand(`gh pr merge 12 ${tail}`, { consentDir: dir }).permission, "allow");
    for (const command of ["gh --json number pr view 57", 'gh pr list --search "merge"', 'gh pr comment 12 --body="pr merge"', 'read -r a b <<< "$r"']) {
      assert.equal(classifyShellCommand(command).permission, "allow", command);
    }
  });

  it("treats the heredoc delimiter as the whole shell word: <<'E'OF ends at EOF", () => {
    const after = "echo $(gh pr merge 12)";
    assert.equal(classifyShellCommand(`cat <<'E'OF\nE\nEOF\n${after}`).permission, "deny");
    assert.equal(classifyShellCommand(`cat <<"E"OF\nopis\nEOF\n${after}`).permission, "deny");
    assert.equal(classifyShellCommand("cat <<'E'OF\nopis: gh pr merge 12\nEOF").permission, "allow");
    assert.equal(classifyShellCommand(`cat <<E"O"F\nopis: gh pr merge 12\nEOF\ngh pr merge 12 -R ${REPO} --merge --match-head-commit ${SHA}`).permission, "deny");
  });

  it("does not take a here-string for a heredoc", () => {
    assert.equal(classifyShellCommand("cat <<< EOF\necho $(gh pr merge 12)").permission, "deny");
    assert.equal(classifyShellCommand('cat <<< "x"\ngh pr merge 12').permission, "deny");
  });

  it("joins backslash-newline continuations before analysis", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    const ok = `gh pr merge 12 -R ${REPO} --merge --match-head-commit ${SHA}`;
    assert.equal(classifyShellCommand("gh pr review 12 \\\n --approve").permission, "deny");
    assert.equal(classifyShellCommand("gh -R o/r \\\n pr merge 12").permission, "deny");
    assert.equal(classifyShellCommand(`${ok} \\\n --admin`, { consentDir: dir }).permission, "deny");
    assert.equal(classifyShellCommand(`${ok} \\\n --delete-branch`, { consentDir: dir }).permission, "allow");
  });

  it("finds the gh subcommand structurally: first known command, then first known pr subcommand", () => {
    const dir = zgoda({ repo: "prezentytu/fiziyo-admin-portal" });
    const tail = `12 -R ${REPO} --merge --match-head-commit ${SHA}`;
    for (const command of [`gh pr 'merge' ${tail}`, `gh 'pr' merge ${tail}`, `gh pr "merge" ${tail}`, "gh pr 'review' 12 --approve", "gh 'pr' review 12 --approve"]) {
      assert.equal(classifyShellCommand(command, { consentDir: dir }).permission, "deny", command);
    }
    for (const command of ["gh pr list --search merge", "gh pr create --title t -a @me --label review", "gh pr create --title api --body x", "gh pr view 12 --json reviews"]) {
      assert.equal(classifyShellCommand(command).permission, "allow", command);
    }
  });

  it("explains the reason in the hook response", () => {
    const response = hookResponse("gh pr merge 12 --merge");
    assert.equal(response.permission, "deny");
    assert.match(response.agent_message, /match-head-commit/);
  });

  it("reads tool_input.command and cwd from a Claude Code hook payload on stdin", () => {
    const payload = JSON.stringify({ tool_input: { command: "gh pr merge 12 --merge" }, cwd: process.cwd() });
    const result = spawnSync(process.execPath, ["scripts/agent-guard.mjs"], { encoding: "utf8", input: payload });
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).permission, "deny");
  });
});
