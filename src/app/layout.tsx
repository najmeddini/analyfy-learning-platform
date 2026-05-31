import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'آکادمی آنالیفای',
    template: '%s | آکادمی آنالیفای',
  },
  description: 'پلتفرم یادگیری تعاملی مبتنی بر هوش مصنوعی — Analyfy Academy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
