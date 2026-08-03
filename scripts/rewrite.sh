#!/bin/bash
# メルマガリライト実行スクリプト
# 使い方: ./scripts/rewrite.sh 記事ID
#
# 初回のみ: scripts/rewrite.env にAPIキーを設定してください

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/rewrite.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  初回設定が必要です"
  echo ""
  echo "以下の手順で設定してください:"
  echo "1. $ENV_FILE を作成"
  echo "2. 中に以下を記入:"
  echo ""
  echo "   RESERVESTOCK_API_KEY=あなたのリザストAPIキー"
  echo "   GEMINI_API_KEY=あなたのGemini APIキー"
  echo ""
  echo "作成コマンド:"
  echo "  nano $ENV_FILE"
  exit 1
fi

source "$ENV_FILE"

if [ -z "$RESERVESTOCK_API_KEY" ]; then
  echo "❌ RESERVESTOCK_API_KEY が設定されていません（$ENV_FILE を確認）"
  exit 1
fi
if [ -z "$GEMINI_API_KEY" ]; then
  echo "❌ GEMINI_API_KEY が設定されていません（$ENV_FILE を確認）"
  exit 1
fi

ARTICLE_ID="${1:-}"
if [ -z "$ARTICLE_ID" ]; then
  echo "使い方: ./scripts/rewrite.sh 記事ID"
  echo "例:     ./scripts/rewrite.sh 3164481"
  exit 1
fi

echo "🔑 APIキー読み込み完了"
RESERVESTOCK_API_KEY="$RESERVESTOCK_API_KEY" \
GEMINI_API_KEY="$GEMINI_API_KEY" \
node newsletter-pipeline.js --rewrite \
  --article-id "$ARTICLE_ID" \
  --provider gemini \
  --model gemini-2.0-flash-lite
