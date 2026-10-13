# Note自動化SaaS

Claude AI活用で、note副業の全プロセス（テーマ提案→リサーチ→記事執筆→投稿→宣伝）を完全自動化するWebアプリ。

## 📊 プロジェクト概要

- **ターゲット**: note副業希望者（初心者～中級者）
- **マネタイズ**: 複層型SaaS（¥1,980/¥4,980） + テンプレート販売
- **目標**: Year 1 MRR ¥30-60万 → Year 3 MRR ¥600-1,500万

## 🎯 MVP機能（6週間でリリース）

- ✅ テーマ自動提案（Claude AI）
- ✅ マルチソースリサーチ（Google/YouTube/X）
- ✅ 記事構成・下書き自動生成
- ✅ エディタ＆プレビュー
- ✅ Markdown/HTML出力

## 🚀 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 14 + Tailwind + Shadcn/ui |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 15+ + Redis |
| AI | Claude API 3.5 Sonnet |
| Infra | Vercel (Frontend) + Railway (Backend) |

## 📁 プロジェクト構成

```
projects/note-automation-saas/
├── backend/              # Node.js + Express
│   ├── src/
│   │   ├── api/         # API routes
│   │   ├── services/    # Business logic
│   │   ├── integrations/# External APIs
│   │   ├── db/          # Database models
│   │   ├── queue/       # Job queue
│   │   └── middleware/  # Auth, etc
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/             # Next.js
│   ├── src/
│   │   ├── app/        # Pages
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom hooks
│   │   ├── services/   # API client
│   │   └── styles/     # CSS
│   ├── package.json
│   ├── next.config.js
│   └── tsconfig.json
│
├── docs/
│   ├── SETUP.md        # 開発環境構築
│   ├── ARCHITECTURE.md # 設計書
│   └── API.md          # API仕様
│
└── README.md
```

## 📋 フェーズロードマップ

| フェーズ | 期間 | 主要機能 |
|---------|------|--------|
| **Phase 0** | Week 1-2 | API確認・基礎検証 |
| **Phase 1** | Week 3-8 | MVP（テーマ+リサーチ+執筆） |
| **Phase 2** | Week 12-16 | note API統合・SaaS化 |
| **Phase 3** | Week 17-19 | Threads/X連携 |
| **Phase 4** | Week 20-22 | YouTube統合 |
| **Phase 5** | Month 6+ | テンプレート販売・API公開 |

## 💰 マネタイズ戦略

### SaaS（メイン）
- **Free**: テーマ提案×1/月
- **Basic ¥1,980**: 月8記事 + リサーチ無制限
- **Pro ¥4,980**: 月25記事 + note自動投稿 + Threads連携

### テンプレート販売（サブ）
- note上で ¥500-3,000 × 10-20本/月

## 🔧 クイックスタート

### 前提条件
- Node.js 18+
- PostgreSQL 15+
- Redis (キャッシング用)

### インストール
```bash
cd projects/note-automation-saas

# Backend
cd backend
npm install
npm run dev

# Frontend (別ターミナル)
cd ../frontend
npm install
npm run dev
```

詳細は [SETUP.md](docs/SETUP.md) を参照。

## 📖 ドキュメント

- [SETUP.md](docs/SETUP.md) - 開発環境構築ガイド
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - システム設計書
- [API.md](docs/API.md) - API仕様書

## 👥 チーム

- Backend Engineer: 1-2名
- Frontend Engineer: 1名
- Product Manager: 1名

## 📅 更新履歴

- **2026-10-13**: プロジェクト初期化 (Phase 0)

---

詳細な実装計画は `/root/.claude/plans/radiant-chasing-deer.md` を参照。
