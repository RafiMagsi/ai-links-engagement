import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Links Admin Dashboard',
  description: 'Admin dashboard for AI Links engagement automation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
