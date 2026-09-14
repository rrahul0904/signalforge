#!/usr/bin/env bash
set -euo pipefail
REPO="${1:-rrahul0904/signalforge}"
VISIBILITY="${2:---public}"
command -v gh >/dev/null 2>&1 || { echo 'GitHub CLI (gh) is required: https://cli.github.com/'; exit 1; }
gh auth status >/dev/null
if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" "$VISIBILITY" --description "Evidence-backed product memory and AI marketing workspace" --source=. --remote=origin --push
else
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/${REPO}.git"
  git push -u origin main
fi
printf '\nRepository: https://github.com/%s\n' "$REPO"
