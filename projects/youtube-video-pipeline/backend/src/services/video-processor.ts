import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CutSegment {
  startTime: number; // 秒
  endTime: number;   // 秒
}

interface ProcessOptions {
  inputFile: string;
  outputFile: string;
  cuts: CutSegment[];
}

export class VideoProcessor {
  private static instance: VideoProcessor;

  private constructor() {
    // ffmpeg パスを設定（システムにインストール済みと仮定）
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || '/usr/bin/ffmpeg');
    ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || '/usr/bin/ffprobe');
  }

  static getInstance(): VideoProcessor {
    if (!VideoProcessor.instance) {
      VideoProcessor.instance = new VideoProcessor();
    }
    return VideoProcessor.instance;
  }

  /**
   * 動画情報を取得
   */
  async getVideoInfo(inputFile: string): Promise<{
    duration: number;
    width: number;
    height: number;
    bitrate: string;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputFile, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const stream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!stream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: stream.width || 0,
          height: stream.height || 0,
          bitrate: metadata.format.bit_rate || '0',
        });
      });
    });
  }

  /**
   * 複数のセグメントを結合（カット後）
   */
  async mergeSegments(
    segments: string[],
    outputFile: string
  ): Promise<void> {
    // concat demuxer を使用
    const concatFile = outputFile.replace(/\.mp4$/, '_concat.txt');

    // concat ファイルを作成
    const concatContent = segments
      .map((segment) => `file '${segment}'`)
      .join('\n');

    await fs.writeFile(concatFile, concatContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`concat:${segments.join('|')}`)
        .outputOptions('-c copy') // コーデック再エンコード不要
        .output(outputFile)
        .on('end', () => {
          fs.unlink(concatFile).catch(console.error);
          resolve();
        })
        .on('error', (err) => {
          fs.unlink(concatFile).catch(console.error);
          reject(err);
        })
        .run();
    });
  }

  /**
   * 動画をカット（複数セグメント抽出）
   */
  async cutVideo(
    inputFile: string,
    cuts: CutSegment[],
    outputDir: string
  ): Promise<string[]> {
    const segments: string[] = [];

    for (let i = 0; i < cuts.length; i++) {
      const cut = cuts[i];
      const segmentFile = path.join(
        outputDir,
        `segment_${i}.mp4`
      );

      await this.extractSegment(
        inputFile,
        cut.startTime,
        cut.endTime,
        segmentFile
      );

      segments.push(segmentFile);
    }

    return segments;
  }

  /**
   * 動画の特定区間を抽出
   */
  private extractSegment(
    inputFile: string,
    startTime: number,
    endTime: number,
    outputFile: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputFile)
        .inputOptions(`-ss ${startTime}`)
        .outputOptions(`-to ${endTime - startTime}`)
        .outputOptions('-c copy') // 再エンコード不要
        .output(outputFile)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * 動画をYouTube最適化フォーマットに変換
   */
  async optimizeForYouTube(
    inputFile: string,
    outputFile: string,
    options?: {
      width?: number;
      height?: number;
      bitrate?: string;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputFile)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions('-crf 23') // 品質レベル（18-28、デフォルト23）
        .outputOptions('-preset medium') // エンコード速度
        .videoFilter(`scale=${options?.width || 1920}:${options?.height || 1080}`)
        .output(outputFile)
        .on('end', resolve)
        .on('error', reject)
        .on('progress', (progress) => {
          console.log(`[Video Encoding] ${Math.round(progress.percent || 0)}%`);
        })
        .run();
    });
  }

  /**
   * サムネイル画像を抽出
   */
  async extractThumbnail(
    inputFile: string,
    outputFile: string,
    timeSeconds: number,
    width: number = 1280,
    height: number = 720
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputFile)
        .seekInput(timeSeconds)
        .outputOptions('-vframes 1')
        .videoFilter(`scale=${width}:${height}`)
        .output(outputFile)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  /**
   * 動画情報を取得（タイムラインプレビュー用）
   */
  async generateVideoPreview(
    inputFile: string,
    outputDir: string,
    intervalSeconds: number = 60
  ): Promise<string[]> {
    const info = await this.getVideoInfo(inputFile);
    const frameCount = Math.ceil(info.duration / intervalSeconds);
    const frames: string[] = [];

    for (let i = 0; i < frameCount; i++) {
      const time = i * intervalSeconds;
      const frameFile = path.join(
        outputDir,
        `preview_${i}.jpg`
      );

      await this.extractThumbnail(inputFile, frameFile, time, 160, 90);
      frames.push(frameFile);
    }

    return frames;
  }
}

export default VideoProcessor.getInstance();
