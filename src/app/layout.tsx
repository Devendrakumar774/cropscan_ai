import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CropScan AI - Crop Leaf Disease & Nutrient Detection",
  description:
    "Mobile-first crop diagnosis app for farmers to identify crop leaf diseases and nutrient deficiencies with treatment recommendations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fbfdfc] text-slate-900">
        <Navbar />
        <main className="flex-1 w-full max-w-lg md:max-w-2xl mx-auto px-4 py-6 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-emerald-100/80 bg-white py-4 text-center text-xs text-slate-500">
          <p>CropScan AI &middot; Built for Farmers</p>
        </footer>
      </body>
    </html>
  );
}
