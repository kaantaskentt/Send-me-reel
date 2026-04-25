#!/usr/bin/env bash
# Phase 6 — banned-words pre-commit guard.
#
# Soft warning by default: prints offending lines and exits 0 so it does NOT
# block commits. Set CD_COPY_STRICT=1 to fail the commit when banned words
# appear in user-facing strings.
#
# Wire as a pre-commit hook by symlinking from .git/hooks/pre-commit:
#   ln -s ../../scripts/check-copy.sh .git/hooks/pre-commit && chmod +x scripts/check-copy.sh
#
# Or via husky if/when we adopt it.

set -u

BANNED_REGEX='(Worth your time|Skim it|actionable|key takeaway|pro tip|bottom line|deep dive|valuable insights|great content|highly relevant|I recommend|consider exploring|stay ahead|fall behind|keep up|level up|10x|supercharge|unlock|leverage|optimize|elevate|powerful|robust|incredible|cutting-edge|comprehensive|game-changer|revolutionary|driven|ecosystem|utilize|streamline|sweet spot|on-brand)'

# Glob patterns to scan in staged changes
GLOBS=(
  'src/bot/'
  'src/pipeline/orchestrator.ts'
  'src/services/verdictGenerator.ts'
  'web/src/components/'
  'web/src/app/'
)

# Get staged files matching the globs (added/modified only)
STAGED=$(git diff --cached --name-only --diff-filter=AM 2>/dev/null \
  | grep -E '\.(ts|tsx)$' \
  | grep -E "^($(IFS='|'; echo "${GLOBS[*]}"))" \
  || true)

if [ -z "$STAGED" ]; then
  exit 0
fi

# Scan staged content (not the working tree — handles partial staging)
HITS=""
while IFS= read -r FILE; do
  [ -z "$FILE" ] && continue
  CONTENT=$(git show ":$FILE" 2>/dev/null || true)
  [ -z "$CONTENT" ] && continue
  # Skip the banned-words list itself
  case "$FILE" in
    .claude/copy-rules.md|scripts/check-copy.sh) continue ;;
  esac
  MATCHES=$(echo "$CONTENT" | grep -nE "$BANNED_REGEX" || true)
  if [ -n "$MATCHES" ]; then
    HITS="$HITS\n--- $FILE ---\n$MATCHES"
  fi
done <<< "$STAGED"

if [ -z "$HITS" ]; then
  exit 0
fi

echo "================================================================"
echo " ContextDrop copy guard — banned words detected in staged changes"
echo "================================================================"
echo -e "$HITS"
echo ""
echo "Voice rules: .claude/copy-rules.md"
echo "These words create the wrong emotional axis (rating, hype, hustle,"
echo "catch-up). Either rewrite, or set CD_COPY_STRICT=0 to bypass."
echo ""

if [ "${CD_COPY_STRICT:-0}" = "1" ]; then
  echo "CD_COPY_STRICT=1 → blocking commit."
  exit 1
fi

# Soft warning by default
exit 0
