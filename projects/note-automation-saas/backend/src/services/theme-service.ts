import claudeAPI from '../integrations/claude-api.js';

interface GenerateThemeInput {
  userId: string;
  background: string;
  interests: string[];
  targetAudience: string;
}

interface Theme {
  id: string;
  userId: string;
  title: string;
  description: string;
  sellPotential: number;
  estimatedPrice: number;
  relatedKeywords: string[];
  createdAt: Date;
}

export class ThemeService {
  private static instance: ThemeService;

  private constructor() {}

  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  async generateTheme(input: GenerateThemeInput): Promise<Theme> {
    try {
      // Claude API でテーマ生成
      const claudeResult = await claudeAPI.generateTheme({
        background: input.background,
        interests: input.interests,
        targetAudience: input.targetAudience,
      });

      // データベースに保存（将来実装）
      const theme: Theme = {
        id: `theme_${Date.now()}`,
        userId: input.userId,
        title: claudeResult.title,
        description: claudeResult.description,
        sellPotential: claudeResult.sellPotential,
        estimatedPrice: claudeResult.estimatedPrice,
        relatedKeywords: [],
        createdAt: new Date(),
      };

      // TODO: Save to database
      // await prisma.theme.create({ data: theme });

      return theme;
    } catch (error) {
      console.error('Theme generation failed:', error);
      throw new Error('Failed to generate theme');
    }
  }

  async getUserThemes(userId: string): Promise<Theme[]> {
    // TODO: Fetch from database
    // return await prisma.theme.findMany({ where: { userId } });
    return [];
  }

  async getThemeById(id: string, userId: string): Promise<Theme | null> {
    // TODO: Fetch from database
    // return await prisma.theme.findUnique({ where: { id } });
    return null;
  }

  async deleteTheme(id: string, userId: string): Promise<void> {
    // TODO: Delete from database
    // await prisma.theme.delete({ where: { id } });
  }
}

export default ThemeService.getInstance();
