#!/bin/bash
# post-to-reservestock.sh
# メルマガ記事をリザストに投稿するワンクリックスクリプト
# Mac Shortcuts / cron / 手動実行 共通

# ── 設定（環境に合わせて変更） ──
REPO_DIR="${AROMARIA_MAIL_DIR:-/Users/aromaria/aromaria-mail/aromaria-mail/aromaria-mail}"
API_KEY="${RESERVESTOCK_API_KEY:-rs_live_e5315efcbcbf5b5e01f1c701a4ed9fef139f3c5fb1ee7bf3}"
LOG_FILE="$REPO_DIR/logs/post-$(date +%Y%m%d-%H%M%S).log"

# ── 実行 ──
mkdir -p "$REPO_DIR/logs"

{
  echo "===== $(date '+%Y-%m-%d %H:%M:%S') メルマガ投稿開始 ====="

  cd "$REPO_DIR" || { echo "エラー: $REPO_DIR が見つかりません"; exit 1; }

  echo "最新コードを取得中..."
  git pull origin claude/new-session-m35pxv 2>&1

  if [ $? -ne 0 ]; then
    echo "エラー: git pull に失敗しました"
    exit 1
  fi

  echo "リザストに投稿中..."
  RESERVESTOCK_API_KEY="$API_KEY" node post-newsletters.js 2>&1
  RESULT=$?

  if [ $RESULT -eq 0 ]; then
    echo "===== 投稿成功 ====="
  else
    echo "===== エラーで終了（コード: $RESULT） ====="
  fi

  echo ""
} | tee "$LOG_FILE"

# macOS通知（Shortcuts/cronから実行時に結果を知らせる）
if [ $RESULT -eq 0 ]; then
  osascript -e 'display notification "メルマガ記事をリザストに投稿しました" with title "アロマリア" sound name "Glass"' 2>/dev/null
else
  osascript -e 'display notification "メルマガ投稿でエラーが発生しました。ログを確認してください" with title "アロマリア" sound name "Basso"' 2>/dev/null
fi
