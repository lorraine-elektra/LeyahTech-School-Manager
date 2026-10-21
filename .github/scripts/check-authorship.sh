#!/usr/bin/env bash
# Usage: check-authorship.sh <base> <head>. An empty or all-zero base checks every commit reachable from head.
set -euo pipefail

owner_email="160536608+lorraine-elektra@users.noreply.github.com"
github_web_email="noreply@github.com"
base="${1:-}"
head="$2"

if [[ -z "$base" || "$base" =~ ^0+$ ]]; then
  range="$head"
else
  range="$base..$head"
fi

failed=0
for sha in $(git rev-list "$range"); do
  author=$(git show -s --format='%ae' "$sha")
  committer=$(git show -s --format='%ce' "$sha")
  subject=$(git show -s --format='%h %s' "$sha")

  if [[ "$author" != "$owner_email" ]]; then
    echo "::error::Commit $subject has author email $author. Set git config user.email to $owner_email and amend or rebase the commit."
    failed=1
  fi
  if [[ "$committer" != "$owner_email" && "$committer" != "$github_web_email" ]]; then
    echo "::error::Commit $subject has committer email $committer. Set git config user.email to $owner_email and amend or rebase the commit."
    failed=1
  fi
  if git show -s --format='%B' "$sha" | grep -qiE 'co-authored-by:.*claude|claude-session|generated with claude code'; then
    echo "::error::Commit $subject mentions Claude in its message. Remove the Co-Authored-By, Claude-Session or 'Generated with Claude Code' line and amend or rebase the commit."
    failed=1
  fi
done

if [[ $failed -eq 0 ]]; then
  echo "All commits in $range are authored by lorraine-elektra."
fi
exit $failed
