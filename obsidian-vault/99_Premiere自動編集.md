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
- Claude が自動で: 素材を `cp -n` でコピー → `import_media` → `create_sequence_from_clips` で `〇〇 のコピー` → 編集 → 報告・⌘S を促す
  （読み込み・シーケンス作成は edit 権限で可能。filesystem 権限は不要）
- 「確認してから」と言った時だけ、計画を見せて「実行して」を待つ

## 依頼文テンプレート
```
今開いている動画で、〔やりたい編集〕をして。
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
