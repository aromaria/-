import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              📝 Note自動化 SaaS
            </h1>
            <p className="text-sm text-gray-600">
              Claude AIでnote副業を完全自動化
            </p>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-secondary">
              設定
            </button>
            <button className="btn btn-primary">
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-600">
          <p>© 2026 Note自動化 SaaS · Phase 0</p>
        </div>
      </footer>
    </div>
  );
}
