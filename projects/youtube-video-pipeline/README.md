# YouTube 動画配信パイプライン

4.5時間の iPhone 撮影動画を自動編集・配信するシステム。

## 🎬 プロセスフロー

```
iPhone 動画（4.5時間）
    ↓
[Web UI] タイムライン表示 + カット指定
    ↓
[Backend] ffmpeg 自動処理
    ├─ 不用部分削除
    ├─ 映像結合
    └─ 出力フォーマット変換
    ↓
[自動生成] サムネイル + エンドロール
    ↓
[出力] YouTube 配信用ファイル
```

## 📊 プロジェクト概要

- **入力**: iPhone MOV/MP4（4.5時間、30-50GB）
- **処理**: ffmpeg ベース（Job Queue で非同期実行）
- **出力**: YouTube 最適化フォーマット（MP4, 1080p/4K）
- **期限**: 2日（講演会2日後配信）

## 🛠️ 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 14 + React Video Player |
| Backend | Node.js + Express + ffmpeg |
| Queue | Bull（Redis based） |
| Storage | ローカルディスク（iCloud+ 2.35TB 空き利用） |

## 📁 プロジェクト構成

```
youtube-video-pipeline/
├── frontend/                  # Next.js UI
│   └── src/app/
│       ├── page.tsx          # メイン画面
│       └── player/
│           └── page.tsx      # ビデオプレイヤー
│
├── backend/                   # Node.js Backend
│   └── src/
│       ├── api/              # API routes
│       ├── services/         # ffmpeg, 動画処理
│       ├── queue/            # Job Queue handler
│       ├── integrations/     # 外部連携
│       └── utils/            # ユーティリティ
│
├── scripts/                   # ffmpeg スクリプト
│   ├── cut-video.sh
│   ├── merge-videos.sh
│   └── generate-thumbnail.sh
│
├── templates/                 # テンプレート
│   ├── end-roll/             # エンドロール動画テンプレート
│   └── thumbnail/            # サムネイルテンプレート
│
└── docs/
    ├── SETUP.md              # 環境構築
    ├── API.md                # API仕様
    └── WORKFLOW.md           # ワークフロー詳細
```

## 🚀 クイックスタート

### 前提条件
- Node.js 18+
- ffmpeg
- Redis（Job Queue用）
- 100GB+ のローカルディスク空き

### セットアップ

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend（別ターミナル）
cd frontend
npm install
npm run dev
```

## 📋 メイン機能

### ① タイムライン UI
- 動画の時系列表示
- ドラッグ&ドロップでカット指定
- リアルタイムプレビュー

### ② 自動編集エンジン
- ffmpeg で指定箇所を自動削除
- 複数セグメント結合
- フォーマット変換（MP4/WebM）

### ③ サムネイル生成
- 自動フレーム抽出
- テキスト・ロゴ追加
- YouTube 最適化（1280×720）

### ④ エンドロール生成
- テンプレートベース
- 次回予告テキスト挿入
- 自動アニメーション

## 📅 実装スケジュール

| 日程 | タスク | 状態 |
|------|--------|------|
| 本日（Day 1） | UI + ffmpeg パイプライン | 進行中 |
| 明日（Day 2） | サムネイル・エンドロール + テスト | 予定 |
| 配信予定日（Day 3） | 本番運用 | 予定 |

## 🔧 環境変数

```env
# Backend
PORT=3002
NODE_ENV=development
REDIS_URL=redis://localhost:6379

# Video Processing
VIDEO_INPUT_DIR=/videos/input
VIDEO_OUTPUT_DIR=/videos/output
FFMPEG_PATH=/usr/bin/ffmpeg

# Thumbnail
THUMBNAIL_WIDTH=1280
THUMBNAIL_HEIGHT=720
```

## 📖 ドキュメント

- [SETUP.md](docs/SETUP.md) - 開発環境構築
- [API.md](docs/API.md) - API 仕様
- [WORKFLOW.md](docs/WORKFLOW.md) - 詳細ワークフロー

## 👥 スタッフ

- 岩本 純子

## 📊 パフォーマンス指標

| 項目 | Target |
|-----|--------|
| ビデオプレイヤー読み込み | < 3秒 |
| タイムライン表示（4.5時間） | < 5秒 |
| ffmpeg 処理時間 | 4-8時間（マシン依存） |
| サムネイル生成 | < 10秒 |

## ⚡ 次のステップ

1. ✅ プロジェクト初期化
2. ⏳ Backend ffmpeg パイプライン実装
3. ⏳ Frontend タイムライン UI 実装
4. ⏳ Job Queue セットアップ
5. ⏳ サムネイル・エンドロール生成
6. ⏳ 統合テスト
7. ⏳ 本番デプロイ

---

**更新**: 2026-10-14 初期化
