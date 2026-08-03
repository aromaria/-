#!/bin/bash
# Claude Codeがリライトした記事を一括でリザストに保存（private）
# 使い方: ./scripts/batch-save.sh
#
# out/rewritten/ 内のJSONファイルを順番に保存します

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SCRIPT_DIR/rewrite.env"
REWRITTEN_DIR="$PROJECT_DIR/out/rewritten"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE が見つかりません"
  exit 1
fi

source "$ENV_FILE"

if [ -z "$RESERVESTOCK_API_KEY" ]; then
  echo "❌ RESERVESTOCK_API_KEY が未設定"
  exit 1
fi

if [ ! -d "$REWRITTEN_DIR" ]; then
  echo "❌ $REWRITTEN_DIR が見つかりません"
  echo "Claude Codeにリライトを依頼してください"
  exit 1
fi

FILES=$(ls "$REWRITTEN_DIR"/*.json 2>/dev/null)
if [ -z "$FILES" ]; then
  echo "❌ リライト済みファイルがありません"
  exit 1
fi

TOTAL=$(echo "$FILES" | wc -l | tr -d ' ')
echo "📤 ${TOTAL}件のリライト済み記事をリザストに保存します"
echo "   ※ すべて private（非公開）で保存されます"
echo ""

COUNT=0
SUCCESS=0
ERRORS=0

for FILE in $FILES; do
  COUNT=$((COUNT + 1))
  BASENAME=$(basename "$FILE" .json)
  ARTICLE_ID="$BASENAME"

  SUBJECT=$(node -e "const d=JSON.parse(require('fs').readFileSync('$FILE','utf-8'));console.log((d.subject||'').substring(0,40))" 2>/dev/null)
  echo -n "  📤 [$COUNT/$TOTAL] $ARTICLE_ID: $SUBJECT..."

  BODY=$(node -e "
const d=JSON.parse(require('fs').readFileSync('$FILE','utf-8'));
console.log(JSON.stringify({
  mail_magazine_article_id: parseInt('$ARTICLE_ID'),
  subject: d.subject,
  context: d.context,
  public_status: 'private'
}));
" 2>/dev/null)

  RESPONSE=$(curl -s -X POST "https://www.reservestock.jp/api/save_mail_magazine_article" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "Authorization: Bearer $RESERVESTOCK_API_KEY" \
    -d "$BODY")

  RESULT=$(echo "$RESPONSE" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log(d.result||'unknown')" 2>/dev/null)

  if [ "$RESULT" = "success" ]; then
    echo " ✅"
    SUCCESS=$((SUCCESS + 1))
  else
    echo " ❌"
    ERRORS=$((ERRORS + 1))
  fi

  sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 保存完了: ${SUCCESS}件成功 / ${ERRORS}件失敗"
echo "📝 すべてprivate（非公開）です。配信前にリザスト管理画面で内容を確認してください。"
