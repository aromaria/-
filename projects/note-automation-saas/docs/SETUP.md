# 開発環境構築ガイド

## 前提条件

- **Node.js** 18.0.0 以上
- **npm** または **pnpm**
- **PostgreSQL** 15.0 以上
- **Redis** 7.0 以上
- **Git**

## インストール手順

### 1. リポジトリクローン

```bash
cd /home/user/-
git clone <repository-url>
cd projects/note-automation-saas
```

### 2. 環境変数設定

#### Backend

```bash
cd backend
cp .env.example .env.local
```

`.env.local` を編集：
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/note_automation_dev

# Redis
REDIS_URL=redis://localhost:6379

# Claude API
CLAUDE_API_KEY=sk-...

# JWT
JWT_SECRET=your-secret-key-here

# Server
PORT=3001
NODE_ENV=development
```

#### Frontend

```bash
cd ../frontend
cp .env.example .env.local
```

`.env.local` を編集：
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### 3. データベース初期化

```bash
cd ../backend

# Prisma マイグレーション
npx prisma migrate dev --name init

# Prisma Studio（オプション）
npx prisma studio
```

### 4. 依存関係インストール

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

### 5. 開発サーバー起動

**ターミナル1: Backend**
```bash
cd backend
npm run dev
# http://localhost:3001
```

**ターミナル2: Frontend**
```bash
cd frontend
npm run dev
# http://localhost:3000
```

## サービス起動確認

- **Backend Health**: http://localhost:3001/health
- **Frontend**: http://localhost:3000

## データベース接続確認

```bash
# PostgreSQL
psql -U user -d note_automation_dev

# Redis
redis-cli ping
# 出力: PONG
```

## よくあるトラブル

### PostgreSQL 接続エラー
```bash
# MacOS
brew services start postgresql

# Ubuntu/Linux
sudo systemctl start postgresql
```

### Redis 接続エラー
```bash
# MacOS
brew services start redis

# Ubuntu/Linux
sudo systemctl start redis-server
```

### ポート競合エラー
別のプロセスがポートを使用中。以下で確認・終了：
```bash
# ポート 3001 の確認
lsof -i :3001

# 強制終了
kill -9 <PID>
```

## テスト実行

```bash
# Backend テスト
cd backend
npm run test

# Frontend テスト
cd frontend
npm run test
```

## 本番デプロイ準備

### Build

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Start

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm start
```

## リソース

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Express ドキュメント](https://expressjs.com/)
- [Prisma ドキュメント](https://www.prisma.io/docs/)
- [PostgreSQL ドキュメント](https://www.postgresql.org/docs/)
- [Redis ドキュメント](https://redis.io/documentation)

## サポート

問題が発生した場合、以下を確認してください：

1. すべての環境変数が正しく設定されているか
2. データベースが起動しているか
3. Redis が起動しているか
4. Node.js バージョンが 18 以上か

詳細は [README.md](../README.md) を参照。
