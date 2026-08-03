#!/bin/bash
# メルマガ記事の本文を取得してファイルに保存
# 使い方: ./scripts/fetch-article.sh 記事ID

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SCRIPT_DIR/rewrite.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE が見つかりません"
  exit 1
fi

source "$ENV_FILE"

ARTICLE_ID="${1:-}"
if [ -z "$ARTICLE_ID" ]; then
  echo "使い方: ./scripts/fetch-article.sh 記事ID"
  exit 1
fi

echo "📥 記事 $ARTICLE_ID を取得中..."

RESPONSE=$(curl -s -X POST "https://www.reservestock.jp/api/proofread_mail_magazine_article" \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "Authorization: Bearer $RESERVESTOCK_API_KEY" \
  -d "{\"mail_magazine_article_id\": $ARTICLE_ID}")

RESULT=$(echo "$RESPONSE" | node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/dev/stdin','utf-8'));
if (data.result !== 'success') {
  console.error(JSON.stringify(data));
  process.exit(1);
}
const a = data.mail_magazine_article;
const out = {
  id: a.id,
  subject: a.subject || a.title || '',
  context: a.context || a.body || '',
  mail_magazine_id: a.step_mail_id || a.mail_magazine_id || ''
};
console.log(JSON.stringify(out, null, 2));
" 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ エラー: $RESULT"
  exit 1
fi

OUT_FILE="$PROJECT_DIR/out/article-${ARTICLE_ID}.json"
mkdir -p "$PROJECT_DIR/out"
echo "$RESULT" > "$OUT_FILE"

SUBJECT=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log(d.subject)")
CHARS=$(echo "$RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log(d.context.length)")

echo "✅ 保存完了: $OUT_FILE"
echo "   件名: $SUBJECT"
echo "   本文: ${CHARS}文字"
