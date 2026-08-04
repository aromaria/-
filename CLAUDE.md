# プロジェクト地図（Claude はまずこれだけ読む）

> 目的: トークン節約。大きなファイルを毎回読み直さず、この要約から始める。
> 詳しい経緯・決定は `obsidian-vault/` を参照（必要な時だけ開く）。

## これは何
リザストの「電話申込」を事務局スタッフ4名が手入力で管理する単一HTMLアプリ。

- 公開URL: https://aromaria.github.io/-/ （push で自動更新。差し替え不要）
- リポジトリ: aromaria/-  ／ 作業ブランチ: `claude/rezast-phone-intake-plan-gjl4on`
- スタッフ: 玉川・岩本・藤本・田尻

## ファイル構成（読むのは必要な時だけ）
- `index.html` … アプリ本体（39KB）。localStorage保存＋Apps Scriptへ送信。**設定は先頭付近の HANDLERS / STATUSES / DEFAULT_CLOUD_URL**
- `apps_script/Code.gs` … 4人共有の受け皿。doPost/doGet(JSONP)。FOLDER_ID固定、シートに追記/更新（id単位 upsert）
- `apps_script/SETUP.md` … Apps Scriptの設置手順
- `STAFF_GUIDE.md` … スタッフ向け使い方
- `README.md` … 概要

## 動く仕組み（4人共有）
アプリ → Apps Script Web App(/exec) → Driveフォルダ内スプレッドシートに保存/読込。
file:// はPOSTが弾かれるため **GETでも保存**する二重経路。JSONPで一覧取得。

## 触ってはいけない・注意
- APIトークンは画面・GitHubに絶対出さない。/exec URLは公開ページのソースに入れない（設定リンクで私的配布のみ）
- 本番API送信・削除・公開は明確な承認後のみ。mainへ直接反映しない（作業ブランチで）
- Apps Scriptのアクセスは「全員（ログイン不要）」。「Googleアカウントを持つ全員」だとSafariがcookie遮断で失敗

## メルマガリライト（Claude Code直接リライト方式）
- リザストAPIキー（rs_live_...7bf3）= AIエージェント操作用の鍵。これ1つでOK
- **外部AI（Gemini/OpenAI）は不要。Claude Codeが直接リライトする**
- この環境からreservestock.jpへの通信はプロキシでブロックされる → Macで取得/保存、Claude Codeでリライト
- ワークフロー:
  1. Mac: `./scripts/batch-fetch.sh` → 記事取得 → `git push`
  2. Claude Code: `git pull` → 記事を読んで直接リライト → `git push`
  3. Mac: `git pull` → `./scripts/batch-save.sh` → リザストにprivateで保存
- 保存は必ずprivate。配信はユーザーが管理画面で確認後に手動で行う
- 薬機法チェック: 臨床例・体験談は削除しない。必要な箇所に※注釈を添えるのみ

## 表記ルール
- **「体」→「身体」に統一**。メルマガ・サイト・すべてのコンテンツで「身体」を使う（体験・体調・具体的など熟語はそのまま）

## 絶対守るルール（過去の失敗から）
- **Claude自身がAIである。コンテンツ生成に外部AIを挟む提案をしない**
- 技術的制約（プロキシ等）は回避策を提示し、ユーザーに余計なAPI契約をさせない
- 複雑なコマンド入力をユーザーに求めない。スクリプト化して簡素化する
- エラーが連続する場合は同じアプローチを繰り返さず、根本原因を特定して方向転換する

## 未解決メモ
- シートの人間可読列で携帯番号の先頭0が落ちる（JSON列は正しい）。実害小・保留
- 保留/待機案件は `obsidian-vault/80_保留・待機案件.md` を参照（Gemini CLI連携・NotebookLM公式API待ち 等）

## 連携（トークン節約運用）
- 知識の保管 = `obsidian-vault/`（小さいmdに分割。人もClaudeもここを見る）
- NotebookLMへの投入資料 = `notebooklm/` の1ファイルを手動アップロード（NotebookLMは公式CLI/APIなし）
- 運用手順は `連携ガイド.md`

## 他業務への横展開（連携キット生成）
- 新しい業務にも同じ「Claude＋Obsidian＋NotebookLM」の仕組みを作れる
- ツール = `tools/連携キット生成.py`（使い方は `tools/連携キットの使い方.md`）
- 依頼例:「新しい業務『◯◯』の連携キットを作って。内容は△△、関係者は…、要点は…」
- Claudeが実行: `python3 tools/連携キット生成.py --name "業務名" --desc "..." --members "..." --facts "..." --url "..."`
  → ZIP(Obsidian用) と PDF(NotebookLM用) を生成して渡す（reportlab未導入ならpip install reportlab）
