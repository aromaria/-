# Premiere Pro × Claude Code（MCP）自動編集

> iMac の Premiere Pro を Claude Code から操作する仕組みの記録と、編集時のルール。
> ルール本体 = `premiere/CLAUDE_premiere_rules.md`（iMac の `~/.claude/CLAUDE.md` に追記して使う）

## 構成（2026-10-26 導入）
- Premiere Pro 26.5.2 ／ macOS 26.3.1 ／ Node.js v24.16.0 ／ Claude Code 2.1.220（Proプランでログイン）
- MCP: `premiere-pro-mcp@1.15.1`（npm、MIT、第三者製。Adobe公式ではない）
  - 置き場所: `~/.premiere-mcp`（sudo不使用。`npm -g` は権限エラーになるため）
  - Premiereパネル: `~/Library/Application Support/Adobe/CEP/extensions/MCPBridgeCEP`
    （ウィンドウ > エクステンション > MCP for Adobe Premiere Pro）
  - `PlayerDebugMode=1`（CSXS.8〜14。導入前はすべて未設定）
- Claude Code 登録: `~/.claude.json`（user scope、名前 `premiere`）
  - 権限: `PREMIERE_MCP_CAPABILITIES=inspect,edit`（export / filesystem / unsafe-script は無効）
- `~/.claude/settings.json`: `defaultMode` を `bypassPermissions` → `default` に変更（バックアップ `settings.json.bak`）
  - 注意: allow リストに `Write(*)` 等があり、ファイル書き込みは確認なしで通る。見直しは保留

## 編集ルール（要点）
- **元の動画・元のシーケンスは使わない。コピーだけを編集する**
- 素材コピーはユーザーが Finder で ⌘D → 読み込み →「クリップに合わせた新規シーケンス」→ `〇〇 のコピー`
- Claude は「計画 → ユーザーが『実行して』→ 編集 → 報告・⌘S を促す」の順で進める

## 依頼文テンプレート
```
「〇〇 のコピー」シーケンスだけを対象に、〔やりたい編集〕をしたい。
まず読み取りだけで確認して、計画を日本語で見せて。私が「実行して」と言うまで編集しないで。
```

## メモ
- `verify_premiere_connection` は 1.15.1 に無い。接続確認は `ping`
- Safari の HTTPS-Only でログインの戻り先（localhost）が開けない → ターミナルのURL＋コード貼り付けでログイン
- 起動は `claude`。一番下に bypass / auto と出たら Shift+Tab で manual に戻す

## 元に戻す手順
```bash
~/.premiere-mcp/node_modules/.bin/premiere-pro-mcp --uninstall-cep   # Premiere終了後
claude mcp remove premiere -s user
rm -rf ~/.premiere-mcp
for v in 8 9 10 11 12 13 14; do defaults delete com.adobe.CSXS.$v PlayerDebugMode; done
```
