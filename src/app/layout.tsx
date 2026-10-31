import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const notoSans = Noto_Sans({
  variable: "--font-body",
  subsets: ["latin", "devanagari"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CropScan AI - Patte ki photo lo, ilaaj jaano",
  description:
    "Kisan bhaiyo ke liye aasan tarika: patte ki photo khinchein, bimari aur kami pehchanein aur sahi ilaaj jaanein.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2F5D3A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="hi"
      className={`${fraunces.variable} ${notoSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F6F1E7] text-[#2B2118]">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-lg md:max-w-2xl mx-auto px-4 py-5 sm:px-6">
            {children}
          </main>
          <footer className="border-t border-[#2B2118]/15 bg-[#FAF6EF] py-4 px-4 text-left sm:text-center text-xs text-[#2B2118]/70">
            <p className="max-w-lg md:max-w-2xl mx-auto">
              CropScan AI &middot; Patte ki photo lo, ilaaj jaano
            </p>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
