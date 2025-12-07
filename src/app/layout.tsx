import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Navigation from "./_components/general/navigation";
import Footer from "./_components/general/footer";
import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "./_components/general/theme-provider";
import { ToastProvider, Toaster } from "./_components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Posaunenwerk Rheinland",
  description:
    "Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland",
  icons: [
    {
      url: "./android-chrome-192x192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      url: "./android-chrome-512x512.png",
      sizes: "512x512",
      type: "image/png",
    },
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
                    // System preference
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
        <ThemeProvider>
          <ToastProvider>
            <TRPCReactProvider>
              <Navigation />
              <main className="pt-16 lg:pt-20">{children}</main>
              <Footer />
              <Toaster />
            </TRPCReactProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
