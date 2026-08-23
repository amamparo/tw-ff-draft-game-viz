#!/usr/bin/env bash
# Stop hook: when source files changed during a task, block the stop once and
# tell Claude to run the vendored code-simplifier agent on the changed files.
# Loop guard 1: stop_hook_active=true means we already blocked this stop chain —
# record the current source-diff hash as "simplified" and allow the stop.
# Loop guard 2: a stamp file remembers the last simplified diff hash, so an
# unchanged working tree never re-triggers on later stops.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}"

input=$(cat)
stop_hook_active=$(printf '%s' "$input" | jq -r '.stop_hook_active // false')

STAMP=".claude/.simplify-stamp"
PATHS=(src rollup.config.js infrastructure/lib infrastructure/bin infrastructure/lambda)

changed=$(git diff HEAD --name-only -- "${PATHS[@]}" 2>/dev/null || true)
untracked=$(git ls-files --others --exclude-standard -- "${PATHS[@]}" 2>/dev/null || true)
files=$(printf '%s\n%s\n' "$changed" "$untracked" | sed '/^$/d' | sort -u)

if [ -z "$files" ]; then
  exit 0
fi

hash=$( { git diff HEAD -- "${PATHS[@]}" 2>/dev/null; if [ -n "$untracked" ]; then printf '%s\n' "$untracked" | xargs -r cat 2>/dev/null; fi; } | sha256sum | cut -d' ' -f1)

if [ "$stop_hook_active" = "true" ]; then
  printf '%s\n' "$hash" > "$STAMP"
  exit 0
fi

if [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$hash" ]; then
  exit 0
fi

file_list=$(printf '%s' "$files" | tr '\n' ' ')
jq -n --arg files "$file_list" '{decision: "block", reason: ("Source files changed during this task: " + $files + ". Before finishing, launch the code-simplifier agent (Agent tool, subagent_type: \"code-simplifier\", defined in .claude/agents/code-simplifier.md) on exactly those changed files to refine them for clarity while preserving behavior. If it reports nothing worth simplifying, you are done. Run it at most once per task.")}'
exit 0
