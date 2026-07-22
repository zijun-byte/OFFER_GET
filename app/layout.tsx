import type { Metadata } from 'next';
import BlobCursor from './components/BlobCursor';
import './globals.css';

export const metadata: Metadata = {
  title: 'Offer_GET',
  description: '大学生求职前准备工作台',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <BlobCursor />
        {children}
      </body>
    </html>
  );
}
