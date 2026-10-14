import ffmpeg from 'fluent-ffmpeg';

interface EndrollOptions {
  nextEventTitle: string;
  nextEventDate: string;
  nextEventTime?: string;
  channel?: string;
  duration?: number; // 秒（デフォルト30秒）
}

export class EndrollGenerator {
  private static instance: EndrollGenerator;

  private constructor() {
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || '/usr/bin/ffmpeg');
  }

  static getInstance(): EndrollGenerator {
    if (!EndrollGenerator.instance) {
      EndrollGenerator.instance = new EndrollGenerator();
    }
    return EndrollGenerator.instance;
  }

  /**
   * 次回予告エンドロール動画を生成
   */
  async generateEndroll(
    outputFile: string,
    options: EndrollOptions
  ): Promise<void> {
    const duration = options.duration || 30; // 30秒がYouTube推奨
    const width = 1920;
    const height = 1080;

    // FFmpeg で動画を生成（カラーグラデーション背景）
    return new Promise((resolve, reject) => {
      const filterComplex = `
        color=c=0x1a1a2e:s=${width}x${height}:d=${duration}[bg];
        drawtext=
          text='次回予告':
          fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:
          fontsize=96:
          fontcolor=white:
          x=(w-text_w)/2:
          y=h/2-150:
          shadowx=3:shadowy=3[txt1];
        drawtext=
          text='${this.escapeFFmpeg(options.nextEventTitle)}':
          fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:
          fontsize=72:
          fontcolor=white:
          x=(w-text_w)/2:
          y=h/2+50:
          shadowx=2:shadowy=2[txt2];
        drawtext=
          text='📅 ${options.nextEventDate}${options.nextEventTime ? ' ' + options.nextEventTime : ''}':
          fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:
          fontsize=48:
          fontcolor=#FFD700:
          x=(w-text_w)/2:
          y=h/2+200:
          shadowx=2:shadowy=2[txt3];
        [bg][txt1]overlay[o1];
        [o1][txt2]overlay[o2];
        [o2][txt3]overlay
      `.trim();

      ffmpeg()
        .input('color=c=0x1a1a2e:s=1920x1080:d=' + duration)
        .inputOptions(`-f lavfi`)
        .outputOptions(`-filter_complex "${filterComplex}"`)
        .outputOptions('-c:v libx264')
        .outputOptions('-pix_fmt yuv420p')
        .outputOptions('-c:a aac')
        .outputOptions('-b:a 128k')
        .output(outputFile)
        .on('end', resolve)
        .on('error', reject)
        .on('progress', (progress) => {
          console.log(
            `[Endroll Generation] ${Math.round(progress.percent || 0)}%`
          );
        })
        .run();
    });
  }

  /**
   * エンドロール + 字幕を生成（簡易版）
   */
  async generateSimpleEndroll(
    outputFile: string,
    options: EndrollOptions
  ): Promise<void> {
    const duration = options.duration || 30;

    return new Promise((resolve, reject) => {
      // フレーム画像を生成
      const frameFile = outputFile.replace(/\.mp4$/, '_frame.png');

      // FFmpeg で静止画を生成
      ffmpeg()
        .input('color=c=0x000000:s=1920x1080:d=1')
        .inputOptions(`-f lavfi`)
        .output(frameFile)
        .on('end', () => {
          // 静止画から動画を生成
          ffmpeg()
            .input(frameFile)
            .inputOptions(`-loop 1`)
            .inputOptions(`-t ${duration}`)
            .output(outputFile)
            .videoCodec('libx264')
            .audioCodec('aac')
            .on('end', resolve)
            .on('error', reject)
            .run();
        })
        .on('error', reject)
        .run();
    });
  }

  /**
   * FFmpeg filter string をエスケープ
   */
  private escapeFFmpeg(str: string): string {
    return str
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  /**
   * YouTube エンドスクリーン用テキストを生成
   */
  generateEndscreenText(options: EndrollOptions): string {
    return `
次回予告
━━━━━━━━━━━━━━━━━━━━━━━━━

${options.nextEventTitle}

📅 ${options.nextEventDate}
${options.nextEventTime ? `🕐 ${options.nextEventTime}` : ''}

${options.channel ? `📢 チャンネル: ${options.channel}` : ''}

チャンネル登録のご協力をお願いします！
    `.trim();
  }
}

export default EndrollGenerator.getInstance();
