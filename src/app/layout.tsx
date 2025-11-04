
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'Attendry',
  description: 'Effortless attendance tracking',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1E40AF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
            <Toaster />
        </ThemeProvider>
         <Script id="razorpay-checkout" src="https://checkout.razorpay.com/v1/checkout.js" />
         <Script id="no-zoom" strategy="afterInteractive">
          {`
            document.addEventListener('keydown', (event) => {
              if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '-' || event.key === '0')) {
                event.preventDefault();
              }
            });
            document.addEventListener('wheel', (event) => {
              if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
              }
            }, { passive: false });
            document.addEventListener('touchmove', (event) => {
              if (event.touches.length > 1) {
                event.preventDefault();
              }
            }, { passive: false });
          `}
        </Script>
      </body>
    </html>
  );
}
