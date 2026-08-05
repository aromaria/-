# リザストAPI連携（メルマガ投稿自動化）

## これは何
リザストのメルマガ記事を、Node.jsスクリプトから直接APIで作成・管理するモジュール。
`newsletter.html`（90_メルマガ生成ソフト）で生成した原稿を、コピペなしでリザストへ投稿できる。

## ファイル構成
| ファイル | 役割 |
|---|---|
| `reservestock-mail-magazine.js` | API連携モジュール本体（1069行） |
| `post-newsletters.js` | 投稿スクリプト（非公開で2本投稿） |
| `content/*.json` | 検証済み記事コンテンツ |

## 認証
- 方式: `Authorization: Bearer <APIキー>`
- キー形式: `rs_live_` で始まる文字列
- 環境変数: `RESERVESTOCK_API_KEY`
- キーをコードにハードコードしない。GitHubにも絶対に載せない

## 利用可能なAPI一覧

### メルマガ管理
| API | エンドポイント | メソッド | 用途 |
|---|---|---|---|
| 配信グループ新規作成 | `/api/create_mail_magazine` | POST | メルマガ（配信グループ）を作成 |
| メルマガ一覧 | `/api/mail_magazines` | GET | 自分のメルマガID・読者数を取得 |
| 読者登録 | `/api/subscribe_mail_magazine` | POST | 顧客をメルマガ読者に登録 |

### 記事操作
| API | エンドポイント | メソッド | 用途 |
|---|---|---|---|
| 記事作成 | `/api/create_mail_magazine_article` | POST | 新規記事を作成（private推奨） |
| 記事保存 | `/api/save_mail_magazine_article` | POST | 配信前の記事を更新 |
| 記事配信 | `/api/publish_mail_magazine_article` | POST | 即時配信 or 予約配信 |
| 記事削除 | `/api/delete_mail_magazine_article` | POST | 配信前の記事を削除 |
| 記事横断検索 | `/api/search_mail_magazine_articles` | GET | タイトル/本文でキーワード検索 |

### AI機能
| API | エンドポイント | メソッド | 用途 |
|---|---|---|---|
| 文章校正 | `/api/proofread_mail_magazine_article` | POST | OpenAIで本文を校正 |
| HTML→テキスト生成 | `/api/generate_text_part_for_mail_magazine_article` | POST | キャリアメール用テキスト生成 |
| AIタイトル提案 | `/api/suggest_mail_magazine_subject` | GET | GPT-4.1-miniで件名を提案 |

## 主要パラメータの命名規則
| 用途 | 正規名 | 備考 |
|---|---|---|
| 配信グループID | `mail_magazine_id` / `step_mail_id` | 内部的にはstep_mails.id |
| 記事ID | `mail_magazine_article_id` | save/delete/publishで使用 |
| 件名 | `subject` | |
| 本文 | `context` | テンプレートの本文部分に差し込み |
| 公開状態 | `public_status` | public / private / backnumber |
| 配信予約 | `publish_time` | YYYY-MM-DD HH:MM:SS。未指定=即時 |

## 安全ルール（厳守）
1. `publicStatus` は必ず `'private'` で作成。配信は管理画面で確認後
2. `publishMailMagazineArticle` はユーザーの明示的な指示なしに呼ばない
3. APIエラー時は勝手にリトライせず、エラー内容をそのまま報告
4. 本文に読者登録解除リンクがないと配信APIはエラーになる（安全チェック）

## エラーコード早見表
| エラーコード | HTTP | 意味 |
|---|---|---|
| `step_mail_limit_exceeded` | 422 | 契約のメルマガ上限超過 |
| `mail_magazine_article_locked` | 409 | 送信中/配信待ちでロック中 |
| `article_context_blank` | 422 | 本文が空 |
| `article_busy` | 429 | 校正/テキスト生成処理中 |
| `free_plan_not_supported` | 403 | 無償プランでは利用不可 |
| `plan_upgrade_required` | 403 | プランアップグレードが必要 |
| `keyword_required` | 400 | 検索キーワード未指定 |
| `openai_request_failed` | 502 | OpenAI通信失敗 |

## 一気通貫パイプライン（newsletter-pipeline.js）

「メルマガ生成してリザストに保存して」の一言で動く統合システム。

### できること
1. AIでメルマガ本文を生成（岩本純子先生の文体・構成ルール準拠）
2. 薬機法チェック → 違反表現の自動修正
3. 件名を5候補生成（最良を自動選択）
4. リザストAPIに非公開記事として投稿

### 基本コマンド
```bash
# テーマ指定で生成→投稿（OpenAI）
RESERVESTOCK_API_KEY=rs_live_xxxx OPENAI_API_KEY=sk-xxxx \
  node newsletter-pipeline.js --theme "メタトロン解析"

# Anthropic / Gemini で生成
RESERVESTOCK_API_KEY=rs_live_xxxx ANTHROPIC_API_KEY=sk-ant-xxxx \
  node newsletter-pipeline.js --provider anthropic --theme "自己治癒力"

RESERVESTOCK_API_KEY=rs_live_xxxx GEMINI_API_KEY=xxxx \
  node newsletter-pipeline.js --provider gemini --theme "アロマ感情解放"
```

### オプション一覧
| オプション | デフォルト | 説明 |
|---|---|---|
| `--theme "テーマ"` | メタトロン解析 | プリセット名 or 自由テキスト |
| `--target "ターゲット"` | 原因不明の不調を抱える方 | ターゲット読者 |
| `--cta metatron` | metatron | CTA種別（school/session/orientation/all） |
| `--season auto` | auto | 季節（spring/summer/autumn/winter） |
| `--length standard` | standard | 文字数（short/standard/long） |
| `--provider openai` | openai | AI提供元（anthropic/gemini） |
| `--model "名前"` | 各社推奨 | モデル指定 |
| `--magazine "名前"` | アロマリア美健康の秘訣 | 配信グループ名 |
| `--magazine-id ID` | - | 既存配信グループID |
| `--dry-run` | - | 生成のみ（投稿しない） |
| `--from-json "path"` | - | JSONから読み込み（AI生成スキップ） |
| `--save-json "path"` | - | 生成結果をJSON保存 |

### テーマプリセット（ショートカット名）
メタトロン解析 / 自己治癒力 / 自然療法スクール / 波動美健康 / 心身魂 / アロマ感情解放

### 使い方パターン
```bash
# 生成だけ確認（投稿しない）
OPENAI_API_KEY=sk-xxxx node newsletter-pipeline.js --theme "心身魂" --dry-run

# 生成してJSONに保存 → 後でリザストに投稿
OPENAI_API_KEY=sk-xxxx node newsletter-pipeline.js --theme "波動美健康" --save-json content/new-article.json --dry-run
RESERVESTOCK_API_KEY=rs_live_xxxx node newsletter-pipeline.js --from-json content/new-article.json

# 検証記事（既存JSON）を投稿
RESERVESTOCK_API_KEY=rs_live_xxxx node newsletter-pipeline.js --from-json content/newsletter-content-sucrose-diabetes.json
```

## 個別投稿スクリプト（post-newsletters.js）
検証済み記事2本をまとめて投稿する専用スクリプト。
```bash
RESERVESTOCK_API_KEY=rs_live_xxxx node post-newsletters.js
```

## 投稿済み検証記事
| 記事 | ファイル | 内容 |
|---|---|---|
| ショ糖と糖尿病 | `content/newsletter-content-sucrose-diabetes.json` | 「ショ糖を抜くと糖尿病になる」という主張の検証 |
| フライドポテト事故 | `content/newsletter-content-friedpotato.json` | 実在の事故を基にした陰謀論的主張の検証 |

## メルマガ読者登録API（serialcdセッション方式）

> 出典: [APIを使ったメルマガ読者登録の方法](https://reservestock.hatenablog.jp/entry/2021/12/16/153420)（リザスト公式ブログ 2021/12/16）

外部サイトやフォームからメルマガ読者を直接登録できるAPI。Bearer認証とは別の、serialcd＋セッションIDによる認証方式。

### 準備
1. リザスト管理画面 → 対象メルマガの設定 → 「APIアイコン」をクリック
2. エンドポイントURLと serialcd が表示される
3. `mail_magazine_id`（mid）もここで確認

### Step 1: セッションIDの取得
```
GET https://www.reservestock.jp/api/create_api_session/{serialcd}
```
- `serialcd`: メルマガ管理画面のAPIアイコンから取得する固有コード
- レスポンス: `session_id` を含むJSON（`api_session_` で始まる文字列）

### Step 2: 読者登録の実行
```
GET https://www.reservestock.jp/api/new_subscribe_api/{serialcd}?session_id={session_id}&mid={mail_magazine_id}&email_address={email}
```

| パラメータ | 必須 | 説明 |
|---|---|---|
| `session_id` | ○ | Step 1で取得したセッションID |
| `mid` | ○ | メルマガのmail_magazine_id |
| `email_address` | ○ | 登録するメールアドレス |
| `lname` | - | 姓（任意） |
| `fname` | - | 名（任意） |

- メソッド: **GET**（POSTではない）
- 成功判定: レスポンスコード `200 OK`

### 実装例（jQuery）
```javascript
// Step 1: セッションID取得
$.ajax({
  url: "https://www.reservestock.jp/api/create_api_session/" + serialcd,
  type: "GET",
  success: function(data) {
    var sessionId = data.session_id;
    // Step 2: 読者登録
    var registerUrl = "https://www.reservestock.jp/api/new_subscribe_api/" + serialcd
      + "?session_id=" + sessionId
      + "&mid=" + mailMagazineId
      + "&email_address=" + encodeURIComponent(email);
    $.ajax({ url: registerUrl, type: "GET" });
  }
});
```

### 活用シーン
- 自社サイトにメルマガ登録フォームを埋め込む
- ランディングページから直接リザストのメルマガに読者登録
- 複数サイトからの読者流入を一元管理
- serialcdはフロントエンド埋め込み前提の設計（Bearer APIキーとは別物）

### 注意事項
- serialcd は Bearer APIキー（rs_live_...）とは別の認証方式
- セッションIDには有効期限がある可能性あり（都度取得が安全）
- この方式は「読者登録」専用。記事の作成・保存には使えない
- 記事操作には従来の Bearer 認証 + `/api/create_mail_magazine_article` 等を使用

## バッチ処理スクリプト（Mac側で実行）

### 記事取得
```bash
./scripts/batch-fetch.sh    # リザストから記事を一括取得 → out/articles/
```

### 記事保存（リライト済みを非公開で保存）
```bash
./scripts/batch-save.sh     # out/rewritten/ → リザストに一括保存（private）
```

### 新規記事の注意
- `id: 0` のファイル（msp_clinical_case, story_origin_part1/2/3 等）は batch-save で保存不可
- 新規記事はリザスト管理画面で作成するか、`/api/create_mail_magazine_article` で `mail_magazine_id` を指定して作成
- `mail_magazine_id` はメルマガ管理画面またはAPIで確認
