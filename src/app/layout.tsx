
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script';
import { Poppins } from 'next/font/google';
import { cn } from '@/lib/utils';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
});


export const metadata: Metadata = {
  title: 'Saledup - Turn Foot Traffic into Loyal Customers',
  description: 'The ultimate QR code offer platform for local businesses. Create real-time deals, track engagement, and grow your customer base effortlessly.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FF4136', // Updated to match primary red color
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
            crossOrigin=""
        />
      </head>
      <body className={cn("font-body antialiased", poppins.variable)}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <FirebaseErrorListener />
            {children}
            <Toaster />
        </ThemeProvider>
         <Script id="dodo-checkout" src="https://checkout.dodo-payments.com/v1/checkout.js" />
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
