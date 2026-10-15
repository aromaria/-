'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Cut {
  id: string;
  startTime: number;
  endTime: number;
}

export default function EditorPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ビデオファイルが変更された時
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = url;
      }
    }
  };

  // ビデオメタデータが読み込まれた時
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // 時刻が更新された時
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // カット開始
  const handleAddCutStart = () => {
    const newCut: Cut = {
      id: `cut_${Date.now()}`,
      startTime: currentTime,
      endTime: currentTime + 60, // デフォルト60秒
    };
    setCuts([...cuts, newCut]);
  };

  // カット削除
  const handleDeleteCut = (id: string) => {
    setCuts(cuts.filter((cut) => cut.id !== id));
  };

  // カット時間更新
  const handleUpdateCut = (id: string, startTime: number, endTime: number) => {
    setCuts(
      cuts.map((cut) =>
        cut.id === id ? { ...cut, startTime, endTime } : cut
      )
    );
  };

  // 処理開始
  const handleStartProcessing = async () => {
    if (!videoFile || cuts.length === 0) {
      alert('ビデオファイルとカット情報を指定してください');
      return;
    }

    setProcessing(true);

    try {
      // TODO: API 呼び出し
      // const response = await fetch('/api/video/process', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ cuts }),
      // });

      // 処理シミュレーション
      setTimeout(() => {
        alert('✅ 処理開始！バックグラウンドで編集中...');
        setProcessing(false);
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg sm:text-3xl font-bold text-gray-900">
              ✂️ エディタ
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
              タイムラインでカット指定
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
                  ビデオファイル
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {videoFile && (
                <div>
                  {/* ビデオプレイヤー */}
                  <div className="bg-black rounded-lg overflow-hidden mb-4 aspect-video">
                    <video
                      ref={videoRef}
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full h-full bg-black"
                      controls
                      playsInline
                    />
                  </div>

                  {/* 再生情報 */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-600">現在時刻</p>
                      <p className="text-lg sm:text-2xl font-bold text-blue-600">
                        {formatTime(currentTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">総時間</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">
                        {formatTime(duration)}
                      </p>
                    </div>
                  </div>

                  {/* コントロール */}
                  <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                    <button
                      onClick={handleAddCutStart}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition text-sm sm:text-base"
                    >
                      ➕ カット指定
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cuts Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
                📋 カット指定（{cuts.length}個）
              </h2>

              {cuts.length === 0 ? (
                <p className="text-gray-500 text-xs sm:text-sm">
                  カットを追加すると、ここに表示されます
                </p>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto mb-4">
                  {cuts.map((cut, index) => (
                    <div
                      key={cut.id}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm sm:text-base text-blue-900">
                          カット {index + 1}
                        </p>
                        <button
                          onClick={() => handleDeleteCut(cut.id)}
                          className="text-red-600 hover:text-red-700 text-sm ml-2"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm">
                        <div>
                          <label className="text-gray-700">開始</label>
                          <input
                            type="number"
                            step="0.1"
                            value={cut.startTime}
                            onChange={(e) =>
                              handleUpdateCut(
                                cut.id,
                                parseFloat(e.target.value),
                                cut.endTime
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-gray-700">終了</label>
                          <input
                            type="number"
                            step="0.1"
                            value={cut.endTime}
                            onChange={(e) =>
                              handleUpdateCut(
                                cut.id,
                                cut.startTime,
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                        <p className="text-gray-600 text-xs">
                          期間: {formatTime(cut.endTime - cut.startTime)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 処理開始ボタン */}
              <button
                onClick={handleStartProcessing}
                disabled={!videoFile || cuts.length === 0 || processing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition text-sm sm:text-base"
              >
                {processing ? '処理中...' : '🚀 処理開始'}
              </button>

              <p className="text-xs text-gray-500 mt-3 sm:mt-4 text-center">
                4-8時間でバックグラウンド処理
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
