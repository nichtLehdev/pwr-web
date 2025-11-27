import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Navigation from "./_components/general/navigation";
import Footer from "./_components/general/footer";
import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "./_components/general/theme-provider";

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
                  const theme = localStorage.getItem('theme') || 
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <TRPCReactProvider>
            <Navigation />
            <main className="pt-16 lg:pt-20">{children}</main>
            <Footer />
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
