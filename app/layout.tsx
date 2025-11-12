import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Posaunenwerk Rheinland",
  description: "Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
        {/* Footer kommt später hier rein */}
      </body>
    </html>
  );
}