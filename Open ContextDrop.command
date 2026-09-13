#!/bin/zsh
set -e
cd -- "${0:A:h}"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  print 'ContextDrop needs Node.js 22 or newer. Install it, then open this launcher again.'
  read -r '?Press Enter to close.'
  exit 1
fi
node scripts/start-personal.mjs "$@"
