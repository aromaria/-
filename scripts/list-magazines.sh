#!/bin/bash
# リザストのメルマガ一覧を取得
# 使い方: ./scripts/list-magazines.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/rewrite.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE が見つかりません"
  exit 1
fi

source "$ENV_FILE"

if [ -z "$RESERVESTOCK_API_KEY" ]; then
  echo "❌ RESERVESTOCK_API_KEY が未設定"
  exit 1
fi

echo "📋 メルマガ一覧を取得中..."
echo ""

RESPONSE=$(curl -s "https://www.reservestock.jp/api/mail_magazines" \
  -H "Authorization: Bearer $RESERVESTOCK_API_KEY")

echo "$RESPONSE" | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));
if (Array.isArray(data)) {
  console.log('━━━ メルマガ一覧 ━━━');
  data.forEach(m => {
    console.log('  ID: ' + m.id);
    console.log('  名前: ' + (m.title || m.name || '不明'));
    console.log('  読者数: ' + (m.subscriber_count || '?'));
    console.log('  ---');
  });
  console.log('');
  console.log('新規記事を作成するには:');
  console.log('  ./scripts/batch-create.sh メルマガID');
} else {
  console.log('取得失敗:');
  console.log(JSON.stringify(data, null, 2));
}
" 2>/dev/null
