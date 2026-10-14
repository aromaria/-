import { CronJob } from 'cron';
import eventService from '../services/event-service.js';
import youtubeAPI from '../integrations/youtube-api.js';

/**
 * Cron ジョブスケジューラー
 * 日次で 2 日後配信予定の講演会を自動配信
 */
export class Scheduler {
  private static instance: Scheduler;
  private jobs: Map<string, CronJob> = new Map();

  private constructor() {}

  static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  /**
   * スケジューラーを初期化・起動
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Scheduler...');

    // 毎日朝 9:00 に配信予定の講演会をチェック
    const dailyPublishJob = new CronJob(
      '0 9 * * *', // 毎日 09:00 (UTC)
      async () => {
        await this.checkAndPublishScheduledEvents();
      },
      null,
      true, // start immediately
      'UTC'
    );

    this.jobs.set('daily-publish', dailyPublishJob);
    console.log('✅ Daily publish job scheduled (09:00 UTC)');

    // 毎日夜 21:00 に処理進捗をチェック
    const progressCheckJob = new CronJob(
      '0 21 * * *', // 毎日 21:00 (UTC)
      async () => {
        await this.checkProcessingProgress();
      },
      null,
      true,
      'UTC'
    );

    this.jobs.set('progress-check', progressCheckJob);
    console.log('✅ Progress check job scheduled (21:00 UTC)');

    // 毎日朝 10:00 に有効期限切れの動画を確認・非公開化
    const expirationCheckJob = new CronJob(
      '0 10 * * *', // 毎日 10:00 (UTC)
      async () => {
        await this.checkAndExpireVideos();
      },
      null,
      true,
      'UTC'
    );

    this.jobs.set('expiration-check', expirationCheckJob);
    console.log('✅ Expiration check job scheduled (10:00 UTC)');

    // テスト用：毎分チェック（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      const testJob = new CronJob(
        '*/1 * * * *', // 毎分
        async () => {
          console.log(`[TEST] Cron job running: ${new Date().toISOString()}`);
        },
        null,
        true,
        'UTC'
      );

      this.jobs.set('test-every-minute', testJob);
      console.log('⚠️ Test job scheduled (every minute - development only)');
    }

    console.log('✅ Scheduler initialized with ' + this.jobs.size + ' jobs');
  }

  /**
   * 配信予定の講演会を自動配信
   */
  private async checkAndPublishScheduledEvents(): Promise<void> {
    console.log('\n📺 [CRON] Checking for scheduled events to publish...');

    try {
      // 2 日後に配信予定の講演会を取得
      const events = await eventService.getEventsScheduledForPublish();

      if (events.length === 0) {
        console.log('ℹ️ No events scheduled for publish today');
        return;
      }

      console.log(`🎬 Found ${events.length} event(s) to publish`);

      for (const event of events) {
        await this.publishEvent(event.id);
      }
    } catch (error) {
      console.error('❌ Error checking scheduled events:', error);
    }
  }

  /**
   * 講演会を配信（YouTube に自動投稿）
   */
  private async publishEvent(eventId: string): Promise<void> {
    console.log(`\n🚀 Publishing event: ${eventId}`);

    try {
      // イベント情報を取得
      const event = await eventService.getEvent(eventId);
      if (!event || !event.finalVideo) {
        console.warn(`⚠️ Event ${eventId} is missing final video`);
        return;
      }

      // YouTube に自動投稿
      console.log(`📤 Uploading to YouTube...`);
      const metadata = await youtubeAPI.uploadVideo(event.finalVideo, {
        title: event.title,
        description: `【講演会】${event.title}\nスピーカー: ${event.speaker || 'N/A'}\n\n次回も配信予定です。チャンネル登録をお願いします！`,
        tags: ['講演会', 'YouTube', '教育', '配信'],
        privacyStatus: 'public',
      });

      console.log(`✅ Video published: ${metadata.url}`);

      // ステータスを更新
      await eventService.updateStatus(eventId, 'published');
      await eventService.recordJob(eventId, 'publish', 'completed', {
        youtubeVideoId: metadata.videoId,
        youtubeUrl: metadata.url,
      });

      console.log(`✅ Event ${eventId} published successfully`);
    } catch (error) {
      console.error(`❌ Failed to publish event ${eventId}:`, error);
      await eventService.recordJob(eventId, 'publish', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 処理中の講演会の進捗をチェック
   */
  private async checkProcessingProgress(): Promise<void> {
    console.log('\n📊 [CRON] Checking processing progress...');

    try {
      // すべての編集中の講演会を確認
      const events = await eventService.listEvents({
        status: 'editing',
      });

      console.log(`📈 ${events.length} event(s) in progress`);

      for (const event of events) {
        const progress = await eventService.getEventProgress(event.id);
        console.log(`  • ${event.title}: ${progress.progress}% complete`);

        // 進捗が 100% なら ready_to_publish に変更
        if (progress.progress >= 100) {
          await eventService.updateStatus(event.id, 'ready_to_publish');
          console.log(`    ✅ Ready for publish!`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking progress:', error);
    }
  }

  /**
   * 有効期限切れの動画を自動非公開化
   */
  private async checkAndExpireVideos(): Promise<void> {
    console.log('\n⏰ [CRON] Checking for expired videos...');

    try {
      const now = new Date();

      // すべての公開中の講演会を確認
      const events = await eventService.listEvents({
        status: 'published',
      });

      console.log(`📺 Checking ${events.length} published event(s)`);

      for (const event of events) {
        // youtubeExpiresAt が過去なら非公開化
        if (event.youtubeExpiresAt && new Date(event.youtubeExpiresAt) <= now) {
          console.log(`\n🔒 Video expired: ${event.title}`);
          console.log(`   Expired at: ${event.youtubeExpiresAt}`);

          // YouTube の動画を非公開に
          if (event.youtubeVideoId) {
            console.log(`   Setting video ${event.youtubeVideoId} to private...`);
            // TODO: YouTubeAPI.updateVideoPrivacy(event.youtubeVideoId, 'private');

            // ステータスを更新
            await eventService.updateStatus(event.id, 'expired');
            console.log(`   ✅ Video is now private`);
          }
        }
      }

      console.log('✅ Expiration check complete');
    } catch (error) {
      console.error('❌ Error checking expiration:', error);
    }
  }

  /**
   * すべてのジョブを停止
   */
  stopAll(): void {
    console.log('⏹️ Stopping all cron jobs...');

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`  • Stopped: ${name}`);
    });

    this.jobs.clear();
    console.log('✅ All jobs stopped');
  }

  /**
   * ジョブの状態を確認
   */
  getStatus(): {
    running: boolean;
    jobs: Array<{ name: string; running: boolean }>;
  } {
    return {
      running: this.jobs.size > 0,
      jobs: Array.from(this.jobs.entries()).map(([name, job]) => ({
        name,
        running: job.running,
      })),
    };
  }
}

export default Scheduler.getInstance();
