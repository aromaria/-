import { addDays, format } from 'date-fns';

interface CreateEventInput {
  title: string;
  description?: string;
  speaker?: string;
  eventDate: Date;
  templateId?: string;
}

interface UpdateEventInput {
  title?: string;
  description?: string;
  speaker?: string;
  status?: string;
  videoFile?: string;
  thumbnail?: string;
  endrollVideo?: string;
}

interface EventResponse {
  id: string;
  title: string;
  speaker?: string;
  eventDate: Date;
  scheduledPublishDate: Date;
  status: string;
  youtubeStatus: string;
  videoFile?: string;
  thumbnail?: string;
  finalVideo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EventService {
  private static instance: EventService;

  private constructor() {}

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  /**
   * 新規講演会を作成
   */
  async createEvent(input: CreateEventInput): Promise<EventResponse> {
    // 配信予定日を自動計算（講演会日 + 2日）
    const scheduledPublishDate = addDays(new Date(input.eventDate), 2);

    try {
      // TODO: Prisma を使用して実装
      // const event = await prisma.event.create({
      //   data: {
      //     title: input.title,
      //     description: input.description,
      //     speaker: input.speaker,
      //     eventDate: input.eventDate,
      //     scheduledPublishDate,
      //     templateId: input.templateId,
      //     status: 'upload_pending',
      //     youtubeStatus: 'draft',
      //   },
      // });

      const event: EventResponse = {
        id: `event_${Date.now()}`,
        title: input.title,
        speaker: input.speaker,
        eventDate: new Date(input.eventDate),
        scheduledPublishDate,
        status: 'upload_pending',
        youtubeStatus: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log(`✅ Event created: ${event.title} (${event.id})`);
      console.log(`📅 Scheduled publish: ${format(scheduledPublishDate, 'yyyy-MM-dd HH:mm')}`);

      return event;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw new Error('Failed to create event');
    }
  }

  /**
   * 講演会情報を取得
   */
  async getEvent(eventId: string): Promise<EventResponse | null> {
    // TODO: Prisma で実装
    // return await prisma.event.findUnique({ where: { id: eventId } });
    return null;
  }

  /**
   * すべての講演会を取得（フィルタ付き）
   */
  async listEvents(filters?: {
    status?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<EventResponse[]> {
    // TODO: Prisma で実装
    // const where: any = {};
    // if (filters?.status) where.status = filters.status;
    // if (filters?.fromDate) where.eventDate = { gte: filters.fromDate };
    // if (filters?.toDate) where.eventDate = { ...where.eventDate, lte: filters.toDate };
    //
    // return await prisma.event.findMany({
    //   where,
    //   orderBy: { eventDate: 'desc' },
    // });

    return [];
  }

  /**
   * 講演会情報を更新
   */
  async updateEvent(eventId: string, input: UpdateEventInput): Promise<EventResponse | null> {
    // TODO: Prisma で実装
    // return await prisma.event.update({
    //   where: { id: eventId },
    //   data: input,
    // });

    return null;
  }

  /**
   * ステータスを更新
   */
  async updateStatus(eventId: string, status: string): Promise<void> {
    console.log(`[Event] Updating status: ${eventId} → ${status}`);

    // TODO: Prisma で実装
    // await prisma.event.update({
    //   where: { id: eventId },
    //   data: { status, updatedAt: new Date() },
    // });
  }

  /**
   * 2日後に配信予定の講演会を取得（自動スケジューリング用）
   */
  async getEventsScheduledForPublish(): Promise<EventResponse[]> {
    const now = new Date();
    const tomorrow = addDays(now, 1);

    console.log(`🔍 Checking events to publish: ${format(now, 'yyyy-MM-dd')}`);

    // TODO: Prisma で実装
    // return await prisma.event.findMany({
    //   where: {
    //     scheduledPublishDate: {
    //       gte: now,
    //       lt: addDays(now, 1),
    //     },
    //     status: 'ready_to_publish',
    //     youtubeStatus: { not: 'published' },
    //   },
    // });

    return [];
  }

  /**
   * YouTube スケジュール投稿を設定
   */
  async scheduleYouTubePublish(
    eventId: string,
    scheduledTime: Date
  ): Promise<void> {
    console.log(`📺 Scheduling YouTube publish: ${eventId} at ${format(scheduledTime, 'yyyy-MM-dd HH:mm')}`);

    // TODO: Prisma で実装
    // await prisma.event.update({
    //   where: { id: eventId },
    //   data: {
    //     youtubeScheduledTime: scheduledTime,
    //     youtubeStatus: 'scheduled',
    //   },
    // });
  }

  /**
   * 処理ジョブを記録
   */
  async recordJob(
    eventId: string,
    jobType: string,
    status: string,
    result?: any
  ): Promise<void> {
    console.log(`📊 Recording job: ${eventId} - ${jobType} (${status})`);

    // TODO: Prisma で実装
    // await prisma.processJob.create({
    //   data: {
    //     eventId,
    //     jobType,
    //     status,
    //     result,
    //   },
    // });
  }

  /**
   * 講演会ステータスの進行状況を取得
   */
  async getEventProgress(eventId: string): Promise<{
    status: string;
    progress: number;
    jobs: Array<{ jobType: string; status: string }>;
  }> {
    // TODO: Prisma で実装
    // const event = await prisma.event.findUnique({
    //   where: { id: eventId },
    //   include: { jobHistory: true },
    // });

    return {
      status: 'processing',
      progress: 45,
      jobs: [
        { jobType: 'video_cut', status: 'completed' },
        { jobType: 'thumbnail_gen', status: 'processing' },
        { jobType: 'endroll_gen', status: 'pending' },
      ],
    };
  }
}

export default EventService.getInstance();
