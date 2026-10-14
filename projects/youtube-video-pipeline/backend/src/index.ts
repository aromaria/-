import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import scheduler from './queue/scheduler.js';
import jobWorker from './queue/job-worker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// ファイルアップロード設定
const upload = multer({
  dest: process.env.VIDEO_INPUT_DIR || '/tmp/videos',
  limits: { fileSize: 50 * 1024 * 1024 * 1024 }, // 50GB
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'youtube-video-pipeline',
  });
});

// API Routes
// ビデオアップロード
app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    fileId: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    message: 'Video upload endpoint - coming soon',
  });
});

// ビデオ情報取得
app.get('/api/video/:fileId/info', (req, res) => {
  res.json({
    fileId: req.params.fileId,
    message: 'Get video info endpoint - coming soon',
  });
});

// ビデオプレビュー生成
app.post('/api/video/:fileId/preview', (req, res) => {
  res.status(202).json({
    jobId: 'job_' + Date.now(),
    status: 'processing',
    message: 'Generate preview endpoint - coming soon',
  });
});

// カット情報を保存してジョブを開始
app.post('/api/video/:fileId/process', (req, res) => {
  const { cuts } = req.body; // Array of { startTime, endTime }

  if (!Array.isArray(cuts) || cuts.length === 0) {
    return res.status(400).json({
      error: 'Invalid cuts',
      message: 'cuts must be an array with at least one segment',
    });
  }

  res.status(202).json({
    fileId: req.params.fileId,
    jobId: 'job_' + Date.now(),
    status: 'queued',
    cuts,
    message: 'Video processing job submitted',
  });
});

// ジョブ進捗確認
app.get('/api/job/:jobId', (req, res) => {
  res.json({
    jobId: req.params.jobId,
    status: 'processing',
    progress: 45,
    message: 'Get job status endpoint - coming soon',
  });
});

// エンドロール生成
app.post('/api/endroll/generate', (req, res) => {
  const { nextEventDate, title, description } = req.body;

  res.status(202).json({
    jobId: 'job_' + Date.now(),
    status: 'generating',
    message: 'Endroll generation - coming soon',
  });
});

// サムネイル生成
app.post('/api/thumbnail/generate', (req, res) => {
  const { videoFileId, timeSeconds } = req.body;

  res.status(202).json({
    jobId: 'job_' + Date.now(),
    status: 'generating',
    message: 'Thumbnail generation - coming soon',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// Error Handler
app.use(
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  }
);

// Start Server
app.listen(PORT, async () => {
  console.log(`\n🎬 YouTube Video Pipeline Backend`);
  console.log(`🚀 Running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Video input dir: ${process.env.VIDEO_INPUT_DIR || '/tmp/videos'}`);
  console.log(`📁 Video output dir: ${process.env.VIDEO_OUTPUT_DIR || '/tmp/output'}`);

  // スケジューラーを初期化
  console.log('\n⏱️ Initializing Scheduler...');
  try {
    await scheduler.initialize();
    console.log('✅ Scheduler ready');
  } catch (error) {
    console.error('⚠️ Scheduler initialization failed:', error);
  }

  // Job Queue ワーカーを初期化
  console.log('\n⚙️ Initializing Job Workers...');
  try {
    await jobWorker.initialize();
    console.log('✅ Job Workers ready');
  } catch (error) {
    console.error('⚠️ Job Worker initialization failed:', error);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 YouTube Video Pipeline is READY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    await scheduler.stopAll();
    await jobWorker.stopAll();
    process.exit(0);
  });
});
