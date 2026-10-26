#!/usr/bin/env bash
# Preserve concurrent publishers' commits; never overwrite a conflicting feed.
set -euo pipefail
# Manual dispatch must never promote a preview branch's unrelated commits.
if [ "$(git symbolic-ref --quiet --short HEAD || true)" != main ] ||
   [ "${GITHUB_REF:-refs/heads/main}" != refs/heads/main ]; then
    echo 'Weather publication requires the main branch.' >&2
    exit 1
fi
for attempt in 1 2 3; do
    if git push origin HEAD:main; then
        exit 0
    fi
    if [ "$attempt" -eq 3 ]; then
        echo 'Weather publication stopped after three push attempts.' >&2
        exit 1
    fi
    git fetch origin main
    if ! git rebase origin/main; then
        git rebase --abort
        echo 'Weather publication stopped: concurrent changes conflict.' >&2
        exit 1
    fi
done
