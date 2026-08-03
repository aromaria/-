#!/bin/bash
# リライト済みの記事をリザストに保存（private）
# 使い方: ./scripts/save-article.sh 記事ID リライト済みファイル.json

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/rewrite.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE が見つかりません"
  exit 1
fi

source "$ENV_FILE"

ARTICLE_ID="${1:-}"
INPUT_FILE="${2:-}"

if [ -z "$ARTICLE_ID" ] || [ -z "$INPUT_FILE" ]; then
  echo "使い方: ./scripts/save-article.sh 記事ID リライト済みファイル.json"
  exit 1
fi

if [ ! -f "$INPUT_FILE" ]; then
  echo "❌ ファイルが見つかりません: $INPUT_FILE"
  exit 1
fi

SUBJECT=$(node -e "const d=JSON.parse(require('fs').readFileSync('$INPUT_FILE','utf-8'));console.log(d.subject)")
CONTEXT_LEN=$(node -e "const d=JSON.parse(require('fs').readFileSync('$INPUT_FILE','utf-8'));console.log(d.context.length)")

echo "📤 記事 $ARTICLE_ID を保存中..."
echo "   件名: $SUBJECT"
echo "   本文: ${CONTEXT_LEN}文字"

BODY=$(node -e "
const d=JSON.parse(require('fs').readFileSync('$INPUT_FILE','utf-8'));
console.log(JSON.stringify({
  mail_magazine_article_id: $ARTICLE_ID,
  subject: d.subject,
  context: d.context,
  public_status: 'private'
}));
")

RESPONSE=$(curl -s -X POST "https://www.reservestock.jp/api/save_mail_magazine_article" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer $RESERVESTOCK_API_KEY" \
  -d "$BODY")

RESULT=$(echo "$RESPONSE" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log(d.result||'unknown')" 2>/dev/null)

if [ "$RESULT" = "success" ]; then
  echo "✅ 保存成功（private）"
else
  echo "❌ 保存失敗:"
  echo "$RESPONSE"
fi
