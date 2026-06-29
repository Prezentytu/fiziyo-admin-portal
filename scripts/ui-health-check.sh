#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${ROOT_DIR}/.ai/reports"
TODAY="$(date +%F)"
REPORT_PATH="${REPORT_DIR}/ui-health-${TODAY}.txt"

mkdir -p "${REPORT_DIR}"

HARD_CODED_BASE_COUNT="$(
  node --eval "
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(process.argv[1], 'src');
const filePattern = /\\.(ts|tsx|js|jsx|mdx)$/;
const colorPattern = /(bg|text|border|from|to|via)-(zinc|gray|slate|white|black)(-[0-9]{1,3})?/g;
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !filePattern.test(entry.name)) {
      continue;
    }
    const lines = fs.readFileSync(fullPath, 'utf8').split('\\n');
    for (const line of lines) {
      if (!colorPattern.test(line)) {
        continue;
      }
      if (!line.includes('dark:')) {
        count += 1;
      }
      colorPattern.lastIndex = 0;
    }
  }
}
walk(root);
console.log(count);
" "${ROOT_DIR}"
)"

TESTID_GUARD_OUTPUT="$(
  npm run --silent check:testids 2>&1 || true
)"
MISSING_TESTIDS_COUNT="$(
  printf '%s\n' "${TESTID_GUARD_OUTPUT}" \
    | awk '
      match($0, /current=[0-9]+/) {
        value = substr($0, RSTART + 8, RLENGTH - 8)
      }
      END {
        if (value == "") value = 0
        print value
      }
    '
)"

LOADING_STATE_FILES="$(
  node --eval "
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(process.argv[1], 'src');
const filePattern = /\\.(ts|tsx)$/;
const loadingPattern = /(isLoading|loading|Skeleton|Spinner)/;
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !filePattern.test(entry.name)) {
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (loadingPattern.test(content)) {
      count += 1;
    }
  }
}
walk(root);
console.log(count);
" "${ROOT_DIR}"
)"

EMPTY_STATE_FILES="$(
  node --eval "
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(process.argv[1], 'src');
const filePattern = /\\.(ts|tsx)$/;
const emptyPattern = /(EmptyState|Brak danych|No data|no results|Brak wyników|Brak ćwiczeń)/;
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !filePattern.test(entry.name)) {
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    if (emptyPattern.test(content)) {
      count += 1;
    }
  }
}
walk(root);
console.log(count);
" "${ROOT_DIR}"
)"

ANY_RATCHET_COUNT="$(
  node --eval "
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(process.argv[1], 'src');
const filePattern = /\\.(ts|tsx|js|jsx)$/;
const anyPattern = /(:\\s*any\\b|<\\s*any\\s*>|\\bas\\s+any\\b)/g;
let count = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !filePattern.test(entry.name)) {
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = content.match(anyPattern);
    if (matches) {
      count += matches.length;
    }
  }
}
walk(root);
console.log(count);
" "${ROOT_DIR}"
)"

PREVIOUS_REPORT=""
shopt -s nullglob
report_files=("${REPORT_DIR}"/ui-health-*.txt)
shopt -u nullglob
if [[ ${#report_files[@]} -gt 0 ]]; then
  IFS=$'\n' sorted_reports=($(printf '%s\n' "${report_files[@]}" | sort))
  unset IFS
  for report_file in "${sorted_reports[@]}"; do
    if [[ "${report_file}" != *"${TODAY}.txt" ]]; then
      PREVIOUS_REPORT="${report_file}"
    fi
  done
fi

write_metric() {
  local key="$1"
  local value="$2"
  printf '%s=%s\n' "${key}" "${value}"
}

{
  echo "# UI Health Report"
  write_metric "date" "${TODAY}"
  write_metric "generated_at_utc" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  write_metric "hardcoded_base_without_dark" "${HARD_CODED_BASE_COUNT}"
  write_metric "missing_testids_total" "${MISSING_TESTIDS_COUNT}"
  write_metric "loading_state_files" "${LOADING_STATE_FILES}"
  write_metric "empty_state_files" "${EMPTY_STATE_FILES}"
  write_metric "any_ratchet_count" "${ANY_RATCHET_COUNT}"
  echo
  echo "## Delta vs previous"
} > "${REPORT_PATH}"

if [[ -n "${PREVIOUS_REPORT}" ]]; then
  get_prev_metric() {
    local key="$1"
    local fallback="$2"
    awk -F= -v target="${key}" -v default_value="${fallback}" '
      $1 == target { value = $2 }
      END {
        if (value == "") {
          print default_value
        } else {
          print value
        }
      }
    ' "${PREVIOUS_REPORT}"
  }

  PREV_HARD_CODED="$(get_prev_metric "hardcoded_base_without_dark" "0")"
  PREV_TESTIDS="$(get_prev_metric "missing_testids_total" "0")"
  PREV_LOADING="$(get_prev_metric "loading_state_files" "0")"
  PREV_EMPTY="$(get_prev_metric "empty_state_files" "0")"
  PREV_ANY="$(get_prev_metric "any_ratchet_count" "0")"

  {
    write_metric "previous_report" "${PREVIOUS_REPORT##*/}"
    write_metric "delta_hardcoded_base_without_dark" "$((HARD_CODED_BASE_COUNT - PREV_HARD_CODED))"
    write_metric "delta_missing_testids_total" "$((MISSING_TESTIDS_COUNT - PREV_TESTIDS))"
    write_metric "delta_loading_state_files" "$((LOADING_STATE_FILES - PREV_LOADING))"
    write_metric "delta_empty_state_files" "$((EMPTY_STATE_FILES - PREV_EMPTY))"
    write_metric "delta_any_ratchet_count" "$((ANY_RATCHET_COUNT - PREV_ANY))"
  } >> "${REPORT_PATH}"
else
  write_metric "previous_report" "none" >> "${REPORT_PATH}"
fi

printf 'UI health report generated: %s\n' "${REPORT_PATH}"
