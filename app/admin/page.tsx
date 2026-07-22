import type { Metadata } from 'next';
import AdminWorkbench from './AdminWorkbench';

export const metadata: Metadata = {
  title: '后台工作台',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminWorkbench />;
}
