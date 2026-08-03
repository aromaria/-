#!/bin/bash
# watch-and-post.sh
# C. Gitフック型: 新しい記事があれば自動投稿
# cronから呼び出して使う（例: 10分おき）

REPO_DIR="${AROMARIA_MAIL_DIR:-/Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail}"
API_KEY="${RESERVESTOCK_API_KEY:-rs_live_e5315efcbcbf5b5e01f1c701a4ed9fef139f3c5fb1ee7bf3}"
LAST_HASH_FILE="$REPO_DIR/.last-posted-hash"

cd "$REPO_DIR" || exit 1

git fetch origin claude/new-session-m35pxv 2>/dev/null

REMOTE_HASH=$(git rev-parse origin/claude/new-session-m35pxv 2>/dev/null)
LOCAL_HASH=$(cat "$LAST_HASH_FILE" 2>/dev/null || echo "none")

if [ "$REMOTE_HASH" = "$LOCAL_HASH" ]; then
  exit 0
fi

CHANGED=$(git diff "$LOCAL_HASH"..origin/claude/new-session-m35pxv --name-only 2>/dev/null | grep -c 'content/')
if [ "$CHANGED" -eq 0 ] && [ "$LOCAL_HASH" != "none" ]; then
  echo "$REMOTE_HASH" > "$LAST_HASH_FILE"
  exit 0
fi

git pull origin claude/new-session-m35pxv 2>&1

RESERVESTOCK_API_KEY="$API_KEY" node post-newsletters.js 2>&1
RESULT=$?

if [ $RESULT -eq 0 ]; then
  echo "$REMOTE_HASH" > "$LAST_HASH_FILE"
  osascript -e 'display notification "新しいメルマガ記事をリザストに自動投稿しました" with title "アロマリア" sound name "Glass"' 2>/dev/null
fi
