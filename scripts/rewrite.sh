#!/bin/bash
# メルマガリライト実行スクリプト
# 使い方: ./scripts/rewrite.sh 記事ID
#
# 初回のみ: scripts/rewrite.env にAPIキーを設定してください

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$SCRIPT_DIR/rewrite.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  初回設定が必要です"
  echo ""
  echo "以下の手順で設定してください:"
  echo "1. $ENV_FILE を作成"
  echo "2. 中に以下を記入（OpenAIまたはGeminiのどちらか）:"
  echo ""
  echo "   RESERVESTOCK_API_KEY=あなたのリザストAPIキー"
  echo "   OPENAI_API_KEY=あなたのOpenAI APIキー"
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

ARTICLE_ID="${1:-}"
if [ -z "$ARTICLE_ID" ]; then
  echo "使い方: ./scripts/rewrite.sh 記事ID"
  echo "例:     ./scripts/rewrite.sh 3164481"
  exit 1
fi

if [ -n "$OPENAI_API_KEY" ]; then
  PROVIDER="openai"
  MODEL="gpt-4o-mini"
  echo "🔑 APIキー読み込み完了（OpenAI / $MODEL）"
  RESERVESTOCK_API_KEY="$RESERVESTOCK_API_KEY" \
  OPENAI_API_KEY="$OPENAI_API_KEY" \
  node "$PROJECT_DIR/newsletter-pipeline.js" --rewrite \
    --article-id "$ARTICLE_ID" \
    --provider "$PROVIDER" \
    --model "$MODEL"
elif [ -n "$GEMINI_API_KEY" ]; then
  PROVIDER="gemini"
  MODEL="gemini-2.0-flash-lite"
  echo "🔑 APIキー読み込み完了（Gemini / $MODEL）"
  RESERVESTOCK_API_KEY="$RESERVESTOCK_API_KEY" \
  GEMINI_API_KEY="$GEMINI_API_KEY" \
  node "$PROJECT_DIR/newsletter-pipeline.js" --rewrite \
    --article-id "$ARTICLE_ID" \
    --provider "$PROVIDER" \
    --model "$MODEL"
else
  echo "❌ OPENAI_API_KEY または GEMINI_API_KEY のどちらかを設定してください（$ENV_FILE を確認）"
  exit 1
fi
