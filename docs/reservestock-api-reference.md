# リザスト メルマガAPI リファレンス

ベースURL: `https://www.reservestock.jp/api`
認証: `Authorization: Bearer <rs_live_...>`
文字コード: `Content-Type: application/json; charset=utf-8`

---

## 1. メルマガ新規作成

`POST /api/create_mail_magazine`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| title | 必須 | メルマガ（配信グループ）のタイトル |
| description | 任意 | 読者登録フォーム説明文 |
| well_come_mail_subject | 任意 | ウェルカムメール件名 |
| complete_mail_subject | 任意 | 登録完了メール件名 |
| complete_mail_body | 任意 | 登録完了メール本文 |
| post_message | 任意 | 投稿メッセージ |
| well_come_mail_context | 任意 | ウェルカムメール本文 |

### 戻り値
| フィールド | 説明 |
|---|---|
| result | success / error |
| step_mail.id / step_mail_id | 配信グループID |
| step_mail.title | タイトル |
| step_mail.mail_group_type | mail_magazine |
| step_mail.ready_to_inform_subscribers_status | reception（公開受付） |
| step_mail.public_status / created_at / updated_at | |

### エラー
- `step_mail_limit_exceeded`（422）: 契約上限超過

---

## 2. メルマガ記事作成

`POST /api/create_mail_magazine_article`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| mail_magazine_id | 必須 | 配信グループID（step_mails.id） |
| subject | 必須 | 件名 |
| context | 必須 | 本文 |
| theme | 任意 | 色味テンプレート（例: autumn）。未指定時は simple |
| content_html_text_part | 任意 | HTMLメール時のテキストパート |
| public_status | 任意 | public / private / backnumber。未指定時は public |
| font_size | 任意 | 17 / 19 / 21。未指定時は19 |
| enable_event | 任意 | イベント表示 |
| enable_comment | 任意 | コメント（未指定時 true） |
| enable_tip | 任意 | ありがとうチップ |
| enable_impressions | 任意 | 感想（未指定時 true） |
| impressions_limit | 任意 | 感想表示数 1〜30（未指定時 5） |
| enable_survey | 任意 | アンケート |
| survey_limit | 任意 | アンケート表示数 1〜20（未指定時 4） |
| enable_like | 任意 | いいね（未指定時 true） |

### 注意
保存API（save）は本文の差し替えのみ対応。theme・enable_* 系は作成時に確定させる。

---

## 3. メルマガ記事保存

`POST /api/save_mail_magazine_article`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| mail_magazine_article_id | 必須 | メルマガ記事ID |
| subject | 任意 | 件名 |
| context | 任意 | 本文（テンプレートの本文部分を差し替え） |
| content_html_text_part | 任意 | HTMLメール時のテキストパート |
| public_status | 任意 | public / private / backnumber |

### 注意
配信前の記事だけ保存できる。

---

## 4. メルマガ記事配信

`POST /api/publish_mail_magazine_article`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| mail_magazine_article_id | 必須 | メルマガ記事ID |
| publish_time | 任意 | 配信予約時刻（YYYY-MM-DD HH:MM:SS / ISO8601）。未指定=即時 |

別名: publish_at / scheduled_at / deliver_at

### 注意
本文に読者登録解除リンクが必要。なければエラー。

---

## 5. メルマガ記事削除

`POST /api/delete_mail_magazine_article`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| mail_magazine_article_id | 必須 | メルマガ記事ID |

### エラー
- `mail_magazine_article_locked`（409）: 送信中/配信待ちロック
- `invalid_article_for_delete`（422）: 配信グループ以外の記事

---

## 6. メルマガ記事 文章校正（AI）

`POST /api/proofread_mail_magazine_article`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| mail_magazine_article_id | 必須 | メルマガ記事ID |

### 戻り値
| フィールド | 説明 |
|---|---|
| scope | main_text または full |
| mail_magazine_article | 校正結果を反映した記事 |

### エラー
- `free_plan_not_supported`（403）: 無償プラン
- `mail_magazine_article_locked`（409）: ロック中
- `article_context_blank`（422）: 本文空
- `article_busy`（429）: 校正/テキスト生成処理中
- `openai_request_failed`（502）/ `openai_empty_response`（502）: OpenAI通信失敗

### 注意
OpenAIへの問い合わせを伴うため数十秒かかる。

---

## 7. HTML→テキストメール生成（AI）

`POST /api/generate_text_part_for_mail_magazine_article`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| mail_magazine_article_id | 必須 | メルマガ記事ID |

### エラー
- `mail_magazine_article_locked`（409）
- `article_context_blank`（422）
- `article_busy`（429）
- `openai_request_failed`（502）

### 注意
OpenAI失敗時はフォールバックせず502を返す。

---

## 8. AIタイトル提案

`GET /api/suggest_mail_magazine_subject`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| mail_magazine_article_id | 必須 | メルマガ記事ID |
| current_subject | 任意 | 現在の件名（指定するとより尖ったタイトルを提案） |

### 戻り値
| フィールド | 説明 |
|---|---|
| suggested_subject | AIが提案した件名 |
| current_subject | 現在の件名 |

### エラー
- `plan_upgrade_required`（403）
- `body_empty`（422）
- `ai_error`（503）

### 注意
GPT-4.1-miniを使用。本文は最大2000文字（MB文字単位）を参照。数秒〜30秒。

---

## 9. メルマガ記事横断検索

`GET /api/search_mail_magazine_articles`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| keyword（または q） | 必須 | 検索キーワード。部分一致・大文字小文字無視 |
| mail_magazine_id | 任意 | 特定メルマガ配下のみ検索 |

### 戻り値
最大100件・updated_at降順。件名・テキスト本文・HTML本文のいずれかにヒット。

### エラー
- `keyword_required`（400）

---

## 10. メルマガ一覧

`GET /api/mail_magazines`

### 引数
なし

### 戻り値
| フィールド | 説明 |
|---|---|
| mail_magazines[].id | メルマガID（step_mails.id） |
| mail_magazines[].name | メルマガ名 |
| mail_magazines[].subscribers_count | 読者数 |

---

## 11. メルマガ読者登録

`POST /api/subscribe_mail_magazine`

### 引数
| パラメータ | 必須 | 説明 |
|---|---|---|
| mail_magazine_id | 必須 | メルマガID |
| customer_id | いずれか必須 | 顧客ID |
| email_address | いずれか必須 | メールアドレス（customer_id未指定時は必須） |
| last_name | 任意 | 苗字 |
| first_name | 任意 | 名前 |

### 戻り値
| フィールド | 説明 |
|---|---|
| customer_id | 顧客ID |
| customer_created | 新規作成したか |
| subscriber_id | 読者登録ID |
| subscriber_created | 新規登録したか |

---

## 命名規則（AI向け）

| 用途 | 正規名 | 備考 |
|---|---|---|
| 配信グループID | `mail_magazine_id` / `step_mail_id` | |
| 記事ID | `mail_magazine_article_id` | `id` は互換別名 |
| 顧客メール | `email_address` | 旧APIでは `mail_address` |
| 顧客名 | `name` / `customer_name` | |
| LP（告知文） | `description` | |

### AI判断ルール
- フォーム本文・メール本文・日本語のPOSTは `charset=utf-8` を明示
- エラー時は勝手にリトライ・パラメータ変更せず報告
