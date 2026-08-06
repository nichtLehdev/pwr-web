import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { AppChrome } from "./_components/general/app-chrome";
import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "./_components/general/theme-provider";
import { ThemeSync } from "./_components/general/theme-sync";
import { ToastProvider, Toaster } from "./_components/ui/toast";
import { BannerProvider } from "./_components/ui/banner-context";
import { PageViewTracker } from "./_components/stats/page-view-tracker";
import { TrackingConsentProvider } from "./_components/stats/tracking-consent-context";
import { ServiceWorkerRegistration } from "./_components/pwa/service-worker-registration";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Posaunenwerk Rheinland",
  description:
    "Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland",
  icons: {
    icon: [
      {
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Posaunenwerk",
    statusBarStyle: "default",
  },
};

/**
 * `viewportFit: "cover"` aktiviert `env(safe-area-inset-*)` auf iOS —
 * Spiele-Dock, Kopfleisten und Navigation reservieren damit Notch/Home-Bereich.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1419" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const root = document.documentElement;

                  if (theme === 'dark') {
                    root.classList.add('dark');
                  } else if (theme === 'light') {
                    root.classList.add('light');
                  } else {
                    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                      ? 'dark'
                      : 'light';
                    root.classList.add(systemTheme);
                  }
                } catch (e) {
                  console.error('Theme initialization error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <ToastProvider>
            <TRPCReactProvider>
              <ThemeSync />
              <TrackingConsentProvider>
                <PageViewTracker />
                <BannerProvider>
                  <AppChrome>{children}</AppChrome>
                </BannerProvider>
              </TrackingConsentProvider>
              <Toaster />
            </TRPCReactProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
