#!/usr/bin/env bash
set -euo pipefail

declare -A visited=()
queue=()

enqueue_dependencies() {
  local file=$1 repo
  [[ -f $file ]] || return 0
  while IFS= read -r repo || [[ -n $repo ]]; do
    repo=${repo%$'\r'}
    repo=${repo#"${repo%%[![:space:]]*}"}
    repo=${repo%"${repo##*[![:space:]]}"}
    [[ -z $repo || $repo == \#* ]] && continue
    if [[ ! $repo =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]]; then
      echo "Invalid repository name in $file: $repo" >&2
      exit 1
    fi
    queue+=("$repo")
  done < "$file"
}

if [[ ! -f $PROJECT_DEPS_PATH ]]; then
  echo "Dependency file not found: $PROJECT_DEPS_PATH" >&2
  exit 1
fi
enqueue_dependencies "$PROJECT_DEPS_PATH"
for ((index=0; index<${#queue[@]}; index++)); do
  repo=${queue[index]}
  [[ -v visited[$repo] ]] && continue
  visited[$repo]=1
  if [[ ! -d $repo ]]; then
    echo "Cloning repository: $repo"
    url="https://github.com/dbeaver/$repo.git"
    default_branch=$(git ls-remote --symref "$url" HEAD | awk '/^ref:/ {sub("refs/heads/", "", $2); print $2; exit}')
    git clone --depth 1 -b "${HEAD_BRANCH#refs/heads/}" "$url" 2>/dev/null || \
      git clone --depth 1 -b "${BASE_BRANCH#refs/heads/}" "$url" 2>/dev/null || \
      git clone --depth 1 -b "$default_branch" "$url"
  fi
  enqueue_dependencies "$repo/project.deps"
done
