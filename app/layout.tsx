import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nudgeable.ai',
  description: 'L&D Platform — Transform one-time training into continuous skill journeys',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
