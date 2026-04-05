import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kōmori — Team Memory Graph',
  description: 'Live knowledge graph for your team',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
