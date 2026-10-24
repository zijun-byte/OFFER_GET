import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Offer GET',
  description: '大学生求职前准备工作台',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
