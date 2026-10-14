'use client';

import React, { useState } from 'react';

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
      setProgress(30);
      // TODO: API 呼び出し
      // const response = await fetch('/api/upload', {
      //   method: 'POST',
      //   body: formData,
      // });

      setProgress(100);
      setUploadedFile(file.name);
      setTimeout(() => setProgress(0), 2000);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900">
            🎬 YouTube 動画配信パイプライン
          </h1>
          <p className="text-gray-600 mt-1">
            4.5時間の iPhone 撮影動画を自動編集・配信
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-8 border-2 border-dashed border-blue-200 hover:border-blue-400 transition">
            <div className="text-center">
              <div className="text-5xl mb-4">📹</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ビデオをアップロード
              </h2>
              <p className="text-gray-600 mb-6">
                iPhone で撮影した MOV/MP4 ファイルをドラッグ&ドロップ
              </p>

              <label className="relative cursor-pointer">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg inline-block transition disabled:opacity-50">
                  {uploading ? `アップロード中... ${progress}%` : 'ファイル選択'}
                </div>
              </label>

              {uploadedFile && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-700 font-medium">
                    ✅ {uploadedFile}
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    アップロード完了。次のステップに進んでください。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Process Steps */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                ⚙️ 処理フロー
              </h3>
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-6">1.</span>
                  <span>動画ファイルをアップロード</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-6">2.</span>
                  <span>タイムラインで不用部分を指定してカット</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-6">3.</span>
                  <span>ffmpeg で自動編集（バックグラウンド処理）</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-6">4.</span>
                  <span>サムネイル・エンドロール自動生成</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-blue-600 min-w-6">5.</span>
                  <span>YouTube 最適化フォーマットで出力</span>
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 ヒント:</strong> 4.5時間の動画処理には 4-8時間必要です。
                カット指定後はバックグラウンドで処理されます。
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-4xl font-bold text-blue-600">0</p>
            <p className="text-gray-600 mt-2">アップロード済み</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-4xl font-bold text-green-600">0</p>
            <p className="text-gray-600 mt-2">処理中</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-4xl font-bold text-purple-600">0</p>
            <p className="text-gray-600 mt-2">完了</p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">
            準備完了！
          </h2>
          <p className="mb-6">
            4.5時間の動画編集を始めましょう。
            <br />
            講演会2日後の配信に間に合わせます。
          </p>
          <button className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
            ビデオをアップロード →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-600">
          <p>🎬 YouTube 動画配信パイプライン v0.1 | 2日で完成</p>
        </div>
      </footer>
    </div>
  );
}
