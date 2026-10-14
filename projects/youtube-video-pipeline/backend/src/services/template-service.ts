interface CreateTemplateInput {
  name: string;
  description?: string;
  thumbnailTitle?: string;
  thumbnailSubtitle?: string;
  logoPath?: string;
  endrollDuration?: number;
  youtubeTitle?: string;
  youtubeDesc?: string;
  youtubeTags?: string[];
  channelName?: string;
  channelUrl?: string;
}

interface TemplateResponse {
  id: string;
  name: string;
  description?: string;
  thumbnailTitle?: string;
  thumbnailSubtitle?: string;
  youtubeTitle?: string;
  youtubeTags?: string[];
  channelName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateService {
  private static instance: TemplateService;
  private templates: Map<string, TemplateResponse> = new Map();

  private constructor() {}

  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * テンプレートを作成
   */
  async createTemplate(input: CreateTemplateInput): Promise<TemplateResponse> {
    try {
      const template: TemplateResponse = {
        id: `template_${Date.now()}`,
        name: input.name,
        description: input.description,
        thumbnailTitle: input.thumbnailTitle,
        thumbnailSubtitle: input.thumbnailSubtitle,
        youtubeTitle: input.youtubeTitle,
        youtubeTags: input.youtubeTags || [],
        channelName: input.channelName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // TODO: Prisma で実装
      // const template = await prisma.eventTemplate.create({
      //   data: input,
      // });

      this.templates.set(template.id, template);
      console.log(`✅ Template created: ${template.name}`);

      return template;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw new Error('Failed to create template');
    }
  }

  /**
   * テンプレートを取得
   */
  async getTemplate(templateId: string): Promise<TemplateResponse | null> {
    // TODO: Prisma で実装
    // return await prisma.eventTemplate.findUnique({
    //   where: { id: templateId },
    // });

    return this.templates.get(templateId) || null;
  }

  /**
   * すべてのテンプレートを一覧表示
   */
  async listTemplates(): Promise<TemplateResponse[]> {
    console.log(`📋 Listing all templates (${this.templates.size})`);

    // TODO: Prisma で実装
    // return await prisma.eventTemplate.findMany({
    //   orderBy: { createdAt: 'desc' },
    // });

    return Array.from(this.templates.values());
  }

  /**
   * テンプレートを更新
   */
  async updateTemplate(
    templateId: string,
    input: Partial<CreateTemplateInput>
  ): Promise<TemplateResponse | null> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const updated: TemplateResponse = {
      ...template,
      ...input,
      updatedAt: new Date(),
    };

    // TODO: Prisma で実装
    // return await prisma.eventTemplate.update({
    //   where: { id: templateId },
    //   data: input,
    // });

    this.templates.set(templateId, updated);
    return updated;
  }

  /**
   * テンプレートを削除
   */
  async deleteTemplate(templateId: string): Promise<void> {
    // TODO: Prisma で実装
    // await prisma.eventTemplate.delete({
    //   where: { id: templateId },
    // });

    this.templates.delete(templateId);
    console.log(`🗑️ Template deleted: ${templateId}`);
  }

  /**
   * デフォルトテンプレートを作成（初期化用）
   */
  async createDefaultTemplate(): Promise<TemplateResponse> {
    const defaultTemplate: CreateTemplateInput = {
      name: 'デフォルト テンプレート',
      description: '連続講演会用のデフォルトテンプレート',
      thumbnailTitle: '講演会',
      thumbnailSubtitle: 'YouTube 配信',
      endrollDuration: 30,
      youtubeTitle: '講演会配信',
      youtubeDesc: '連続講演会のYouTube配信です。\n\n【次回予告】\n${nextEventTitle}\n日時: ${nextEventDate}',
      youtubeTags: ['講演会', 'YouTube', '教育', '配信'],
      channelName: '岩本純子',
      channelUrl: 'https://www.youtube.com/@iwamotojunko',
    };

    return this.createTemplate(defaultTemplate);
  }

  /**
   * テンプレートからサムネイル設定を取得
   */
  async getThumbnailSettings(templateId: string): Promise<{
    title?: string;
    subtitle?: string;
    logoPath?: string;
  } | null> {
    const template = await this.getTemplate(templateId);
    if (!template) return null;

    return {
      title: template.thumbnailTitle,
      subtitle: template.thumbnailSubtitle,
      logoPath: undefined, // TODO: テンプレートから取得
    };
  }

  /**
   * テンプレートからエンドロール設定を取得
   */
  async getEndrollSettings(templateId: string): Promise<{
    duration?: number;
    nextEventTitle?: string;
    nextEventDate?: string;
  } | null> {
    const template = await this.getTemplate(templateId);
    if (!template) return null;

    return {
      duration: 30,
      nextEventTitle: undefined,
      nextEventDate: undefined,
    };
  }

  /**
   * テンプレートから YouTube メタデータを取得
   */
  async getYouTubeMetadata(templateId: string): Promise<{
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
  } | null> {
    const template = await this.getTemplate(templateId);
    if (!template) return null;

    return {
      title: template.youtubeTitle,
      description: `配信者: ${template.channelName}\nチャンネル: ${template.channelUrl}`,
      tags: template.youtubeTags,
      category: 'Education',
    };
  }
}

export default TemplateService.getInstance();
