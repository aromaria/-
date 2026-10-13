'use client';

import React, { useState } from 'react';

export default function DashboardPage() {
  const [background, setBackground] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [themeResult, setThemeResult] = useState<any>(null);

  const handleGenerateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/themes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            background,
            interests: interests.split(',').map(i => i.trim()),
            targetAudience: '初心者向け',
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setThemeResult(data);
      } else {
        console.error('Failed to generate theme');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          いらっしゃいませ！
        </h2>
        <p className="text-gray-600">
          このツールは、Claude AIを活用してnote副業を完全自動化します。
        </p>
      </div>

      {/* Theme Generation */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            🎯 ステップ 1: テーマ提案
          </h3>
          <form onSubmit={handleGenerateTheme} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                あなたの経歴・背景
              </label>
              <textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="例: AIが得意。5年のエンジニア経歴、データ分析も..."
                className="input h-32"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                得意分野・興味（カンマ区切り）
              </label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="例: AI, 自動化, Python, LLM"
                className="input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {loading ? '生成中...' : 'テーマを提案してもらう'}
            </button>
          </form>
        </div>

        {/* Result */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            ✨ AI提案結果
          </h3>
          {themeResult ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">テーマ</p>
                <p className="text-lg font-semibold text-gray-900">
                  {themeResult.title}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">説明</p>
                <p className="text-sm text-gray-700">
                  {themeResult.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">売上ポテンシャル</p>
                  <p className="text-xl font-bold text-blue-600">
                    {themeResult.sellPotential}/10
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">推定価格</p>
                  <p className="text-xl font-bold text-green-600">
                    ¥{themeResult.estimatedPrice?.toLocaleString()}
                  </p>
                </div>
              </div>

              <button className="btn btn-primary w-full">
                このテーマで進める →
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>テーマを生成するとここに表示されます</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-600">作成済みテーマ</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">0</p>
          <p className="text-sm text-gray-600">リサーチ実行</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-600">0</p>
          <p className="text-sm text-gray-600">記事執筆</p>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📚 次のステップ</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex gap-3">
            <span className="text-blue-600 font-bold">①</span>
            <div>
              <p className="font-medium">テーマ生成</p>
              <p className="text-gray-600">AIがあなたの経験から売れるテーマを提案します</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 font-bold">②</span>
            <div>
              <p className="font-medium">リサーチ実行</p>
              <p className="text-gray-600">YouTube、Google、Xから最新情報を自動抽出</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-600 font-bold">③</span>
            <div>
              <p className="font-medium">記事執筆</p>
              <p className="text-gray-600">リサーチ結果をもとにAIが実用的な記事を生成</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
