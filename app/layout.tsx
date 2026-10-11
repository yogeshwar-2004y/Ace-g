import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Getaway — The Card Club',
  description:
    'Good cards. Great company. Play Getaway with 3–8 friends, create a private table, or warm up with a practice round. No downloads. Just play.',
  applicationName: 'Getaway',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#101713' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
