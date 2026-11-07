#!/usr/bin/env bash
set -euo pipefail

action_dir=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/bin" "$tmp/fixtures/first" "$tmp/fixtures/second" "$tmp/fixtures/third" "$tmp/work"
cp "$action_dir/test/mock-git.sh" "$tmp/bin/git"
printf 'second\nthird\n' > "$tmp/fixtures/first/project.deps"
printf 'first\nthird\n' > "$tmp/fixtures/second/project.deps"
printf '# no dependencies\n' > "$tmp/fixtures/third/project.deps"
printf '  first\r\nfirst\n# comment\n\n' > "$tmp/work/project.deps"

export PATH="$tmp/bin:$PATH" FIXTURES="$tmp/fixtures" CLONE_LOG="$tmp/clones"
export PROJECT_DEPS_PATH=project.deps HEAD_BRANCH=refs/heads/feature BASE_BRANCH=refs/heads/main
(
  cd "$tmp/work"
  bash "$action_dir/clone.sh"
)

[[ $(wc -l < "$CLONE_LOG") -eq 3 ]]
grep -qx 'first feature' "$CLONE_LOG"
grep -qx 'second main' "$CLONE_LOG"
grep -qx 'third feature' "$CLONE_LOG"
printf 'missing\n' > "$tmp/work/project.deps"
if (cd "$tmp/work" && bash "$action_dir/clone.sh" >/dev/null 2>&1); then
  echo 'Missing repository was accepted' >&2
  exit 1
fi
PROJECT_DEPS_PATH=does-not-exist
if (cd "$tmp/work" && bash "$action_dir/clone.sh" >/dev/null 2>&1); then
  echo 'Missing dependency file was accepted' >&2
  exit 1
fi
printf 'Recursive clone test passed\n'
