import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Note自動化 SaaS',
  description: 'Claude AIでnote副業を完全自動化。テーマ提案→リサーチ→執筆→投稿',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
