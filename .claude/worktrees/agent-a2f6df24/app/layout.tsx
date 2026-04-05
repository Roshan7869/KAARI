import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import Navbar from "@/components/Navbar";
import KaariFooter from "@/components/KaariFooter";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kaari Marketplace - Handmade Crochet Products",
  description: "Discover unique handmade crochet products crafted with love. Shop custom designs, artisanal crafts, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <KaariFooter />
        </Providers>
      </body>
    </html>
  );
}
