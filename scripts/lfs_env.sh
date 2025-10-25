#!/usr/bin/env bash
set -euo pipefail
# Add vendored Git LFS binary to PATH for this shell session
LFS_DIR="$(cd "$(dirname "$0")/../vendor/git-lfs-amd64/git-lfs-3.7.1" && pwd)"
export PATH="$LFS_DIR:$PATH"
# Show version to confirm activation
if command -v git >/dev/null 2>&1 && git lfs version >/dev/null 2>&1; then
  git lfs version
else
  echo "git lfs is not available in PATH; check $LFS_DIR"
fi