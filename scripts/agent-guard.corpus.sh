#!/usr/bin/env bash
# Korpus przypadków strażnika, przeniesiony 1:1 z baza-wiedzy PR #57 @ 7d07b6f (narzedzia/claude-code/hooks/guard_test.sh).
# Pominięte jako specyficzne dla baza-wiedzy: pułapki zsh/macOS (check_zsh, check_macos, zsh-agent.zsh, tryb.sh, zsh-instaluj.sh)
# i test skilla pr-ship. Uruchamia go scripts/agent-guard.corpus.test.mjs. Kod 0 = wszystkie przypadki zgodne.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
G="$ROOT/scripts/agent-guard.mjs"
REPO="$(mktemp -d)"; git -C "$REPO" init -q -b feat/base; git -C "$REPO" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
fail=0
total=0
check() { # expect(deny|allow) tool json-input
  local want="$1" tool="$2" input="$3"
  total=$((total + 1))
  out=$(printf '{"tool_name":"%s","cwd":"%s","tool_input":%s}' "$tool" "$REPO" "$input" | node "$G")
  got=allow; echo "$out" | grep -q '"deny"' && got=deny
  if [ "$got" != "$want" ]; then echo "FAIL ($want, dostałem $got): $tool $input"; fail=1; fi
}
check deny  Bash '{"command":"git push origin main"}'
check deny  Bash '{"command":"git push origin HEAD:main"}'
check deny  Bash '{"command":"git push -u origin feature:refs/heads/master"}'
check deny  Bash '{"command":"git push --force origin feat"}'
check deny  Bash '{"command":"git push -f origin feat"}'
check deny  Bash '{"command":"git push origin +feat"}'
check allow Bash '{"command":"git push --force-with-lease origin feat"}'
check allow Bash '{"command":"git push -u origin praca-z-agentami/x"}'
check deny  Bash '{"command":"cd /tmp && gh pr merge 12 --squash"}'
check deny  Bash '{"command":"gh api -X PUT repos/a/b/pulls/3/merge"}'
check allow Bash '{"command":"gh pr view 12 --json state"}'
check deny  Bash '{"command":"cat .env"}'
check deny  Bash '{"command":"head -5 fizjo-app/.env.local"}'
check deny  Bash '{"command":"cat AuthKey_Q8955Z3F28.p8"}'
check allow Bash '{"command":"cat .env.example"}'
check allow Bash '{"command":"git check-ignore -q .env"}'
check allow Bash '{"command":"ls -a | grep env"}'
check deny  Read '{"file_path":"/x/google-service-account.json"}'
check deny  Read '{"file_path":"/x/.env.production"}'
check allow Read '{"file_path":"/x/.env.example"}'
check allow Read '{"file_path":"/x/src/env.config.ts"}'
# tekst w heredoc / opisie PR / komunikacie commita to dane, nie polecenie
check deny  Bash '{"command":"gh pr create --title x --body \"$(cat <<EOF\nblokuje gh pr merge\ngit push --force origin feat\ntrue | git push origin main\ncat .env\nEOF\n)\""}'
check deny  Bash '{"command":"git commit -m \"guard: gh pr merge zablokowany\""}'
check deny  Bash '{"command":"echo ok && gh pr merge 5"}'
check deny  Bash '{"command":"ls | xargs cat .env"}'
check deny  Bash '{"command":"GIT_TRACE=1 git push origin main"}'
# review PR #18: potok, cd w potoku, opakowania, opcje globalne gita, merge GraphQL, .env.*.local
check deny  Bash '{"command":"true | git push origin main"}'
check deny  Bash '{"command":"true | gh pr merge 18 --squash"}'
check deny  Bash '{"command":"cd /tmp | git push origin main"}'
check deny  Bash '{"command":"npx gh pr merge 18 --squash"}'
check deny  Bash '{"command":"git -c protocol.file.allow=always push origin main"}'
check deny  Bash '{"command":"git --git-dir=.git push origin main"}'
check deny  Bash '{"command":"git --no-pager push origin main"}'
check deny  Bash '{"command":"bash -c '\''git push origin main'\''"}'
check deny  Bash '{"command":"bash -lc '\''git push origin main'\''"}'
check deny  Bash '{"command":"bash --norc -c '\''git push origin main'\''"}'
check deny  Bash '{"command":"command -p git push origin main"}'
check deny  Bash '{"command":"command git push origin main"}'
check deny  Bash '{"command":"env git push origin main"}'
check deny  Bash '{"command":"eval '\''git push origin main'\''"}'
check deny  Bash '{"command":"sudo cat .env"}'
check deny  Bash '{"command":"git push HEAD:main"}'
check deny  Bash '{"command":"git push --force-with-lease origin main"}'
check deny  Bash '{"command":"eval git push origin main"}'
check allow Bash '{"command":"git -c protocol.file.allow=always push --force-with-lease origin feat"}'
check allow Bash '{"command":"bash -c \"git status\""}'
check deny  Bash '{"command":"gh pr create --body \"true | git push origin main\""}'
check deny  Bash '{"command":"gh pr create --body \"mergePullRequest\""}'
check deny  Bash '{"command":"gh api graphql -f query=mutation{mergePullRequest(input:{}){clientMutationId}}"}'
check allow Bash '{"command":"gh api graphql -f query={pullRequest{mergeable}}"}'
check deny  Bash '{"command":"cat apps/web/.env.development.local"}'
check deny  Bash '{"command":"head -1 apps/web/.env.production.local"}'
check deny  Read '{"file_path":"/x/.env.development.local"}'
check deny  Read '{"file_path":"/x/.env.production.local"}'
check deny  Read '{"file_path":"/x/.env.test.local"}'
check allow Read '{"file_path":"/x/.env.sample"}'
# push bez refspec: tylko gdy bieżąca gałąź repo nie jest main/master (repo testowe na gałęzi feat/base)
check allow Bash '{"command":"git push"}'

# Merge agenta (praca-z-agentami/merge-agenta.md): tylko ze zgodą ship.mjs dla repo, PR i pełnego SHA, świeżą, bez --admin/--auto.
export GUARD_ZGODY="$(mktemp -d)"
S=abcdef1234567890abcdef1234567890abcdef12
mkdir -p "$GUARD_ZGODY/prezentytu/fizjo-app" "$GUARD_ZGODY/prezentytu/baza-wiedzy"
touch "$GUARD_ZGODY/prezentytu/fizjo-app/12__$S" "$GUARD_ZGODY/prezentytu/baza-wiedzy/12__$S"
check allow Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S --delete-branch\"}"
check allow Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S --delete-branch --body \\\"Merge agenta (ship.mjs gotowe-agent) @ abcdef1\\\"\"}"
check allow Bash "{\"command\":\"gh pr merge 12 --repo=Prezentytu/fizjo-app --squash --match-head-commit=$S\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S --admin\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --auto --match-head-commit $S\"}"
check deny  Bash "{\"command\":\"gh pr merge 13 -R Prezentytu/fizjo-app --merge --match-head-commit $S\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit ${S%?}0\"}"
check deny  Bash '{"command":"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit abcdef1"}'
check deny  Bash '{"command":"gh pr merge 12 -R Prezentytu/fizjo-app --merge"}'
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/portal --merge --match-head-commit $S\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/baza-wiedzy --merge --match-head-commit $S\"}"
check deny  Bash "{\"command\":\"gh pr merge --merge --match-head-commit $S -R Prezentytu/fizjo-app\"}"
check deny  Bash "{\"command\":\"gh api -X PUT repos/Prezentytu/fizjo-app/pulls/12/merge -f sha=$S\"}"
# Repo tylko jawnie (review #57): bez -R, z GH_REPO, z -R= i -R<repo> na inne repo, wielka litera w nazwie bazy.
check deny  Bash "{\"command\":\"gh pr merge 12 --merge --match-head-commit $S\"}"
check deny  Bash "{\"command\":\"GH_REPO=Prezentytu/baza-wiedzy gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -R=Prezentytu/baza-wiedzy --merge --match-head-commit $S\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -RPrezentytu/notatki-adam --merge --match-head-commit $S\"}"
check allow Bash "{\"command\":\"gh pr merge 12 -RPrezentytu/fizjo-app --merge --match-head-commit $S\"}"
check allow Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/Fizjo-App --merge --match-head-commit $S\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/Baza-Wiedzy --merge --match-head-commit $S\"}"
check deny  Bash '{"command":"/opt/homebrew/bin/gh pr merge 12 --admin"}'
check allow Bash "{\"command\":\"/opt/homebrew/bin/gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S\"}"
# Review #57 runda 2: wiązka krótkich flag z -R na inne repo.
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app -dRPrezentytu/baza-wiedzy --merge --match-head-commit $S\"}"
touch -t 202601010000 "$GUARD_ZGODY/prezentytu/fizjo-app/12__$S"
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S\"}"
# Runda 10: kontynuacja linii nie chowa flag przed strażnikiem.
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S --delete-branch \\\\\\n  --admin\"}"
touch "$GUARD_ZGODY/prezentytu/fizjo-app/12__$S"
# Runda 14: kanoniczna komenda nie niesie `$( )`.
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S --body \\\"\$(command gh pr merge 13 --admin)\\\"\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S \$(git push origin HEAD:main)\"}"
check deny  Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S --body \\\"\$(cat .env)\\\"\"}"
check allow Bash "{\"command\":\"gh pr merge 12 -R Prezentytu/fizjo-app --merge --match-head-commit $S --delete-branch --body \\\"Merge agenta (ship.mjs gotowe-agent) @ abcdef1\\\"\"}"
rm -rf "$GUARD_ZGODY"; unset GUARD_ZGODY
check deny  Bash '{"command":"gh pr review 12 --approve"}'
check deny  Bash '{"command":"gh pr review 12 -a -b ok"}'
check deny  Bash '{"command":"gh pr review 12 --approve=true"}'
check deny  Bash '{"command":"gh pr review 12 \"--approve\""}'
check deny  Bash '{"command":"gh pr review 12 -ab ok"}'
check deny  Bash '{"command":"/usr/local/bin/gh pr review 12 --approve"}'
check deny  Bash '{"command":"gh api repos/o/r/pulls/12/reviews -f event=APPROVE"}'
check allow Bash '{"command":"gh api repos/o/r/pulls/12/reviews"}'
check allow Bash '{"command":"gh pr review 12 --comment -b \"WERDYKT: PASS\""}'
# Review #57 runda 2: merge w konstrukcji powłoki (pętla, if, xargs, podpowłoka, $( )) i w innych zapisach gh.
check deny  Bash '{"command":"for n in 12 13; do gh pr merge $n; done"}'
check deny  Bash '{"command":"if true; then gh pr merge 12; fi"}'
check deny  Bash '{"command":"echo 12 | xargs gh pr merge"}'
check deny  Bash '{"command":"echo 12 | xargs -n1 gh pr merge"}'
check deny  Bash '{"command":"(gh pr merge 12)"}'
check deny  Bash '{"command":"{ gh pr merge 12; }"}'
check deny  Bash '{"command":"echo $(gh pr merge 12)"}'
check deny  Bash '{"command":"echo \"$(gh pr merge 12)\""}'
check deny  Bash '{"command":"exec gh pr merge 12"}'
check deny  Bash '{"command":"\\gh pr merge 12"}'
check deny  Bash '{"command":"\"gh\" pr merge 12"}'
check deny  Bash '{"command":"gh alias set m \"pr merge\""}'
check deny  Bash '{"command":"for p in 1 2; do gh pr review $p --approve; done"}'
check allow Bash '{"command":"for p in 1 2; do gh pr view $p --json mergeable; done"}'
check allow Bash '{"command":"gh alias list"}'
# Merge i approve przez API w innych zapisach.
check deny  Bash '{"command":"gh api graphql -f query=mutation{enablePullRequestAutoMerge(input:{}){clientMutationId}}"}'
check deny  Bash '{"command":"gh api repos/o/r/merges -f base=main -f head=feat"}'
check deny  Bash '{"command":"gh api -X PATCH repos/o/r/git/refs/heads/main -f sha=abc"}'
check allow Bash '{"command":"gh api repos/o/r/git/refs/heads/main --jq .object.sha"}'
check deny  Bash '{"command":"gh api repos/o/r/pulls/12/reviews --input body.json"}'
check deny  Bash '{"command":"gh api -X POST repos/o/r/pulls/12/reviews/5/events -F event=@e.txt"}'
check allow Bash '{"command":"gh api repos/o/r/pulls/12/reviews -f event=COMMENT -f body=ok"}'
check deny  Bash '{"command":"gh api graphql -F query=@zapytanie.graphql"}'
check deny  Bash '{"command":"gh api graphql -f query=mutation{addPullRequestReview(input:{pullRequestId:1}){clientMutationId}}"}'
check allow Bash '{"command":"gh api graphql -f query=mutation{addPullRequestReview(input:{pullRequestId:1,event:COMMENT}){clientMutationId}}"}'
# Review #57 runda 3: tekst commitu i opisu PR to dane, jawny GET to odczyt, kolejka merge'ów to merge.
check deny  Bash '{"command":"git commit -m\"fix gh pr merge\""}'
check deny  Bash '{"command":"git commit -m \"guard: \\\"do\\\" i gh pr merge w pętli\""}'
check deny  Bash '{"command":"gh pr create --title t --body=\"Po review: gh pr merge 12\""}'
check deny  Bash '{"command":"nice -n 5 gh pr merge 12"}'
check allow Bash '{"command":"gh api -X GET repos/o/r/pulls/12/reviews -F per_page=100"}'
check allow Bash '{"command":"gh api repos/o/r/pulls/12/reviews --method GET -f per_page=100 --jq \".[].state\""}'
check allow Bash '{"command":"gh api -X GET repos/o/r/git/refs/heads/main -f x=1"}'
check deny  Bash '{"command":"gh api graphql -f query=\"mutation{enqueuePullRequest(input:{pullRequestId:1}){clientMutationId}}\""}'
check deny  Bash '{"command":"gh api graphql -f query=\"$(cat q.graphql)\""}'
# Review #57 runda 4: metoda to ostatnie -X ze słów (nie z tekstu), przypisanie wyniku merge'u do zmiennej.
check deny  Bash '{"command":"gh api repos/o/r/pulls/1/reviews -f event=APPROVE -f body=\"Sprawdzone: gh api --method GET zwraca 200\""}'
check deny  Bash '{"command":"gh api -X PATCH repos/o/r/git/refs/heads/main -f sha=abc -f message=\"nie -X GET\""}'
check deny  Bash '{"command":"gh api --method=GET -X PUT repos/o/r/git/refs/heads/main -f sha=abc"}'
check allow Bash '{"command":"gh api -XGET repos/o/r/git/refs/heads/main -f x=1"}'
check deny  Bash '{"command":"out=$(gh pr merge 12 --squash)"}'
check deny  Bash '{"command":"out=\"$(gh pr merge 12)\""}'
check deny  Bash '{"command":"export X=$(gh pr merge 12)"}'
check deny  Bash '{"command":"local x=`gh pr merge 12`"}'
check deny  Bash '{"command":"git commit -m\"$(gh pr merge 12)\""}'
check allow Bash '{"command":"out=$(gh pr view 12 --json state)"}'
check deny  Bash '{"command":"git commit -m '\''opis: $(gh pr merge 12)'\''"}'
# Review #57 runda 5: apostrof w podwójnym cudzysłowie to zwykły znak, nie początek pojedynczego.
check deny  Bash '{"command":"echo \"it'\''s $(gh pr merge 12)\" '\''x'\''"}'
check deny  Bash '{"command":"git commit -m \"don'\''t\" -m \"$(gh pr merge 12)\" -m \"won'\''t\""}'
check deny  Bash '{"command":"git commit -m \"say \\\"hi\\\" it'\''s $(gh pr merge 12)\" '\''x'\''"}'
# Runda 6: bez modelowania cudzysłowów; `$(gh` w surowym poleceniu to zawsze DENY, nawet jako dane w '…'.
check deny  Bash '{"command":"echo \"it'\''s fine\" '\''$(gh pr merge 12)'\''"}'
check deny  Bash '{"command":"echo \"$(echo \"it'\''s\")\" \"$(gh pr merge 12)\""}'
check deny  Bash '{"command":"echo hi # it'\''s\necho \"$(gh pr merge 12)\""}'
check deny  Bash '{"command":"echo $'\''it\\'\''s'\'' \"$(gh pr merge 12)\""}'
check deny  Bash '{"command":"cat <<EOF\nit'\''s $(gh pr merge 12)\nEOF"}'
check deny  Bash '{"command":"cat <<EOF\nopis: gh pr merge 12\nEOF"}'
# Runda 7: -R przed podkomendą; heredoc z ogranicznikiem w cudzysłowie to dane (powłoka go nie rozwija).
check deny  Bash '{"command":"gh -R Prezentytu/fizjo-app pr merge 12 --squash"}'
check deny  Bash '{"command":"gh --repo X/y pr merge 12"}'
check deny  Bash '{"command":"gh --repo=X/y pr merge 12"}'
check deny  Bash '{"command":"gh pr -R o/r merge 12"}'
check deny  Bash '{"command":"gh -R o/r pr review 12 --approve"}'
check deny  Bash '{"command":"gh -R o/r alias set m \"pr merge\""}'
check deny  Bash '{"command":"echo $(gh -R o/r pr merge 12)"}'
check allow Bash '{"command":"gh -R o/r pr view 12"}'
check deny  Bash '{"command":"gh pr create --title t --body \"$(cat <<'\''EOF'\''\nkomenda: `gh pr merge 12`\nEOF\n)\""}'
check deny  Bash '{"command":"gh pr create --title t --body \"$(cat <<EOF\nkomenda: `gh pr merge 12`\nEOF\n)\""}'
# Runda 8: każda flaga przed podkomendą (gh ją przekazuje dalej), ogranicznik heredoca jak w powłoce.
check deny  Bash '{"command":"gh --delete-branch=true pr merge 12 -R o/r"}'
check deny  Bash '{"command":"gh pr --delete-branch=true merge 12 -R o/r"}'
check deny  Bash '{"command":"gh -R o/r --squash=true pr merge 12"}'
check deny  Bash '{"command":"gh --approve=true pr review 12"}'
check deny  Bash '{"command":"gh --method=PUT api repos/o/r/pulls/1/merge"}'
check allow Bash '{"command":"gh --json=number pr view 57 -R o/r"}'
check deny  Bash '{"command":"cat <<'\''E'\''OF\nhi\nEOF\ngh pr merge 12"}'
# Runda 9: podkomenda po słowach, nie po pozycji; here-string to nie heredoc.
check deny  Bash '{"command":"gh --match-head-commit abc pr merge 12 -R o/r --admin"}'
check deny  Bash '{"command":"gh pr --match-head-commit abc merge 12 -R o/r"}'
check deny  Bash '{"command":"gh -b x pr merge 12 -R o/r"}'
check deny  Bash '{"command":"gh pr -t x merge 99 -R o/r"}'
check deny  Bash '{"command":"gh -b x pr review 12 --approve"}'
check deny  Bash '{"command":"gh -X PUT api repos/o/r/pulls/1/merge"}'
check deny  Bash '{"command":"gh --method PUT api repos/o/r/pulls/1/merge"}'
check deny  Bash '{"command":"cat <<< \"x\"\ngh pr merge 12"}'
check allow Bash '{"command":"gh --json number pr view 57 -R o/r"}'
check allow Bash '{"command":"gh pr list --search \"merge\""}'
check allow Bash '{"command":"read -r a b <<< \"$r\"\necho ok"}'
# Runda 10: kontynuacja linii, podkomenda w cudzysłowie, podkomenda rozpoznana strukturalnie (bez fałszywych DENY).
check deny  Bash '{"command":"gh pr review 12 \\\n  --approve"}'
check deny  Bash '{"command":"gh -R o/r \\\n  pr merge 12"}'
check deny  Bash '{"command":"gh api \\\n  repos/o/r/pulls/1/merge -X PUT"}'
check deny  Bash '{"command":"gh pr '\''merge'\'' 12"}'
check deny  Bash '{"command":"gh '\''pr'\'' merge 12"}'
check allow Bash '{"command":"gh pr list --search merge"}'
check allow Bash '{"command":"gh pr create --title t -a @me --label review"}'
check allow Bash '{"command":"gh pr create --title api --body x"}'
# Runda 11: kontynuacja nie skleja treści heredoca z cudzysłowem ani `\\`, flaga z wartością przed komendą, aliasy pr.
check deny  Bash '{"command":"cat > /tmp/x.md <<'\''EOF'\''\nlinia \\\nEOF\ngh pr merge 12"}'
check deny  Bash '{"command":"cat > /tmp/x.md <<'\''EOF'\''\nlinia \\\nEOF\ngit push origin main"}'
check deny  Bash '{"command":"echo C:\\\\\ngh pr merge 12"}'
check deny  Bash '{"command":"gh -b api pr merge 12"}'
check allow Bash '{"command":"cat > /tmp/x.md <<'\''EOF'\''\nlinia \\\nEOF\necho ok"}'
check allow Bash '{"command":"gh pr ls --search merge"}'
check allow Bash '{"command":"gh pr new --title merge"}'
check allow Bash '{"command":"gh pr ls -a @me --label review"}'
# Runda 12: `<<` w cudzysłowie, komentarzu i $((…)) to nie heredoc; heredoc bez ogranicznika nie chowa reszty; alias import.
check deny  Bash '{"command":"git commit -m \"fix: heredoc <<'\''EOF'\'' w guard\"\ngit push origin main"}'
check deny  Bash '{"command":"git commit -m \"guard: obsługa <<EOF\"\ngh pr merge 12"}'
check deny  Bash '{"command":"gh pr create --title x --body \"uzyj <<'\''EOF'\''\"\ngh pr review 12 --approve"}'
check deny  Bash '{"command":"# zapis przez <<'\''EOF'\''\ngh pr merge 12"}'
check deny  Bash '{"command":"echo $((1<<3))\ngh pr merge 12"}'
check deny  Bash '{"command":"python3 -c '\''print(1<<2)'\''\ngh pr merge 12"}'
check deny  Bash '{"command":"bash -c '\''cat <<EOF\nx\nEOF'\''\ngh pr merge 12"}'
check deny  Bash '{"command":"echo \"x <<y\"; cat <<'\''EOF'\''\nbody\nEOF\ngh pr merge 12"}'
check deny  Bash '{"command":"gh alias import - <<'\''EOF'\''\nm: pr merge\nEOF"}'
check deny  Bash '{"command":"echo \"x <<y\"; cat <<'\''EOF'\''\ngh pr merge 12\nEOF\necho ok"}'
# Runda 13: bramka na surowym tekście. Nic nie jest zdejmowane: heredoc, cudzysłów i komentarz nie chowają poleceń.
# Świadomy koszt: tekst z `gh pr merge` / `--approve` / push na main w poleceniu to DENY (treść do pliku przez Write).
check deny  Bash '{"command":"git commit -m \"guard: heredoc\n\nobsługa <<EOF w sklej i strip\"\ngit push origin main\ngh pr create --title x --body \"$(cat <<'\''EOF'\''\nopis\nEOF\n)\""}'
check deny  Bash '{"command":"# git push origin feat \\\ngit push origin main"}'
check deny  Bash '{"command":"echo ok # koniec \\\ngit push origin main"}'
check deny  Bash '{"command":"# podglad \\\ncat .env"}'
check deny  Bash '{"command":"echo $'\''don\\'\''t use <<EOF'\''\ngh pr merge 12\ncat <<EOF\nx\nEOF"}'
check deny  Bash '{"command":"git commit -m \"$(cat <<'\''EOF'\''\nfix: x\nEOF)\"\ngh pr merge 12 --squash\ngh pr comment 12 --body-file - <<'\''EOF'\''\nok\nEOF"}'
check deny  Bash '{"command":"git commit -m \"it'\''s ok\"\nX=1 /usr/bin/git push origin HEAD:main"}'
check allow Bash '{"command":"gh pr create --title t --body-file /tmp/opis.md"}'
check allow Bash '{"command":"gh pr create --title t --body \"$(cat <<'\''EOF'\''\nPolityka merge agenta, review przez principal.\nEOF\n)\""}'
check allow Bash '{"command":"git commit -m \"review #57: merge tylko z ship.mjs\""}'
check allow Bash '{"command":"git push -u origin feat/x \\\n  --force-with-lease"}'
# Runda 14: wycinek kończy się na `)` i przekierowaniu, numer PR w zmiennej, `\⏎` bez spacji, HEAD z main, czytniki.
check deny  Bash '{"command":"(cd /tmp && git push origin main)"}'
check deny  Bash '{"command":"(git push origin main)"}'
check deny  Bash '{"command":"x=$(git push origin main)"}'
check deny  Bash '{"command":"git push origin main>/dev/null"}'
check deny  Bash '{"command":"\\git push origin main"}'
check deny  Bash '{"command":"export $(cat .env)"}'
check deny  Bash '{"command":"(cat .env)"}'
check deny  Bash '{"command":"cat .env>/tmp/x"}'
check deny  Bash '{"command":"cat<.env"}'
check deny  Bash '{"command":"x=\"$(<.env)\""}'
check deny  Bash '{"command":"/bin/cat .env"}'
check deny  Bash '{"command":"diff .env .env.example"}'
check deny  Bash '{"command":"gh api -X PUT repos/o/r/pulls/$N/merge"}'
check deny  Bash '{"command":"gh api -X PUT \"repos/o/r/pulls/${N}/merge\""}'
check deny  Bash '{"command":"gh api repos/o/r/pulls/$N/reviews --input r.json"}'
check deny  Bash '{"command":"gh pr mer\\\nge 13 --admin"}'
check deny  Bash '{"command":"gh pr review 13 --appr\\\nove"}'
check deny  Bash '{"command":"git push origin ma\\\nin"}'
check deny  Bash '{"command":"gh api graphql -f query=\"mutation { mergeBranch(input: {}) { clientMutationId } }\""}'
check deny  Bash '{"command":"gh api graphql -f query=\"mutation { updateRef(input: {}) { clientMutationId } }\""}'
check deny  Bash '{"command":"gh api -X PUT repos/o/r/contents/a.md -f message=x -f content=eA=="}'
check deny  Bash '{"command":"gh repo sync o/r --branch main"}'
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
REPO="$T" check deny  Bash '{"command":"git push origin HEAD"}'
REPO="$T" check deny  Bash '{"command":"git push -u origin @"}'
git -C "$T" checkout -q -b feat/x
REPO="$T" check allow Bash '{"command":"git push -u origin HEAD"}'
rm -rf "$T"
check allow Bash '{"command":"(cd /tmp && git push origin feat/x)"}'
check allow Bash '{"command":"gh api repos/o/r/contents/a.md"}'
# Runda 15: cel pushu niejawny ($( ), HEAD po cd/-C), --all/--mirror, glob i warianty .env, doklejone -fevent.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
REPO="$T" check deny  Bash '{"command":"git push -u origin $(git branch --show-current)"}'
REPO="$T" check deny  Bash '{"command":"git push -u origin \"$(git rev-parse --abbrev-ref HEAD)\""}'
REPO="$T" check deny  Bash '{"command":"git push -u origin `git branch --show-current`"}'
git -C "$T" checkout -q -b feat/x
REPO="$T" check allow Bash '{"command":"git push -u origin $(git branch --show-current)"}'
REPO="$T" check deny  Bash '{"command":"(cd ../inne && git push origin HEAD)"}'
REPO="$T" check deny  Bash '{"command":"(cd ../inne && git push)"}'
REPO="$T" check deny  Bash '{"command":"cd ../inne 2>/dev/null && git push origin HEAD"}'
REPO="$T" check deny  Bash '{"command":"git -C sub push origin HEAD"}'
REPO="$T" check deny  Bash '{"command":"git push --all origin"}'
REPO="$T" check deny  Bash '{"command":"git push --mirror origin"}'
REPO="$T" check allow Bash '{"command":"cd ../inne && git push -u origin feat/x"}'
rm -rf "$T"
check deny  Bash '{"command":"cat .env*"}'
check deny  Bash '{"command":"grep SUPABASE .env*"}'
check deny  Bash '{"command":"head -n 3 .env.*"}'
check deny  Bash '{"command":"cat .env.dev"}'
check deny  Bash '{"command":"cat apps/api/.env.prod"}'
check allow Bash '{"command":"cat .env.example"}'
check allow Bash '{"command":"cat *.md"}'
check deny  Bash '{"command":"gh api repos/o/r/pulls/12/reviews -fevent=APPROVE"}'
# Runda 16: jawny cel main przy dynamicznym źródle, cd/pushd w bash -c, --branches, -o z wartością, `:`, glob tylko dla kropki.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
git -C "$T" checkout -q -b feat/x
REPO="$T" check deny  Bash '{"command":"git push origin \"$SHA:main\""}'
REPO="$T" check deny  Bash '{"command":"git push origin $SHA:main"}'
REPO="$T" check deny  Bash '{"command":"git push origin \"${SHA}:refs/heads/main\""}'
REPO="$T" check deny  Bash '{"command":"git push origin \"$(git rev-parse HEAD):main\""}'
REPO="$T" check deny  Bash '{"command":"bash -c '\''pushd ../other && git push'\''"}'
REPO="$T" check deny  Bash '{"command":"sh -c '\''cd \"$O\" && git push origin HEAD'\''"}'
REPO="$T" check deny  Bash '{"command":"eval '\''cd ../other && git push'\''"}'
REPO="$T" check deny  Bash '{"command":"git push --branches origin"}'
REPO="$T" check deny  Bash '{"command":"git push origin :"}'
git -C "$T" checkout -q main
REPO="$T" check deny  Bash '{"command":"git push -o ci.skip origin"}'
rm -rf "$T"
check allow Bash '{"command":"cat *"}'
check allow Bash '{"command":"grep -n TODO src/*"}'
check allow Bash '{"command":"grep -c '\''.*'\'' README.md"}'
check deny  Bash '{"command":"cat .*"}'
# Runda 17: push tylko z literalnych nazw i znanych opcji (allowlista); idiom bieżącej gałęzi to HEAD.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
REPO="$T" check deny  Bash '{"command":"git push origin ${BRANCH:-main}"}'
REPO="$T" check deny  Bash '{"command":"git push -uo ci.skip origin"}'
REPO="$T" check deny  Bash '{"command":"git push --recurse-submodules check origin"}'
git -C "$T" checkout -q -b feat/x
REPO="$T" check deny  Bash '{"command":"git push origin HEAD:${BASE:-main}"}'
REPO="$T" check deny  Bash '{"command":"git push origin \"HEAD:${TARGET:-refs/heads/main}\""}'
REPO="$T" check deny  Bash '{"command":"git push origin HEAD:\"main\""}'
REPO="$T" check deny  Bash '{"command":"git push origin HEAD:'\''main'\''"}'
REPO="$T" check deny  Bash '{"command":"git push origin feat:\"refs/heads/main\""}'
REPO="$T" check deny  Bash '{"command":"git push origin '\''refs/heads/*:refs/heads/*'\''"}'
REPO="$T" check deny  Bash '{"command":"git push origin refs/heads/*"}'
REPO="$T" check deny  Bash '{"command":"git push --prune origin"}'
REPO="$T" check allow Bash '{"command":"git push -u origin \"feat/x\""}'
REPO="$T" check allow Bash '{"command":"git push -uq origin feat/x --force-with-lease"}'
REPO="$T" check allow Bash '{"command":"git push -o ci.skip origin feat/x"}'
REPO="$T" check allow Bash '{"command":"git push origin HEAD:feat/y"}'
REPO="$T" check allow Bash '{"command":"git push -u origin \"$(git branch --show-current)\""}'
REPO="$T" check allow Bash '{"command":"git push origin --delete feat/stara"}'
rm -rf "$T"
# Runda 18: zmiana gałęzi przed niejawnym pushem, heads/main, jedyny argument to remote, GIT_DIR, przekierowania.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
git -C "$T" checkout -q -b feat/x
REPO="$T" check deny  Bash '{"command":"git checkout main && git merge feat/x && git push"}'
REPO="$T" check deny  Bash '{"command":"git switch main && git push origin HEAD"}'
REPO="$T" check deny  Bash '{"command":"git checkout main && git push -u origin $(git branch --show-current)"}'
REPO="$T" check deny  Bash '{"command":"git push origin HEAD:heads/main"}'
REPO="$T" check deny  Bash '{"command":"git push origin heads/main"}'
REPO="$T" check deny  Bash '{"command":"GIT_DIR=../inne/.git git push origin HEAD"}'
REPO="$T" check allow Bash '{"command":"git push -u origin feat/x 2>&1 | tail -5"}'
REPO="$T" check allow Bash '{"command":"git push --force-with-lease origin feat/x 2>&1 | tail -3"}'
REPO="$T" check allow Bash '{"command":"git push -u origin feat/x > /dev/null"}'
REPO="$T" check allow Bash '{"command":"git push origin feat/x 2>/dev/null || true"}'
REPO="$T" check allow Bash '{"command":"git push -u origin feat/x # komentarz"}'
REPO="$T" check allow Bash '{"command":"git push https://github.com/o/r.git"}'
git -C "$T" checkout -q main
REPO="$T" check deny  Bash '{"command":"git push git@github.com:o/r.git"}'
REPO="$T" check deny  Bash '{"command":"git push https://github.com/o/r.git"}'
rm -rf "$T"
# Runda 19: przekierowanie w środku pushu nie ucina argumentów (powłoka usuwa tylko operator i cel).
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
git -C "$T" checkout -q -b feat/x
for c in 'git push 2>&1 origin main' 'git push 2>/dev/null origin main' 'git push 2>&1 -u origin main' \
         'git push 2>&1 origin HEAD:main' 'git push -q 2>&1 origin feat:main' 'git push origin feat 2>&1 main' \
         'git push origin feat > /dev/null main' 'git push origin feat >/dev/null main' 'git push origin feat &> log main' \
         'git push origin feat < /dev/null main' 'git push origin feat 2>&1 refs/heads/main' 'git push origin feat 2>&1 --all' \
         'git push origin feat 2>&1 -f' 'git push origin feat 2>&1 +feat:main' \
         'git rebase origin/main main && git push' 'gh pr checkout 12 && git push'; do
  REPO="$T" check deny Bash "{\"command\":\"$c\"}"
done
REPO="$T" check allow Bash '{"command":"git push -u origin feat/x 2>&1 | tail -5"}'
REPO="$T" check allow Bash '{"command":"git push 2>&1 -u origin feat/x"}'
REPO="$T" check allow Bash '{"command":"git fetch && git rebase origin/main && git push --force-with-lease"}'
rm -rf "$T"
# Runda 20: `>|` to przekierowanie, nie potok; niejawny push tylko po poleceniach git z listy bezpiecznych.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
git -C "$T" checkout -q -b feat/x
for c in 'git push -u origin feat >| /tmp/log 2>&1 HEAD:main' 'git push origin feat >| log main' 'git push origin feat >|log main' \
         'git push origin feat >>| log main' 'git branch -M main && git push -u origin HEAD' 'git branch -m main && git push' \
         'git stash branch main && git push' 'git 2>&1 push origin main' 'git -C . 2>/dev/null push origin main' \
         'git \\\ncheckout main && git push' 'git rebase origin/main --autostash main && git push' \
         'git co main && git push' 'git config push.default matching && git push' 'git rebase --onto x y main && git push'; do
  REPO="$T" check deny Bash "{\"command\":\"$c\"}"
done
REPO="$T" check allow Bash '{"command":"git rebase origin/main 2>&1 && git push --force-with-lease"}'
REPO="$T" check allow Bash '{"command":"git push origin feat>/dev/null 2>&1"}'
REPO="$T" check allow Bash '{"command":"git push origin feat/x &"}'
REPO="$T" check allow Bash '{"command":"git push origin feat/x >| /tmp/log"}'
REPO="$T" check allow Bash '{"command":"git add -A && git commit -m x && git push -u origin HEAD"}'
REPO="$T" check allow Bash '{"command":"git status && git log --oneline -3 && git push"}'
rm -rf "$T"
# Runda 21: rebase w toku (detached HEAD), konfiguracja pushu w poleceniu, chdir, env -C, xargs.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
git -C "$T" checkout -q --detach
REPO="$T" check deny Bash '{"command":"git rebase --continue && git push"}'
REPO="$T" check deny Bash '{"command":"git push"}'
git -C "$T" checkout -q -b feat/x
for c in 'git -c remote.origin.push=HEAD:heads/main push' 'V=HEAD:heads/main git --config-env=remote.origin.push=V push' \
         'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=remote.origin.push GIT_CONFIG_VALUE_0=HEAD:heads/main git push' \
         'git -c remote.origin.push=feat:heads/main push origin feat' 'git -c push.default=matching push origin' \
         'git -c push.default=upstream push' 'git push origin feat:heads/main' 'chdir ../w2 && git push' \
         'env -C ../w2 git push' 'env --chdir=../w2 git push -u origin HEAD' 'echo main | xargs git push origin' \
         'printf HEAD:main | xargs git push -u origin' 'git stash branch main && git push'; do
  REPO="$T" check deny Bash "{\"command\":\"$c\"}"
done
for c in 'git pull --rebase && git push' 'git pull && git push' 'git stash && git push' 'git stash pop && git push' \
         'git -c user.name=x commit -m y && git push -u origin HEAD'; do
  REPO="$T" check allow Bash "{\"command\":\"$c\"}"
done
rm -rf "$T"
# Runda 22: opcje powłoki przed -c, git w cudzysłowie/backtickach, remote --mirror, przekierowanie przed stash branch.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
for c in "bash -o pipefail -c 'git push'" "bash -euo pipefail -c 'git add -A && git commit -m x && git push'" \
         'zsh -o pipefail -c \"git push\"' "bash -O extglob -c 'git push'" "bash --rcfile /dev/null -c 'git push'" \
         "caffeinate -i sh -c 'git push'" 'r=`git push`'; do
  REPO="$T" check deny Bash "$(python3 -c 'import json,sys; print(json.dumps({"command": sys.argv[1].replace("\\\"", "\"")}))' "$c")"
done
git -C "$T" tag main
REPO="$T" check deny Bash '{"command":"git push"}'
git -C "$T" checkout -q -b feat/x
for c in "bash -o pipefail -c 'git checkout main && git push'" 'git remote add --mirror=push bk /tmp/x && git push bk' \
         'git stash 2>/dev/null branch main && git push -u origin HEAD'; do
  REPO="$T" check deny Bash "$(python3 -c 'import json,sys; print(json.dumps({"command": sys.argv[1]}))' "$c")"
done
for c in 'git remote -v && git push' 'env | grep X && git commit -C HEAD && git push' "bash -o pipefail -c 'git push -u origin feat/x'"; do
  REPO="$T" check allow Bash "$(python3 -c 'import json,sys; print(json.dumps({"command": sys.argv[1]}))' "$c")"
done
rm -rf "$T"
# Runda 23: słowo sklejone z cytowanych kawałków, `'"'"'`, backtick, `bash -ce`.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
j() { python3 -c 'import json,sys; print(json.dumps({"command": sys.argv[1]}))' "$1"; }
for c in "bash -c 'echo '\"'\"'x'\"'\"'; git push'" 'echo `git status -s; git push`' "bash -c \"x\"'; git push'" \
         'x=`true; git push`' "bash -ce 'git status; git push'" "bash -c -e 'git status; git push'" \
         "bash -co pipefail 'git status; git push'" "bash -c 'printf \"%s\\n\" '\"'\"'a'\"'\"' && git push'"; do
  REPO="$T" check deny Bash "$(j "$c")"
done
git -C "$T" checkout -q -b feat/x
for c in "sh -c 'git push origin '\"main\"" "sh -c 'git push '\"-f\"" "sh -c 'git push '\"--all\"" \
         "sh -c 'git push origin '\"+feat\"" "sh -c 'git push origin '\"\$B\"" "sh -c \"git push origin \"'main'" \
         "sh -c 'git push origin'\" main\"" "sh -c 'gh api repos/o/r/git/refs/heads/main '\"-X PATCH -f sha=abc\"" \
         "sh -c 'gh api repos/o/r/contents/README.md '\"-X PUT -f message=x\"" "sh -c 'gh pr review 5 '\"-a\""; do
  REPO="$T" check deny Bash "$(j "$c")"
done
for c in "bash -o pipefail -c 'git push -u origin feat/x'" "git commit -m 'x' && git push -u origin HEAD" \
         "sh -c 'git status' && git push -u origin feat/x"; do
  REPO="$T" check allow Bash "$(j "$c")"
done
rm -rf "$T"
# Runda 24: `\n` w `$'…'`, printf i echo -e to w wykonaniu nowa linia.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
for c in "bash -c \$'git status --short\\ngit push origin main'" "bash -c \$'git commit -m x\\ngit push'" \
         "eval \$'git status\\ngit push origin main'" "printf 'git status\\ngit push origin main\\n' | sh" \
         "echo -e 'git status\\ngit push' | bash" "bash -c \$'echo\\ngh api -X PATCH repos/o/r/git/refs/heads/main -f sha=abc'" \
         "bash -c \$'echo\\ncat .env'" "printf 'cat .env.local\\n' | sh" "bash -c \$'git status\\x0agit push'"; do
  REPO="$T" check deny Bash "$(j "$c")"
done
git -C "$T" checkout -q -b feat/x
for c in "bash -c \$'git checkout main\\ngit push'" "zsh -c \$'cd /tmp\\ngit push'"; do
  REPO="$T" check deny Bash "$(j "$c")"
done
for c in "git commit -m 'a\\nb' && git push -u origin feat/x" "printf '%s\\n' x && git push"; do
  REPO="$T" check allow Bash "$(j "$c")"
done
rm -rf "$T"
# Runda 25: przekierowanie doklejone do nazwy, liczbowe ucieczki, alias w -c, klamry, `\cat`.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
for c in 'git>/dev/null push' "bash -c \$'git status\\xagit push origin main'" "printf 'git status\\xagit push origin main\\n' | sh" \
         "bash -c \$'git status\\uagit push origin main'" "echo -e 'git status\\0012git push origin main' | sh" \
         "bash -c \$'x\\ngit>/dev/null push'"; do
  REPO="$T" check deny Bash "$(j "$c")"
done
git -C "$T" checkout -q -b feat/x
for c in 'git>/dev/null push origin main' 'git&>/dev/null push origin main' 'git<&- push origin main' \
         'git>/dev/null push --force origin feat/x' 'git>/dev/null checkout main && git push' 'git>/dev/null -C ../main push' \
         'gh>/dev/null pr -R o/r merge 12' 'gh>/dev/null pr -R o/r review 12 -a' \
         'gh>/dev/null api -X PATCH repos/o/r/git/refs/heads/main -f sha=abc' 'cat>&2 .env' \
         'git -c "alias.p=push origin main" p' 'V=x git --config-env=alias.p=V p' 'cat .env{,.example}' \
         'head -n1 .env{,.local}' '\cat .env'; do
  REPO="$T" check deny Bash "$(j "$c")"
done
for c in 'git log --format=%h%n%s && git push -u origin feat/x' 'cat .env{.example,.sample}' 'git2>/dev/null status'; do
  REPO="$T" check allow Bash "$(j "$c")"
done
rm -rf "$T"
# Korpus sesji: `cd <ścieżka> && … git push` na początku to repo w tej ścieżce, nie nieznane repo.
T=$(mktemp -d); git -C "$T" init -q -b main; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
U=$(mktemp -d); git -C "$U" init -q -b feat/x; git -C "$U" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
REPO="$U" check deny  Bash "$(j "cd $T && git push -q 2>&1 | tail -2")"
REPO="$U" check deny  Bash "$(j "cd '$T' && git add -A && git commit -m x && git push")"
REPO="$T" check allow Bash "$(j "cd $U && git push -q 2>&1 | tail -2")"
REPO="$T" check allow Bash "$(j "cd \"$U\" && git add -A && git commit -q -m x && git push -u origin HEAD")"
REPO="$T" check deny  Bash "$(j "cd $U && cd $T && git push")"
REPO="$T" check deny  Bash "$(j "cd $U && git switch main && git push")"
REPO="$T" check deny  Bash "$(j "cd \$X && git push")"
REPO="$T" check deny  Bash "$(j "cd $U; git push")"
rm -rf "$T" "$U"
# Runda 26: słowo sklejone z kawałka w cudzysłowie i bez (`"ma"in`).
T=$(mktemp -d); git -C "$T" init -q -b feat/x; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
for c in 'git push origin "ma"in' "git push origin 'ma'in" 'git push origin "m"ain' 'git push -u origin "ma"in' \
         'git push origin "ma""in"' "git push origin \"ma\"'in'" "bash -c 'git push origin \"ma\"in'"; do
  REPO="$T" check deny Bash "$(j "$c")"
done
REPO="$T" check allow Bash "$(j "cd $T 2>/dev/null && git push")"
REPO="$T" check allow Bash "$(j 'git commit -m "x" && git push -u origin "feat/x"')"
rm -rf "$T"
# Runda 27: cudzysłów w opcjach merge'u ze zgodą, `.env` jako słowo sklejone albo polecenie w cudzysłowie.
Z=$(mktemp -d); S=0123456789abcdef0123456789abcdef01234567; mkdir -p "$Z/prezentytu/fizjo-app"; touch "$Z/prezentytu/fizjo-app/12__$S"
K="gh pr merge 12 -R prezentytu/fizjo-app --merge --match-head-commit $S --delete-branch"
for c in "$K --\"admin\"" "$K --a\"uto\"" "$K --a''dmin" "$K -\"-admin\"" "$K -\"R\" prezentytu/baza-wiedzy" \
         "$K --re\"po\"=prezentytu/notatki-adam" "$K --\"match-head-commit\" ffffffffffffffffffffffffffffffffffffffff"; do
  GUARD_ZGODY="$Z" check deny Bash "$(j "$c")"
done
GUARD_ZGODY="$Z" check allow Bash "$(j "$K --body \"Merge agenta (ship.mjs gotowe-agent) @ 0123456\"")"
GUARD_ZGODY="$Z" check allow Bash "$(j "$K --body 'Merge agenta (ship.mjs gotowe-agent) @ 0123456'")"
rm -rf "$Z"
T=$(mktemp -d); git -C "$T" init -q -b feat/x; git -C "$T" -c user.name=t -c user.email=t@t commit -q --allow-empty -m t
for c in 'cat ".e"nv' "cat '.e'nv.local" "cat .e''nv" '"cat" .env' "'head' .env" '"source" .env' "c''at .env" \
         'cat < ".e"nv' "bash -c 'cat \".e\"nv'" "cd $T && cat \".e\"nv"; do
  REPO="$T" check deny Bash "$(j "$c")"
done
for c in "cat '.*'" 'cat "*"' "cd $T &>/dev/null && git push"; do
  REPO="$T" check allow Bash "$(j "$c")"
done
U=$(mktemp -d)
REPO="$U" check allow Bash "$(j "cd $T 2>/dev/null && git push")"
rm -rf "$T" "$U"
# Runda 28: ze zgodą przechodzi tylko dokładny kształt komendy z ship.mjs (komentarz, wiązki flag).
Z=$(mktemp -d); S=0123456789abcdef0123456789abcdef01234567; mkdir -p "$Z/prezentytu/fizjo-app"; touch "$Z/prezentytu/fizjo-app/12__$S"
for c in "gh pr merge 12 -R prezentytu/baza-wiedzy --merge --delete-branch # -R prezentytu/fizjo-app --match-head-commit $S" \
         "gh pr merge 12 -R prezentytu/fizjo-app --merge --delete-branch # --match-head-commit $S" \
         "gh pr merge -dt 12 99 -R prezentytu/fizjo-app --merge -db --match-head-commit=$S" \
         "gh pr merge 12 -R prezentytu/baza-wiedzy --merge -db -R=prezentytu/fizjo-app -dt --match-head-commit=$S" \
         "gh pr merge 12 -R prezentytu/fizjo-app --merge --match-head-commit $S -db 99" \
         "gh pr merge 12 -R prezentytu/fizjo-app --merge --match-head-commit $S --delete-branch --subject x" \
         "gh pr merge 12 -R prezentytu/fizjo-app --merge --match-head-commit $S --body x --admin"; do
  GUARD_ZGODY="$Z" check deny Bash "$(j "$c")"
done
GUARD_ZGODY="$Z" check allow Bash "$(j "gh pr merge 12 -R prezentytu/fizjo-app --merge --match-head-commit $S --delete-branch --body \"Merge agenta # x --admin\"")"
rm -rf "$Z"
rm -rf "$REPO"
echo "przypadków: $total"
[ $fail = 0 ] && echo "guard: wszystkie przypadki OK"
exit $fail
