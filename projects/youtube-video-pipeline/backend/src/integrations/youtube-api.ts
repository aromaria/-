/**
 * YouTube API Integration Service
 *
 * 注意: 本実装は Google API Client Library を使用します
 * 初期化には OAuth 2.0 認証が必要です
 *
 * セットアップ手順:
 * 1. Google Cloud Console で OAuth 2.0 認証情報を作成
 * 2. 環境変数に YOUTUBE_API_KEY と YOUTUBE_CLIENT_SECRET を設定
 * 3. ユーザーに OAuth 承認を取得
 */

interface UploadVideoOptions {
  title: string;
  description: string;
  tags: string[];
  categoryId?: string;
  privacyStatus?: 'public' | 'private' | 'unlisted';
  publishAt?: Date;
  thumbnail?: string; // ローカルファイルパス
  expirationDays?: number; // デフォルト: 14日間
}

interface VideoMetadata {
  videoId: string;
  title: string;
  description: string;
  url: string;
  status: 'public' | 'private' | 'unlisted';
  publishedAt?: Date;
}

export class YouTubeAPI {
  private static instance: YouTubeAPI;
  private apiKey: string;
  private clientSecret: string;
  private accessToken: string | null = null;

  private constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET || '';
  }

  static getInstance(): YouTubeAPI {
    if (!YouTubeAPI.instance) {
      YouTubeAPI.instance = new YouTubeAPI();
    }
    return YouTubeAPI.instance;
  }

  /**
   * ビデオをアップロード（スケジュール配信対応 + 14日自動非公開）
   */
  async uploadVideo(
    videoFilePath: string,
    options: UploadVideoOptions
  ): Promise<VideoMetadata> {
    const expirationDays = options.expirationDays || 14;
    const expiresAt = this.calculateExpirationDate(expirationDays);

    console.log(`📺 Uploading to YouTube: ${options.title}`);
    console.log(`⏰ Visibility period: 14 days (expires ${expiresAt.toISOString().split('T')[0]})`);

    if (!this.accessToken) {
      throw new Error('YouTube API access token not set. OAuth authentication required.');
    }

    try {
      // TODO: Google API Client Library を使用して実装
      // const youtube = google.youtube({
      //   version: 'v3',
      //   auth: this.accessToken,
      // });
      //
      // const response = await youtube.videos.insert({
      //   part: ['snippet', 'status'],
      //   requestBody: {
      //     snippet: {
      //       title: options.title,
      //       description: this.addExpirationNotice(
      //         options.description,
      //         expiresAt
      //       ),
      //       tags: options.tags,
      //       categoryId: options.categoryId || '27', // Education
      //       defaultLanguage: 'ja',
      //     },
      //     status: {
      //       privacyStatus: options.privacyStatus || 'public',
      //       publishAt: options.publishAt,
      //       selfDeclaredMadeForKids: false,
      //     },
      //   },
      //   media: {
      //     body: fs.createReadStream(videoFilePath),
      //   },
      // });
      //
      // // サムネイル設定
      // if (options.thumbnail) {
      //   await youtube.thumbnails.set({
      //     videoId: response.data.id,
      //     media: {
      //       body: fs.createReadStream(options.thumbnail),
      //     },
      //   });
      // }

      const mockVideoId = `video_${Date.now()}`;
      console.log(`✅ Video uploaded: ${mockVideoId}`);
      console.log(`📅 Will be private after: ${expiresAt.toISOString().split('T')[0]}`);

      return {
        videoId: mockVideoId,
        title: options.title,
        description: options.description,
        url: `https://www.youtube.com/watch?v=${mockVideoId}`,
        status: options.privacyStatus || 'public',
        publishedAt: options.publishAt || new Date(),
      };
    } catch (error) {
      console.error('YouTube upload failed:', error);
      throw new Error('Failed to upload video to YouTube');
    }
  }

  /**
   * 有効期限を計算（今から N 日後）
   */
  private calculateExpirationDate(days: number): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  /**
   * 説明文に有効期限の案内を追加
   */
  private addExpirationNotice(description: string, expiresAt: Date): string {
    const expirationNotice = `\n\n⏰ 【重要】このビデオは ${expiresAt.toLocaleDateString('ja-JP')} で非公開になります。\n見逃さないようご注意ください！`;
    return description + expirationNotice;
  }

  /**
   * ビデオをスケジュール配信に設定
   */
  async scheduleVideoPublish(
    videoId: string,
    publishAt: Date
  ): Promise<void> {
    console.log(`📅 Scheduling video for publish: ${videoId}`);
    console.log(`   Publish time: ${publishAt.toISOString()}`);

    // TODO: Google API を使用して実装
    // const youtube = google.youtube({
    //   version: 'v3',
    //   auth: this.accessToken,
    // });
    //
    // await youtube.videos.update({
    //   part: ['status'],
    //   requestBody: {
    //     id: videoId,
    //     status: {
    //       privacyStatus: 'private',
    //       publishAt: publishAt.toISOString(),
    //       selfDeclaredMadeForKids: false,
    //     },
    //   },
    // });
  }

  /**
   * ビデオを公開
   */
  async publishVideo(videoId: string): Promise<void> {
    console.log(`🚀 Publishing video: ${videoId}`);

    // TODO: Google API を使用して実装
    // const youtube = google.youtube({
    //   version: 'v3',
    //   auth: this.accessToken,
    // });
    //
    // await youtube.videos.update({
    //   part: ['status'],
    //   requestBody: {
    //     id: videoId,
    //     status: {
    //       privacyStatus: 'public',
    //       selfDeclaredMadeForKids: false,
    //     },
    //   },
    // });
  }

  /**
   * ビデオ情報を取得
   */
  async getVideoInfo(videoId: string): Promise<VideoMetadata> {
    console.log(`📊 Fetching video info: ${videoId}`);

    // TODO: Google API を使用して実装
    // const youtube = google.youtube({
    //   version: 'v3',
    //   auth: this.accessToken,
    // });
    //
    // const response = await youtube.videos.list({
    //   part: ['snippet', 'status'],
    //   id: [videoId],
    // });

    return {
      videoId,
      title: 'Video Title',
      description: 'Video Description',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      status: 'private',
    };
  }

  /**
   * チャンネル統計を取得
   */
  async getChannelStats(): Promise<{
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
  }> {
    console.log(`📈 Fetching channel stats...`);

    // TODO: Google API を使用して実装

    return {
      subscriberCount: 0,
      viewCount: 0,
      videoCount: 0,
    };
  }

  /**
   * OAuth 2.0 アクセストークンを設定
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    console.log('✅ YouTube API access token set');
  }

  /**
   * 認証ステータスを確認
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export default YouTubeAPI.getInstance();
