#!/bin/bash
# Premiere 自動編集のセットアップ（iMac で1回実行。何度実行しても同じ結果になる）
set -euo pipefail

BASE="https://raw.githubusercontent.com/aromaria/-/935fc63087967a8ca8c0784a8a4b27439c81f72a/premiere"
C="$HOME/.claude"
MCP="$HOME/.premiere-mcp/node_modules/premiere-pro-mcp/dist/index.js"
NODE="$(command -v node)"

[ -f "$MCP" ] || { echo "premiere-pro-mcp が見つかりません: $MCP"; exit 1; }
mkdir -p "$C/commands"

echo "1/4 指示書を ~/.claude/premiere-rules.md に保存"
curl -fsSL "$BASE/CLAUDE_premiere_rules.md" -o "$C/premiere-rules.md"
touch "$C/CLAUDE.md"
[ -f "$C/CLAUDE.md.bak" ] || cp "$C/CLAUDE.md" "$C/CLAUDE.md.bak"
sed -i '' '/^# Premiere Pro 自動編集ルール/,$d' "$C/CLAUDE.md"
grep -qF "@~/.claude/premiere-rules.md" "$C/CLAUDE.md" || printf '\n@~/.claude/premiere-rules.md\n' >> "$C/CLAUDE.md"

echo "2/4 /youtube コマンドを追加"
curl -fsSL "$BASE/youtube.md" -o "$C/commands/youtube.md"

echo "3/4 premiere の権限を inspect,edit,export,filesystem で登録し直し"
claude mcp remove premiere -s user >/dev/null 2>&1 || true
claude mcp add --scope user premiere --env PREMIERE_MCP_CAPABILITIES=inspect,edit,export,filesystem -- "$NODE" "$MCP"

echo "4/4 premiere のツールだけ確認なしで使えるように許可（Bash などは従来どおり確認あり）"
S="$C/settings.json"
[ -f "$S" ] || echo '{}' > "$S"
[ -f "$S.before-premiere" ] || cp "$S" "$S.before-premiere"
"$NODE" -e '
const fs = require("fs"), p = process.argv[1];
const s = JSON.parse(fs.readFileSync(p, "utf8"));
s.permissions = s.permissions || {};
s.permissions.allow = s.permissions.allow || [];
if (!s.permissions.allow.includes("mcp__premiere")) s.permissions.allow.push("mcp__premiere");
fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
' "$S"

echo
claude mcp get premiere | grep -E "CAPABILITIES|Status" || true
echo "完了。Premiere を開いて claude を起動し、/youtube 〔やりたい編集〕 と入力してください。"
