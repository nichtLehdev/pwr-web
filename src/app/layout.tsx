import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Navigation from "./_components/general/navigation";
import Footer from "./_components/general/footer";
import { TRPCReactProvider } from "@/trpc/react";

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
    <html lang="de" className="scroll-smooth">
      <body className={inter.className}>
        <TRPCReactProvider>
          <Navigation />
          <main className="pt-16 lg:pt-20">{children}</main>
          <Footer />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
