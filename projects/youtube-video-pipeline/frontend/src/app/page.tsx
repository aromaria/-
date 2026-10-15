'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('ビデオファイルを選択してください');
      return;
    }

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
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
            🎬 動画配信
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            iPhone から YouTube へ自動配信
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Upload Section */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`bg-white rounded-lg shadow-md p-6 sm:p-8 border-2 border-dashed transition ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-blue-200 hover:border-blue-400'
          }`}
        >
          <div className="text-center">
            <div className="text-5xl sm:text-6xl mb-4">📹</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              ビデオをアップロード
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              iPhone で撮影した動画をドラッグ&ドロップ
            </p>

            <label className="relative cursor-pointer inline-block">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleInputChange}
                disabled={uploading}
                className="hidden"
              />
              <div className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 sm:py-3 sm:px-8 rounded-lg inline-block transition disabled:opacity-50">
                {uploading ? `アップロード中... ${progress}%` : 'ファイル選択'}
              </div>
            </label>

            {uploading && (
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {uploadedFile && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-700 font-medium text-sm sm:text-base">
                  ✅ {uploadedFile}
                </p>
                <p className="text-xs sm:text-sm text-green-600 mt-2">
                  アップロード完了。タイムラインエディタで編集してください。
                </p>
                <Link
                  href="/editor"
                  className="inline-block mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm"
                >
                  エディタを開く →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Process Steps */}
        <div className="mt-8 sm:mt-12 bg-white rounded-lg shadow-md p-6 sm:p-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
            ⚙️ 処理フロー
          </h3>
          <ol className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-700">
            <li className="flex gap-2 sm:gap-3">
              <span className="font-bold text-blue-600 min-w-6">1.</span>
              <span>iPhone で撮影した動画をアップロード</span>
            </li>
            <li className="flex gap-2 sm:gap-3">
              <span className="font-bold text-blue-600 min-w-6">2.</span>
              <span>タイムラインで不用部分をカット</span>
            </li>
            <li className="flex gap-2 sm:gap-3">
              <span className="font-bold text-blue-600 min-w-6">3.</span>
              <span>ffmpeg が自動編集（4-8時間）</span>
            </li>
            <li className="flex gap-2 sm:gap-3">
              <span className="font-bold text-blue-600 min-w-6">4.</span>
              <span>サムネイル・エンドロール自動生成</span>
            </li>
            <li className="flex gap-2 sm:gap-3">
              <span className="font-bold text-blue-600 min-w-6">5.</span>
              <span>2日後に YouTube へ自動配信</span>
            </li>
          </ol>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 sm:mt-12">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center">
            <p className="text-2xl sm:text-4xl font-bold text-blue-600">0</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
              アップロード
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center">
            <p className="text-2xl sm:text-4xl font-bold text-green-600">0</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
              処理中
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center">
            <p className="text-2xl sm:text-4xl font-bold text-purple-600">0</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
              完了
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 sm:mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 sm:p-8 text-white text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            準備完了！
          </h2>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base">
            4.5時間の動画を自動編集し、2日後に YouTube へ配信します。
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-blue-600 font-bold py-3 px-6 sm:px-8 rounded-lg hover:bg-gray-100 transition w-full sm:w-auto text-sm sm:text-base"
          >
            🚀 さっそく始める
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 safe-bottom">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center text-xs sm:text-sm text-gray-600">
          <p>🎬 YouTube 動画配信パイプライン v0.1</p>
          <p className="text-xs text-gray-500 mt-2">
            iPhone でも iPad でも PC でも完全対応
          </p>
        </div>
      </footer>
    </div>
  );
}
