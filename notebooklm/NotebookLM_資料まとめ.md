# 電話対応ソフト 総合資料（NotebookLM 投入用）

> この1ファイルを NotebookLM に読み込ませれば、内容について無料で質問・要約・音声解説できます。
> （NotebookLM は公式のCLI/APIが無いため、アップロードは手動です）

---

## 1. 概要
リザストの電話申込を、事務局スタッフ4名（玉川・岩本・藤本・田尻）が手入力で管理する単一HTMLアプリ。
5回連続講座の申込を電話で受け、記録し、リザストへ転記する。
公開URL: https://aromaria.github.io/-/ （更新すると自動で最新／差し替え不要）

## 2. できること
申込入力（氏名・ふりがな・メール・携帯・領収書宛名・電話申込者・参加回・参加方法・支払方法・振込予定日）、
入力ミス防止チェック、重複チェック、リザスト転記まとめ、ステータス管理、対応者記録、4人でのデータ共有。

## 3. 対応ステータス
未対応／聞き取り中／確認待ち／リザスト入力待ち／リザスト入力済み／
①振込先伝達・入金予定日確認済み／②入金予定日を田尻さんへ連絡済み／③ソフトに記入・保存済み／
未入金／入金確認済み／キャンセル／要確認。

## 4. 使い方（スタッフ）
1) https://aromaria.github.io/-/ を開く（ブックマーク）
2) 最初だけ設定リンク（#setup=…）を開いて4人共有に接続
3) 電話を受けたら各項目を入力し保存（自分の画面とスプレッドシートの両方に記録）
4) 一覧でステータス・対応者を変更
5) まとめを見ながらリザストへ転記

## 5. 仕組み（技術）
アプリ → Apps Script Web App(/exec) → Driveフォルダ内スプレッドシートに保存/読込。
file:// ではPOSTが弾かれるためGETでも保存できる二重経路。読込はJSONP。id単位で追記/更新。

## 6. 安全ルール
APIトークンは画面・GitHubに出さない。/exec URLは公開ソースに入れない（設定リンクで私的配布）。
本番送信・削除・公開は承認後のみ。Apps Scriptアクセスは「全員（ログイン不要）」。

## 7. 連携運用（トークン節約）
Obsidian＝知識の保管庫、Claude＝作成・整理・修正、NotebookLM＝資料への質問・要約。
Claudeは CLAUDE.md と obsidian-vault の小さいメモから始めることで、大きなファイルを読み直さずに済む。

## 8. リザストAPI連携（メルマガ投稿自動化）
newsletter.htmlで生成した原稿を、Node.jsスクリプトからリザストAPIへ直接投稿する仕組み。
認証はAPIキー（rs_live_...）をBearerトークンとして送信。

主要API: 配信グループ作成（create_mail_magazine）、記事作成（create_mail_magazine_article）、
記事保存（save_mail_magazine_article）、記事配信（publish_mail_magazine_article）、
記事削除（delete_mail_magazine_article）、文章校正AI（proofread_mail_magazine_article）、
AIタイトル提案（suggest_mail_magazine_subject）、記事横断検索（search_mail_magazine_articles）、
メルマガ一覧（mail_magazines）、読者登録（subscribe_mail_magazine）。

安全ルール: 記事は必ずprivate（非公開）で作成。配信はユーザーが管理画面で確認後。
配信には本文に読者登録解除リンクが必要（なければAPIがエラーで停止）。
APIエラー時は勝手にリトライせず報告。
