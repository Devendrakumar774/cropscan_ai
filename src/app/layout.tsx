import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CropScan AI",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
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
          <AuthProvider>
            <ServiceWorkerRegister />
            <Navbar />
            <main className="flex-1 w-full max-w-lg md:max-w-2xl mx-auto px-3.5 py-4 sm:px-6 sm:py-5 min-w-0">
              {children}
            </main>
            <footer className="border-t border-[#2B2118]/15 bg-[#FAF6EF] py-4 px-4 text-left sm:text-center text-xs text-[#2B2118]/70">
              <p className="max-w-lg md:max-w-2xl mx-auto">
                CropScan AI &middot; Patte ki photo lo, ilaaj jaano
              </p>
            </footer>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
