# API 仕様書（MVP）

**Base URL**: `http://localhost:3001/api/v1`

## 認証

すべてのリクエストに JWT トークンを含める必要があります（`/auth/*` 除く）：

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Theme API - テーマ管理

### テーマ提案生成

```
POST /themes
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "background": "AI・データ分析が得意。5年のエンジニア経歴",
  "interests": ["AI", "自動化", "副業"],
  "targetAudience": "初心者向け"
}

Response (200):
{
  "id": "theme_123",
  "title": "AIエージェント活用で月20万円稼ぐ",
  "description": "自動化の時代、エージェント技術で...",
  "sellPotential": 8,
  "estimatedPrice": 2980,
  "createdAt": "2026-10-13T10:30:00Z"
}
```

### テーマ一覧取得

```
GET /themes
Authorization: Bearer <token>

Query Parameters:
- limit: 10 (default)
- offset: 0 (pagination)

Response (200):
{
  "themes": [
    { "id": "...", "title": "...", ... },
    ...
  ],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

### テーマ詳細取得

```
GET /themes/:id
Authorization: Bearer <token>

Response (200):
{
  "id": "theme_123",
  "title": "...",
  "description": "...",
  "sellPotential": 8,
  "estimatedPrice": 2980,
  "createdAt": "...",
  "relatedKeywords": ["AI", "自動化", "Python"]
}
```

### テーマ削除

```
DELETE /themes/:id
Authorization: Bearer <token>

Response (204): No Content
```

---

## Research API - リサーチ実行

### リサーチ開始

```
POST /research
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "themeId": "theme_123",
  "keywords": ["AIエージェント", "LangChain", "自動化"],
  "sources": ["google", "youtube"],
  "limit": 10
}

Response (202): Accepted
{
  "jobId": "job_456",
  "status": "queued",
  "startedAt": "2026-10-13T10:35:00Z"
}
```

### リサーチ結果取得

```
GET /research/:jobId
Authorization: Bearer <token>

Response (200):
{
  "jobId": "job_456",
  "status": "completed",
  "results": {
    "google": [
      {
        "title": "AIエージェント完全ガイド",
        "url": "https://...",
        "snippet": "...",
        "source": "google"
      },
      ...
    ],
    "youtube": [
      {
        "videoId": "...",
        "title": "AIエージェント実装方法",
        "transcript": "00:00 - はじめに...",
        "duration": 1200,
        "views": 150000
      },
      ...
    ]
  },
  "summary": "AIエージェントは自動化ツール。LangChainが人気...",
  "completedAt": "2026-10-13T11:00:00Z"
}
```

リサーチ進捗確認（polling）：
```
GET /research/:jobId/progress

Response (200):
{
  "status": "in_progress",
  "progress": 65,
  "currentSource": "youtube",
  "itemsProcessed": 13,
  "estimatedTimeRemaining": 30
}
```

---

## Content API - 記事生成

### 記事生成開始

```
POST /content
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "themeId": "theme_123",
  "researchJobId": "job_456",
  "tone": "casual",
  "language": "japanese",
  "targetWordCount": 3000
}

Response (202): Accepted
{
  "articleId": "article_789",
  "jobId": "job_job_789",
  "status": "queued",
  "startedAt": "2026-10-13T11:05:00Z"
}
```

### 記事取得

```
GET /content/:articleId
Authorization: Bearer <token>

Response (200):
{
  "id": "article_789",
  "themeId": "theme_123",
  "title": "AIエージェント活用で月20万円稼ぐ",
  "outline": {
    "sections": [
      {
        "title": "1. AIエージェントとは",
        "wordCount": 500
      },
      ...
    ]
  },
  "content": "# AIエージェント活用で月20万円稼ぐ\n\n## 1. AIエージェントとは\n...",
  "status": "draft",
  "wordCount": 3200,
  "createdAt": "2026-10-13T11:30:00Z",
  "updatedAt": "2026-10-13T11:30:00Z"
}
```

### 記事更新

```
PUT /content/:articleId
Content-Type: application/json
Authorization: Bearer <token>

Request:
{
  "title": "修正後のタイトル",
  "content": "修正後の本文...",
  "status": "draft"
}

Response (200):
{
  "id": "article_789",
  "title": "修正後のタイトル",
  "content": "修正後の本文...",
  "status": "draft",
  "updatedAt": "2026-10-13T12:00:00Z"
}
```

### 記事削除

```
DELETE /content/:articleId
Authorization: Bearer <token>

Response (204): No Content
```

---

## Auth API - 認証

### Google OAuth ログイン

```
POST /auth/google
Content-Type: application/json

Request:
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAiLCJ0eXAiOiJKV1QifQ..."
}

Response (200):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_abc",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "expiresIn": 3600
}
```

### 現在のユーザー情報

```
GET /auth/me
Authorization: Bearer <token>

Response (200):
{
  "id": "user_abc",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2026-10-01T00:00:00Z"
}
```

### ログアウト

```
POST /auth/logout
Authorization: Bearer <token>

Response (204): No Content
```

---

## エラーレスポンス

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "code": "INVALID_REQUEST",
  "details": {
    "field": "keywords",
    "message": "Keywords must be an array"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Missing or invalid token",
  "code": "UNAUTHORIZED"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "requestId": "req_xyz123"
}
```

---

## Rate Limiting

- **通常ユーザー**: 100 requests/hour
- **有料ユーザー**: 1000 requests/hour

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1602512400
```

---

## Webhook（Phase 2以降）

リサーチ・記事生成完了時のコールバック：

```
POST {callbackUrl}
Content-Type: application/json

{
  "event": "research.completed",
  "jobId": "job_456",
  "articleId": "article_789",
  "timestamp": "2026-10-13T11:30:00Z",
  "signature": "sha256=..." (HMAC検証用)
}
```

---

詳細な実装は各エンドポイントのコードを参照。
