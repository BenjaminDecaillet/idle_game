#!/bin/bash
# PreToolUse(Bash) hook: compact the output of this repo's known-verbose commands.
#
# Rewrites plain `npm test` / `npx vitest run` / `npm run build` invocations so a
# passing run returns only the tail summary and a failing run returns the failing
# section, with the original exit code preserved. Commands that are already part
# of a pipe/compound expression are left untouched to avoid breaking them.
set -euo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')

# Leave compound/piped/redirected commands alone.
case "$cmd" in
  *'|'* | *'>'* | *'&&'* | *';'*) echo '{}'; exit 0 ;;
esac

wrap() {
  # $1 = original command, $2 = tail lines on success, $3 = tail lines on failure
  printf '__o=$(%s 2>&1); __c=$?; if [ "$__c" -eq 0 ]; then printf "%%s\\n" "$__o" | tail -n %s; else printf "%%s\\n" "$__o" | tail -n %s; fi; exit "$__c"' "$1" "$2" "$3"
}

new=""
case "$cmd" in
  'npm test' | 'npm test -- '* | 'npx vitest run'* | 'vitest run'*)
    new=$(wrap "$cmd" 6 150) ;;
  'npm run build')
    new=$(wrap "$cmd" 4 150) ;;
esac

if [ -n "$new" ]; then
  jq -cn --arg c "$new" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"allow",updatedInput:{command:$c}}}'
else
  echo '{}'
fi
