#!/bin/bash
# 全メルマガ記事を一括取得してgitにpush
# 使い方: ./scripts/batch-fetch.sh
#
# 取得した記事は out/articles/ に保存され、
# git push後にClaude Codeがリライトします

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SCRIPT_DIR/rewrite.env"
OUT_DIR="$PROJECT_DIR/out/articles"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE が見つかりません"
  echo "以下を実行してください:"
  echo ""
  echo "cat > scripts/rewrite.env << 'EOF'"
  echo "RESERVESTOCK_API_KEY=rs_live_あなたのキー"
  echo "EOF"
  exit 1
fi

source "$ENV_FILE"

if [ -z "$RESERVESTOCK_API_KEY" ]; then
  echo "❌ RESERVESTOCK_API_KEY が未設定"
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "🔍 メルマガ記事を検索中..."

SEARCH_RESULT=$(curl -s "https://www.reservestock.jp/api/search_mail_magazine_articles?keyword=%E3%82%A2%E3%83%AD%E3%83%9E&q=%E3%82%A2%E3%83%AD%E3%83%9E" \
  -H "Authorization: Bearer $RESERVESTOCK_API_KEY")

ARTICLE_IDS=$(echo "$SEARCH_RESULT" | node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/dev/stdin','utf-8'));
if (!data.mail_magazine_articles) { console.error('検索結果なし'); process.exit(1); }
data.mail_magazine_articles.forEach(a => console.log(a.id));
" 2>/dev/null)

if [ -z "$ARTICLE_IDS" ]; then
  echo "❌ 記事が見つかりませんでした"
  exit 1
fi

TOTAL=$(echo "$ARTICLE_IDS" | wc -l | tr -d ' ')
echo "📄 ${TOTAL}件の記事を取得します"
echo ""

COUNT=0
ERRORS=0

for ID in $ARTICLE_IDS; do
  COUNT=$((COUNT + 1))
  OUT_FILE="$OUT_DIR/${ID}.json"

  if [ -f "$OUT_FILE" ]; then
    echo "  ⏭  [$COUNT/$TOTAL] $ID（取得済み・スキップ）"
    continue
  fi

  echo -n "  📥 [$COUNT/$TOTAL] $ID を取得中..."

  RESPONSE=$(curl -s -X POST "https://www.reservestock.jp/api/proofread_mail_magazine_article" \
    -H "Content-Type: application/json; charset=utf-8" \
    -H "Authorization: Bearer $RESERVESTOCK_API_KEY" \
    -d "{\"mail_magazine_article_id\": $ID}")

  RESULT=$(echo "$RESPONSE" | node -e "
const fs = require('fs');
try {
  const data = JSON.parse(fs.readFileSync('/dev/stdin','utf-8'));
  if (data.result !== 'success') { console.error(data.error_code || 'error'); process.exit(1); }
  const a = data.mail_magazine_article;
  console.log(JSON.stringify({
    id: a.id,
    subject: a.subject || a.title || '',
    context: a.context || a.body || '',
    mail_magazine_id: a.step_mail_id || a.mail_magazine_id || ''
  }, null, 2));
} catch(e) { console.error('JSON parse error'); process.exit(1); }
" 2>/dev/null)

  if [ $? -eq 0 ]; then
    echo "$RESULT" > "$OUT_FILE"
    SUBJECT=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log(d.subject.substring(0,40))" 2>/dev/null)
    echo " ✅ $SUBJECT"
  else
    echo " ❌ 失敗"
    ERRORS=$((ERRORS + 1))
  fi

  sleep 2
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 取得完了: $((COUNT - ERRORS))件成功 / ${ERRORS}件失敗"
echo "📁 保存先: $OUT_DIR/"
echo ""
echo "次のステップ: gitにpushしてClaude Codeにリライトを依頼"
echo ""
echo "  cd $PROJECT_DIR"
echo "  git add out/articles/"
echo "  git commit -m '記事取得'"
echo "  git push origin claude/new-session-m35pxv"
