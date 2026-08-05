#!/bin/bash
# 新規記事をリザストに作成（private）
# 使い方: ./scripts/batch-create.sh [mail_magazine_id]
#
# out/rewritten/ 内の id:0 のファイル（新規記事）を
# create_mail_magazine_article APIで作成します
#
# mail_magazine_id はリザスト管理画面で確認:
#   管理画面 → メルマガ → 対象メルマガの設定 → URLのIDを確認
#   または: ./scripts/list-magazines.sh で一覧取得

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

MAGAZINE_ID="${1:-}"
if [ -z "$MAGAZINE_ID" ]; then
  echo "📋 mail_magazine_id を確認中..."
  RESPONSE=$(curl -s "https://www.reservestock.jp/api/mail_magazines" \
    -H "Authorization: Bearer $RESERVESTOCK_API_KEY")

  echo ""
  echo "━━━ あなたのメルマガ一覧 ━━━"
  echo "$RESPONSE" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
if (Array.isArray(data)) {
  data.forEach(m => {
    console.log('  ID: ' + m.id + '  名前: ' + (m.title || m.name || '不明') + '  読者数: ' + (m.subscriber_count || '?'));
  });
} else {
  console.log('  取得失敗: ' + JSON.stringify(data));
}
" 2>/dev/null
  echo ""
  echo "使い方: ./scripts/batch-create.sh メルマガID"
  echo "例: ./scripts/batch-create.sh 123456"
  exit 0
fi

# id:0 の新規記事ファイルを探す
NEW_FILES=""
for FILE in "$REWRITTEN_DIR"/*.json; do
  [ -f "$FILE" ] || continue
  FILE_ID=$(node -e "const d=JSON.parse(require('fs').readFileSync('$FILE','utf-8'));console.log(d.id)" 2>/dev/null)
  BASENAME=$(basename "$FILE" .json)
  IS_NUMERIC=$(echo "$BASENAME" | grep -cE '^[0-9]+$')

  if [ "$FILE_ID" = "0" ] || [ "$IS_NUMERIC" = "0" ]; then
    NEW_FILES="$NEW_FILES $FILE"
  fi
done

if [ -z "$NEW_FILES" ]; then
  echo "✅ 新規記事（id:0）はありません。すべて既存記事です。"
  echo "   既存記事の保存は ./scripts/batch-save.sh を使ってください。"
  exit 0
fi

TOTAL=$(echo "$NEW_FILES" | wc -w | tr -d ' ')
echo "📤 ${TOTAL}件の新規記事をリザストに作成します"
echo "   メルマガID: $MAGAZINE_ID"
echo "   ※ すべて private（非公開）で作成されます"
echo ""

COUNT=0
SUCCESS=0
ERRORS=0

for FILE in $NEW_FILES; do
  COUNT=$((COUNT + 1))
  BASENAME=$(basename "$FILE" .json)

  SUBJECT=$(node -e "const d=JSON.parse(require('fs').readFileSync('$FILE','utf-8'));console.log((d.subject||'').substring(0,50))" 2>/dev/null)
  echo -n "  📝 [$COUNT/$TOTAL] $BASENAME: $SUBJECT..."

  BODY=$(node -e "
const d=JSON.parse(require('fs').readFileSync('$FILE','utf-8'));
console.log(JSON.stringify({
  mail_magazine_id: parseInt('$MAGAZINE_ID'),
  subject: d.subject,
  context: d.context,
  public_status: 'private'
}));
" 2>/dev/null)

  RESPONSE=$(curl -s -X POST "https://www.reservestock.jp/api/create_mail_magazine_article" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "Authorization: Bearer $RESERVESTOCK_API_KEY" \
    -d "$BODY")

  RESULT=$(echo "$RESPONSE" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
if (d.result === 'success') {
  console.log('success');
  if (d.mail_magazine_article_id) {
    console.error('新ID: ' + d.mail_magazine_article_id);
  }
} else {
  console.log(d.result || d.error || 'unknown');
}
" 2>/dev/null)

  if [ "$RESULT" = "success" ]; then
    echo " ✅"
    SUCCESS=$((SUCCESS + 1))
  else
    echo " ❌ ($RESULT)"
    ERRORS=$((ERRORS + 1))
  fi

  sleep 3
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 作成完了: ${SUCCESS}件成功 / ${ERRORS}件失敗"
echo "📝 すべてprivate（非公開）です。配信前にリザスト管理画面で内容を確認してください。"
