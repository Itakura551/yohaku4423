#!/usr/bin/env bash
set -euo pipefail

TAG_NAME="design-save-$(date +%Y%m%d-%H%M%S)"

echo "[INFO] Creating design savepoint tag: $TAG_NAME"

git tag -a "$TAG_NAME" -m "Design savepoint"
echo "[INFO] Created tag: $TAG_NAME"

if git remote get-url origin >/dev/null 2>&1; then
  echo "[INFO] Attempting to push tags to origin"
  if ! git push --tags; then
    echo "[WARN] Push failed (likely due to auth). Use:"
    echo "  REPO_URL=$(git remote get-url origin) ./scripts/github_backup.sh"
  fi
else
  echo "[INFO] No 'origin' remote. Set it before pushing tags."
fi