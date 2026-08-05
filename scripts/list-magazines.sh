#!/bin/bash
# リザストのメルマガIDを確認する
# 使い方: ./scripts/list-magazines.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ARTICLES_DIR="$PROJECT_DIR/out/articles"

echo "📋 取得済み記事からメルマガIDを検出中..."
echo ""

if [ -d "$ARTICLES_DIR" ] && ls "$ARTICLES_DIR"/*.json >/dev/null 2>&1; then
  node -e "
const fs = require('fs');
const dir = '$ARTICLES_DIR';
const ids = {};
fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => {
  try {
    const d = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf-8'));
    const mid = d.mail_magazine_id || '不明';
    if (!ids[mid]) ids[mid] = { count: 0, subjects: [] };
    ids[mid].count++;
    if (ids[mid].subjects.length < 2) ids[mid].subjects.push((d.subject || '').substring(0, 40));
  } catch(e) {}
});
console.log('━━━ メルマガID一覧（取得済み記事より） ━━━');
Object.entries(ids).sort((a,b) => b[1].count - a[1].count).forEach(([mid, info]) => {
  console.log('  ID: ' + mid + '  (' + info.count + '件の記事)');
  info.subjects.forEach(s => console.log('    例: ' + s));
  console.log('');
});
console.log('新規記事を作成するには:');
console.log('  ./scripts/batch-create.sh メルマガID');
console.log('');
console.log('メインのメルマガ（最多記事）のIDで実行してください。');
" 2>/dev/null
else
  echo "❌ 取得済み記事がありません（out/articles/）"
  echo "先に ./scripts/batch-fetch.sh を実行してください"
fi
