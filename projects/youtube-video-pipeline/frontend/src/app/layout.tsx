import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouTube 動画配信パイプライン',
  description: '4.5時間の iPhone 撮影動画を自動編集・YouTube自動配信',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#2563eb',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '動画配信',
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%232563eb" width="192" height="192"/><text x="50%" y="50%" font-size="100" font-weight="bold" fill="white" text-anchor="middle" dy=".3em">🎬</text></svg>',
    apple: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect fill="%232563eb" width="180" height="180" rx="40"/><text x="50%" y="50%" font-size="90" font-weight="bold" fill="white" text-anchor="middle" dy=".3em">🎬</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="動画配信" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-white">{children}</body>
    </html>
  );
}
