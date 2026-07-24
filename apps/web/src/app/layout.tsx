import type { Metadata } from 'next';
import { Outfit, IBM_Plex_Sans } from 'next/font/google';
import { Providers } from '@/components/providers';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BOQ Pro — Construction Estimation',
  description:
    'Professional BOQ, material takeoff & rate analysis for Pakistan construction',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${ibmPlex.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
