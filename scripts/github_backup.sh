#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   export GITHUB_TOKEN=<your_token_with_repo_scope>
#   REPO_NAME=yohaku4423 REPO_URL=https://github.com/Itakura551/yohaku4423.git ./scripts/github_backup.sh
#
# Creates a private repo under your account (if needed) and pushes current 'main' and tags.
# Uses Authorization header for non-interactive git push.

REPO_NAME=${REPO_NAME:-yohaku}
REPO_URL=${REPO_URL:-}

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "[ERROR] GITHUB_TOKEN is not set."
  echo "Generate a Personal Access Token with 'repo' scope and export it:"
  echo "  export GITHUB_TOKEN=***"
  exit 1
fi

# Get login user via API (no jq dependency)
USER_LOGIN=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | python3 -c 'import sys,json; print(json.load(sys.stdin)["login"])')
if [[ -z "$USER_LOGIN" || "$USER_LOGIN" == "None" ]]; then
  echo "[ERROR] Failed to resolve GitHub user. Check your GITHUB_TOKEN."
  exit 1
fi

# Create repo if not exists (skip silently if already exists)
CREATE_RES=$(curl -s -H "Authorization: token $GITHUB_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"$REPO_NAME\",\"private\":true}" \
  https://api.github.com/user/repos)
if echo "$CREATE_RES" | grep -q 'name'; then
  echo "[INFO] Repository ensured: $USER_LOGIN/$REPO_NAME"
else
  echo "[INFO] Repo may already exist or creation skipped."
fi

# Determine remote URL
if [[ -n "$REPO_URL" ]]; then
  REMOTE_URL="$REPO_URL"
else
  REMOTE_URL="https://github.com/$USER_LOGIN/$REPO_NAME.git"
fi

# Configure remote
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

echo "[INFO] Pushing 'main' and tags to $REMOTE_URL"
# Ensure main branch exists
if ! git rev-parse --verify main >/dev/null 2>&1; then
  echo "[ERROR] Branch 'main' not found."
  exit 1
fi

# Build Authorization header (Basic auth with USER_LOGIN:TOKEN)
BASIC_HEADER=$(python3 - <<'PY'
import base64,os
u=os.environ['USER_LOGIN']
t=os.environ['GITHUB_TOKEN']
print('Authorization: Basic ' + base64.b64encode(f'{u}:{t}'.encode()).decode())
PY
)

# Push main with Authorization header
GIT_CONFIG_ARGS=("-c" "http.extraHeader=$BASIC_HEADER")

git "${GIT_CONFIG_ARGS[@]}" push -u origin main

# Push local tags (e.g., design savepoints)
if [[ -n "$(git tag -l)" ]]; then
  git "${GIT_CONFIG_ARGS[@]}" push --tags
else
  echo "[INFO] No tags to push."
fi

echo "[DONE] Backup pushed to: $REMOTE_URL"