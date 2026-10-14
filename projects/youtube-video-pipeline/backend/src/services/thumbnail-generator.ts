import sharp from 'sharp';
import path from 'path';

interface TextOptions {
  text: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

interface ThumbnailOptions {
  frameFile: string;
  outputFile: string;
  width?: number;
  height?: number;
  title?: TextOptions;
  subtitle?: TextOptions;
  logo?: {
    path: string;
    width: number;
    height: number;
  };
}

export class ThumbnailGenerator {
  private static instance: ThumbnailGenerator;

  private constructor() {}

  static getInstance(): ThumbnailGenerator {
    if (!ThumbnailGenerator.instance) {
      ThumbnailGenerator.instance = new ThumbnailGenerator();
    }
    return ThumbnailGenerator.instance;
  }

  /**
   * YouTube 推奨フォーマットでサムネイル生成
   * 推奨: 1280×720px
   */
  async generateYouTubeThumbnail(
    frameFile: string,
    outputFile: string,
    options?: {
      title?: string;
      subtitle?: string;
      logoPath?: string;
    }
  ): Promise<void> {
    const WIDTH = 1280;
    const HEIGHT = 720;

    // フレーム画像をリサイズ
    let image = sharp(frameFile)
      .resize(WIDTH, HEIGHT, {
        fit: 'cover',
        position: 'center',
      });

    // テキストオーバーレイ用の SVG を作成
    if (options?.title || options?.subtitle) {
      const svg = this.createTextSVG(
        options.title || '',
        options.subtitle || '',
        WIDTH,
        HEIGHT
      );

      image = image.composite([
        {
          input: Buffer.from(svg),
          gravity: 'center',
        },
      ]);
    }

    // ロゴがあれば追加
    if (options?.logoPath) {
      try {
        const logoBuffer = await sharp(options.logoPath)
          .resize(150, 150, { fit: 'contain' })
          .toBuffer();

        image = image.composite([
          {
            input: logoBuffer,
            gravity: 'southeast',
            offset: { left: -20, top: -20 },
          },
        ]);
      } catch (error) {
        console.warn('Failed to add logo:', error);
      }
    }

    // 保存
    await image.toFormat('jpeg', { quality: 95 }).toFile(outputFile);
  }

  /**
   * テキストオーバーレイ用 SVG を生成
   */
  private createTextSVG(
    title: string,
    subtitle: string,
    width: number,
    height: number
  ): string {
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- 背景グラデーション（半透明） -->
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(0,0,0,0.3);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(0,0,0,0.6);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />

        <!-- タイトルテキスト -->
        <text
          x="${width / 2}"
          y="${height / 2 - 40}"
          font-size="72"
          font-weight="bold"
          text-anchor="middle"
          fill="white"
          font-family="Arial, sans-serif"
          filter="drop-shadow(3px 3px 0 rgba(0,0,0,0.8))"
        >
          ${this.escapeXml(title)}
        </text>

        <!-- サブタイトル -->
        ${subtitle ? `
        <text
          x="${width / 2}"
          y="${height / 2 + 40}"
          font-size="48"
          text-anchor="middle"
          fill="white"
          font-family="Arial, sans-serif"
          filter="drop-shadow(2px 2px 0 rgba(0,0,0,0.8))"
        >
          ${this.escapeXml(subtitle)}
        </text>
        ` : ''}
      </svg>
    `.trim();
  }

  /**
   * XML エスケープ
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 複数のサムネイル候補を生成
   */
  async generateThumbnailVariants(
    frameFile: string,
    outputDir: string,
    title: string,
    variants: Array<{ name: string; subtitle?: string }>
  ): Promise<string[]> {
    const results: string[] = [];

    for (const variant of variants) {
      const outputFile = path.join(
        outputDir,
        `thumbnail_${variant.name}.jpg`
      );

      await this.generateYouTubeThumbnail(frameFile, outputFile, {
        title,
        subtitle: variant.subtitle,
      });

      results.push(outputFile);
    }

    return results;
  }
}

export default ThumbnailGenerator.getInstance();
