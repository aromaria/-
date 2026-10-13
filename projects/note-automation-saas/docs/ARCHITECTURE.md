# システム設計書

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                     │
│            http://localhost:3000 (Vercel で本番)             │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────────┐
│                Backend (Express + TypeScript)                │
│            http://localhost:3001 (Railway で本番)            │
├──────────────────────────────────────────────────────────────┤
│  API Layer          │ Service Layer      │ Integration Layer  │
│  ├─ /themes         │ ├─ ThemeService    │ ├─ ClaudeAPI      │
│  ├─ /research       │ ├─ ResearchService │ ├─ GoogleSearch   │
│  ├─ /content        │ ├─ WriterService   │ ├─ YouTubeAPI     │
│  └─ /auth           │ └─ AuthService     │ └─ noteAPI (将来)  │
└──────────────┬───────┴────────┬──────────┴───────────────────┘
               │                │
        ┌──────▼─────────────────▼──────────┐
        │   PostgreSQL + Redis Cache        │
        │   (ローカル: localhost:5432/6379)  │
        └──────────────────────────────────┘
```

## データ流

### テーマ生成フロー

```
User Input (経験・興味)
    ↓
Backend: /themes POST
    ↓
ThemeService.generateTheme()
    ↓
Claude API (プロンプト: 売れるテーマ提案)
    ↓
Database に保存
    ↓
Frontend: テーマ表示
```

### リサーチフロー

```
User: テーマ選択 + キーワード入力
    ↓
Backend: /research POST
    ↓
ResearchService.execute()
    ├─ GoogleSearch.search()    → Web記事
    ├─ YouTubeAPI.search()      → 動画文字起こし
    └─ XAPI.search() (将来)     → トレンド情報
    ↓
Claude API で要約・整理
    ↓
Redis にキャッシュ + DB に保存
    ↓
Frontend: リサーチ結果表示
```

### コンテンツ生成フロー

```
User: リサーチデータ確認 → 「記事生成」ボタン
    ↓
Backend: /content POST + リサーチID
    ↓
WriterService.generateArticle()
    ├─ OutlineGenerator (目次作成)
    ├─ SectionWriter (セクション別執筆)
    └─ Claude API 複数回呼び出し
    ↓
Job Queue (Bull) でバックグラウンド実行
    ↓
進捗を WebSocket/Polling で Frontend に通知
    ↓
完成 → Database に保存
    ↓
Frontend: 記事エディタで表示・編集可能
```

## モジュール責任

### Frontend

| モジュール | 責務 |
|-----------|------|
| **pages** | ページ単位のレイアウト（Dashboard, Editor, Settings） |
| **components** | UI コンポーネント（Button, Form, Card等） |
| **hooks** | カスタムロジック（API呼び出し、状態管理） |
| **services** | API クライアント（axios ラッパー） |
| **styles** | Tailwind CSS + グローバルスタイル |

### Backend

| モジュール | 責務 |
|-----------|------|
| **api/** | HTTP ハンドラー・バリデーション |
| **services/** | ビジネスロジック・AI処理 |
| **integrations/** | 外部API統合（Claude, Google等） |
| **db/** | Prisma ORM・データベース操作 |
| **queue/** | Job Queue（非同期処理） |
| **middleware/** | 認証・ロギング・エラーハンドリング |

## 認証・認可

### 認証フロー

```
1. ユーザー: Google OAuth ボタンクリック
2. Frontend: Google Sign-in → 認可コード取得
3. Backend: /auth/google POST (認可コード)
4. Backend: Google API で検証
5. JWT トークン生成・返却
6. Frontend: localStorage に JWT 保存
7. 以後のリクエスト: Authorization: Bearer <JWT>
```

### JWT 構造

```
Header: { alg: "HS256", typ: "JWT" }
Payload: { userId, email, exp (1時間), iat }
Signature: HS256(secret)
```

## データベース設計

### テーブル構成

```
users
├─ id (PK)
├─ email (UNIQUE)
├─ name
├─ googleId (OAuth)
├─ createdAt
└─ updatedAt

projects
├─ id (PK)
├─ userId (FK → users)
├─ title
├─ description
├─ status (draft, published)
├─ createdAt
└─ updatedAt

themes
├─ id (PK)
├─ userId (FK → users)
├─ title
├─ description
├─ sellPotential (AI評価: 1-10)
├─ createdAt
└─ updatedAt

research_data
├─ id (PK)
├─ projectId (FK → projects)
├─ source (google, youtube, x)
├─ content (JSON)
├─ summary
├─ createdAt
└─ updatedAt

articles
├─ id (PK)
├─ projectId (FK → projects)
├─ title
├─ outline (JSON)
├─ content (Markdown)
├─ status (draft, published)
├─ createdAt
└─ updatedAt
```

## キャッシング戦略

### Redis キー設計

```
theme:{userId}:{themeId}           # テーマデータ（TTL: 24h）
research:{projectId}               # リサーチ結果（TTL: 12h）
article:draft:{articleId}          # 記事下書き（TTL: 7d）
user:session:{userId}              # セッション（TTL: 1h）
```

## API エンドポイント（MVP）

### Theme API
- `POST /themes` - テーマ提案生成
- `GET /themes` - ユーザーのテーマ一覧
- `GET /themes/:id` - テーマ詳細
- `DELETE /themes/:id` - テーマ削除

### Research API
- `POST /research` - リサーチ実行
- `GET /research/:id` - リサーチ結果取得

### Content API
- `POST /content` - 記事生成開始
- `GET /content/:id` - 記事取得
- `PUT /content/:id` - 記事更新
- `DELETE /content/:id` - 記事削除

### Auth API
- `POST /auth/google` - Google OAuth ログイン
- `POST /auth/logout` - ログアウト
- `GET /auth/me` - 現在のユーザー情報

## エラーハンドリング

### HTTP Status Code

| Code | 説明 |
|------|------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests（rate limit） |
| 500 | Internal Server Error |

### エラーレスポンス形式

```json
{
  "error": "テーマ生成に失敗しました",
  "code": "THEME_GENERATION_FAILED",
  "details": {
    "reason": "Claude API quota exceeded"
  }
}
```

## パフォーマンス指標（Target）

| メトリクス | Target |
|-----------|--------|
| API レスポンスタイム | < 2秒 |
| テーマ生成時間 | < 15秒 |
| リサーチ実行時間 | < 60秒 |
| 記事執筆時間 | < 3分 |
| データベースクエリ | < 100ms |

## セキュリティ

### 実装予定
- [ ] HTTPS/TLS（本番環境）
- [ ] CORS 設定
- [ ] CSRF トークン
- [ ] Rate Limiting
- [ ] Input Validation
- [ ] SQL Injection 対策（Prisma使用）
- [ ] XSS 対策（React）

## スケーリング戦略

### Phase 2 以降

1. **データベース分離**
   - User DB と Content DB の分離
   - Read replica の追加

2. **キャッシング強化**
   - Redis Cluster
   - CDN（Cloudflare）

3. **マイクロサービス化**
   - Theme Service（独立）
   - Research Service（独立）
   - Content Service（独立）

4. **非同期処理**
   - Job Queue 複数ワーカー
   - WebSocket リアルタイム通知

## 依存関係管理

### 外部API

| API | 用途 | Quota | Cost |
|-----|------|-------|------|
| Claude | テーマ・執筆 | 共有 | ¥50-170/ユーザー/月 |
| Google Custom Search | Web検索 | 100/日 無料 | ¥0 |
| YouTube API | 文字起こし | 100K calls/日 | ¥0-40 |
| X API | トレンド | Basic tier | ¥0 |

## デプロイメント

### 本番環境

```
Frontend:
├─ Vercel (自動デプロイ)
├─ GitHub integration
└─ Edge Function で分析等

Backend:
├─ Railway (Docker コンテナ)
├─ PostgreSQL (Railway managed)
├─ Redis (Railway managed)
└─ GitHub integration
```

### CI/CD パイプライン

```
Git push → GitHub Actions
  ├─ Lint check
  ├─ Type check
  ├─ Unit test
  ├─ Build
  └─ Deploy to Vercel/Railway
```

---

詳細は各モジュールの README を参照。
