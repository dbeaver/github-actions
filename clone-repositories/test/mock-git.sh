#!/usr/bin/env bash
set -euo pipefail

case "$1" in
  ls-remote)
    printf 'ref: refs/heads/main\tHEAD\n'
    ;;
  clone)
    branch=$5
    url=$6
    repo=${url##*/}
    repo=${repo%.git}
    if [[ $repo == second && $branch == feature ]]; then
      exit 1
    fi
    printf '%s %s\n' "$repo" "$branch" >> "$CLONE_LOG"
    cp -R "$FIXTURES/$repo" "$repo"
    ;;
  *) exit 1 ;;
esac
