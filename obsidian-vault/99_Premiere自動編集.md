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
- 必ず **1 コピー → 2 自動編集 → 3 確認 → 4 YouTube用に書き出し** の順（Claude が自動で進める）
  1. 素材を `cp -n` でコピー → `import_media`（**filesystem 権限が必要**。無ければユーザーが ⌘I）→ `create_sequence_from_clips` で `〇〇 のコピー`
  2. コピーシーケンスだけを編集（「確認してから」と言った時だけ計画で止まる）
  3. 編集前後の比較・元シーケンス/元ファイルが無傷かを ✅/❌ で報告 → ユーザーが再生確認 → ⌘S → 「OK」で次へ
  4. `export_sequence`（**export 権限が必要**）で MP4（H.264+AAC）を `/Volumes/ELECOM/Premiere作業/YouTube書き出し/〇〇_YouTube_YYYYMMDD.mp4` に書き出し（上書きしない）。アップロードはユーザーが YouTube Studio で
- 作業場所は外付け **ELECOM**（5.5TB）の `/Volumes/ELECOM/Premiere作業/`（`コピー素材/`・`YouTube書き出し/`）。Mac本体は空き不足（約5.5GB）のため使わない。ELECOM未接続なら止まる
  - 他のドライブ: HD-EDS-D（予備）、disk3s1（Time Machine用・使わない）、NO NAME（15GB・小さい）
- 権限の分類（1.15.1 のコードで確認）: `import_*` は filesystem、`export_*`/`encode_*` は export、シーケンス作成・複製は edit
- iMac 側の置き場所: `~/.claude/premiere-rules.md`（`~/.claude/CLAUDE.md` から `@~/.claude/premiere-rules.md` で読み込み）

## セットアップ（最終版・1回だけ）
- `premiere/setup.sh` を iMac で実行: 指示書を `~/.claude/premiere-rules.md` に置く／`/youtube` コマンド追加／
  権限を `inspect,edit,export,filesystem` で再登録（unsafe-script は無効）／`settings.json` の allow に `mcp__premiere` を追加
- バックアップ: `~/.claude/CLAUDE.md.bak`、`~/.claude/settings.json.before-premiere`

## 使い方
```
/youtube 無音の部分をカット
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
