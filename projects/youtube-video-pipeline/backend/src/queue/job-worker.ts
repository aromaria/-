import { Queue, Worker } from 'bullmq';
import Redis from 'redis';
import videoProcessor from '../services/video-processor.js';
import thumbnailGenerator from '../services/thumbnail-generator.js';
import endrollGenerator from '../services/endroll-generator.js';
import eventService from '../services/event-service.js';

/**
 * Job Queue ワーカー
 * Bull + Redis を使用して、長時間の ffmpeg 処理をバックグラウンドで実行
 */

interface JobData {
  eventId: string;
  videoFilePath?: string;
  outputDir?: string;
  cuts?: Array<{ startTime: number; endTime: number }>;
  templateId?: string;
}

export class JobWorker {
  private static instance: JobWorker;
  private videoQueue: Queue<JobData>;
  private thumbnailQueue: Queue<JobData>;
  private endrollQueue: Queue<JobData>;
  private publishQueue: Queue<JobData>;
  private workers: Map<string, Worker> = new Map();

  private constructor() {
    const redis = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    };

    // キューを初期化
    this.videoQueue = new Queue('video-processing', { connection: redis });
    this.thumbnailQueue = new Queue('thumbnail-generation', { connection: redis });
    this.endrollQueue = new Queue('endroll-generation', { connection: redis });
    this.publishQueue = new Queue('publish', { connection: redis });
  }

  static getInstance(): JobWorker {
    if (!JobWorker.instance) {
      JobWorker.instance = new JobWorker();
    }
    return JobWorker.instance;
  }

  /**
   * ワーカーを初期化・起動
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Job Workers...');

    // ビデオ処理ワーカー
    const videoWorker = new Worker(
      'video-processing',
      async (job) => {
        console.log(`\n📹 [VIDEO] Processing: ${job.data.eventId}`);
        return this.processVideo(job);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        concurrency: 1, // 1 つずつ処理（CPU 集約的）
      }
    );

    videoWorker.on('completed', (job) => {
      console.log(`✅ [VIDEO] Completed: ${job.data.eventId}`);
    });

    videoWorker.on('failed', (job, err) => {
      console.error(`❌ [VIDEO] Failed: ${job?.data.eventId}`, err.message);
    });

    this.workers.set('video', videoWorker);

    // サムネイル生成ワーカー
    const thumbnailWorker = new Worker(
      'thumbnail-generation',
      async (job) => {
        console.log(`\n🎨 [THUMBNAIL] Generating: ${job.data.eventId}`);
        return this.generateThumbnail(job);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        concurrency: 4, // 複数並列可能
      }
    );

    this.workers.set('thumbnail', thumbnailWorker);

    // エンドロール生成ワーカー
    const endrollWorker = new Worker(
      'endroll-generation',
      async (job) => {
        console.log(`\n🎬 [ENDROLL] Generating: ${job.data.eventId}`);
        return this.generateEndroll(job);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        concurrency: 2,
      }
    );

    this.workers.set('endroll', endrollWorker);

    console.log('✅ Job Workers initialized (' + this.workers.size + ' workers)');
  }

  /**
   * ビデオ処理ジョブを追加
   */
  async addVideoProcessingJob(eventId: string, videoFile: string): Promise<string> {
    console.log(`📤 Adding video processing job: ${eventId}`);

    const job = await this.videoQueue.add(
      { eventId, videoFilePath: videoFile, outputDir: '/tmp/video-output' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: false, // 履歴を保持
      }
    );

    await eventService.recordJob(eventId, 'video_cut', 'pending');
    return job.id || 'unknown';
  }

  /**
   * サムネイル生成ジョブを追加
   */
  async addThumbnailJob(eventId: string, frameFile: string): Promise<string> {
    console.log(`📤 Adding thumbnail job: ${eventId}`);

    const job = await this.thumbnailQueue.add(
      { eventId, videoFilePath: frameFile },
      {
        attempts: 2,
        removeOnComplete: true,
      }
    );

    await eventService.recordJob(eventId, 'thumbnail_gen', 'pending');
    return job.id || 'unknown';
  }

  /**
   * エンドロール生成ジョブを追加
   */
  async addEndrollJob(eventId: string): Promise<string> {
    console.log(`📤 Adding endroll job: ${eventId}`);

    const job = await this.endrollQueue.add(
      { eventId },
      {
        attempts: 2,
        removeOnComplete: true,
      }
    );

    await eventService.recordJob(eventId, 'endroll_gen', 'pending');
    return job.id || 'unknown';
  }

  /**
   * ビデオ処理実行
   */
  private async processVideo(job: any): Promise<void> {
    const eventId = job.data.eventId;

    try {
      job.progress(10);
      console.log(`[VIDEO] Starting ffmpeg processing: ${eventId}`);

      // TODO: 実際の ffmpeg 処理
      // await videoProcessor.optimizeForYouTube(
      //   job.data.videoFilePath,
      //   `/tmp/video-output/${eventId}_final.mp4`
      // );

      // シミュレーション
      for (let i = 10; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        job.progress(i);
      }

      await eventService.recordJob(eventId, 'video_cut', 'completed', {
        outputFile: `/tmp/video-output/${eventId}_final.mp4`,
      });

      console.log(`✅ [VIDEO] Processing complete: ${eventId}`);
    } catch (error) {
      console.error(`❌ [VIDEO] Processing failed: ${eventId}`, error);
      throw error;
    }
  }

  /**
   * サムネイル生成実行
   */
  private async generateThumbnail(job: any): Promise<void> {
    const eventId = job.data.eventId;

    try {
      job.progress(30);

      // TODO: 実際のサムネイル生成
      // await thumbnailGenerator.generateYouTubeThumbnail(
      //   job.data.videoFilePath,
      //   `/tmp/output/${eventId}_thumbnail.jpg`
      // );

      job.progress(100);

      await eventService.recordJob(eventId, 'thumbnail_gen', 'completed', {
        thumbnailFile: `/tmp/output/${eventId}_thumbnail.jpg`,
      });

      console.log(`✅ [THUMBNAIL] Generation complete: ${eventId}`);
    } catch (error) {
      console.error(`❌ [THUMBNAIL] Generation failed: ${eventId}`, error);
      throw error;
    }
  }

  /**
   * エンドロール生成実行
   */
  private async generateEndroll(job: any): Promise<void> {
    const eventId = job.data.eventId;

    try {
      job.progress(50);

      // TODO: 実際のエンドロール生成
      // await endrollGenerator.generateEndroll(
      //   `/tmp/output/${eventId}_endroll.mp4`,
      //   {
      //     nextEventTitle: '次の講演会',
      //     nextEventDate: '2026-10-21',
      //   }
      // );

      job.progress(100);

      await eventService.recordJob(eventId, 'endroll_gen', 'completed', {
        endrollFile: `/tmp/output/${eventId}_endroll.mp4`,
      });

      console.log(`✅ [ENDROLL] Generation complete: ${eventId}`);
    } catch (error) {
      console.error(`❌ [ENDROLL] Generation failed: ${eventId}`, error);
      throw error;
    }
  }

  /**
   * すべてのワーカーを停止
   */
  async stopAll(): Promise<void> {
    console.log('⏹️ Stopping all workers...');

    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`  • Closed: ${name}`);
    }

    this.workers.clear();
    console.log('✅ All workers stopped');
  }

  /**
   * キューの状態を確認
   */
  async getStatus(): Promise<{
    queues: Array<{
      name: string;
      pending: number;
      active: number;
      completed: number;
      failed: number;
    }>;
  }> {
    const queues = [
      { name: 'video-processing', queue: this.videoQueue },
      { name: 'thumbnail-generation', queue: this.thumbnailQueue },
      { name: 'endroll-generation', queue: this.endrollQueue },
      { name: 'publish', queue: this.publishQueue },
    ];

    const status = [];

    for (const { name, queue } of queues) {
      const counts = await queue.getCountsPerState();
      status.push({
        name,
        pending: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
      });
    }

    return { queues: status };
  }
}

export default JobWorker.getInstance();
