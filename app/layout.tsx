import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import StoreProvider from '@/store/StoreProvider';
import { WarehouseProvider } from '@/contexts/warehouse-context';
import { Toaster } from '@/components/ui/sonner';
import { APP_CONFIG } from '@/lib/constants';

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: APP_CONFIG.APP_NAME,
  description: `${APP_CONFIG.APP_NAME} - Professional inventory management system`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={ibmPlexSans.variable}>
      <body
        className="antialiased"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <StoreProvider>
          <WarehouseProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </WarehouseProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
