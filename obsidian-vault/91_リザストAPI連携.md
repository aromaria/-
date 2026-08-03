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

## 実行方法
```bash
# ローカルPCで実行（クラウド環境からはreservestock.jpへアクセス不可）
RESERVESTOCK_API_KEY=rs_live_xxxx node post-newsletters.js
```

## 投稿済み検証記事
| 記事 | ファイル | 内容 |
|---|---|---|
| ショ糖と糖尿病 | `content/newsletter-content-sucrose-diabetes.json` | 「ショ糖を抜くと糖尿病になる」という主張の検証 |
| フライドポテト事故 | `content/newsletter-content-friedpotato.json` | 実在の事故を基にした陰謀論的主張の検証 |

## 今後の展開
- `newsletter.html` で生成 → API で直接投稿の一気通貫フロー
- 定期的な検証記事の自動投稿パイプライン
- 配信スケジュール管理の自動化
