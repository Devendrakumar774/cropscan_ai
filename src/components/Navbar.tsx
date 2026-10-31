"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sprout, Menu, X, Home, Camera, FileText, History, Globe, User as UserIcon, LogOut, LogIn, BarChart3 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LANGUAGES, LanguageCode } from "@/lib/translations";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, userName, signOut } = useAuth();

  const NAV_ITEMS = [
    { href: "/", labelKey: "nav_home", icon: Home },
    { href: "/scan", labelKey: "nav_scan", icon: Camera },
    { href: "/result", labelKey: "nav_result", icon: FileText },
    { href: "/history", labelKey: "nav_history", icon: History },
    { href: "/dashboard", labelKey: "nav_dashboard", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FAF6EF] border-b border-[#2B2118]/15">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo & Name */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 text-[#2F5D3A] hover:opacity-90 transition-opacity min-w-0"
          >
            <Sprout className="w-7 h-7 sm:w-8 sm:h-8 text-[#2F5D3A] shrink-0" />
            <div className="flex flex-col text-left min-w-0">
              <span className="font-heading font-bold text-lg sm:text-xl leading-none text-[#2F5D3A] truncate">
                {t("app_title")}
              </span>
              <span className="text-[11px] font-semibold text-[#2B2118]/75 mt-1 hidden sm:block truncate">
                {t("tagline")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation & Language Dropdown */}
          <div className="hidden md:flex items-center gap-3">
            <nav className="flex items-center gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm font-bold transition-colors ${isActive
                      ? "bg-[#2F5D3A] text-[#F6F1E7]"
                      : "text-[#2B2118] hover:bg-[#2B2118]/8"
                      }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Language Selector (Desktop) */}
            <div className="flex items-center gap-1.5 bg-white border border-[#2B2118]/25 rounded-[8px] px-2.5 py-1.5">
              <Globe className="w-4 h-4 text-[#2F5D3A] shrink-0" />
              <select
                aria-label="Select Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-xs font-bold text-[#2B2118] outline-hidden cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label} ({lang.nameInEnglish})
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Auth Controls */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-[#2B2118]/15">
                <div
                  className="flex items-center gap-1.5 bg-[#FAF6EF] border border-[#2B2118]/20 px-2.5 py-1.5 rounded-[8px] text-xs font-bold text-[#2B2118] max-w-[140px] truncate"
                  title={userName || user.email || ""}
                >
                  <UserIcon className="w-3.5 h-3.5 text-[#2F5D3A] shrink-0" />
                  <span className="truncate">{userName || "Kisan"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-bold text-[#B5412F] hover:bg-[#B5412F]/10 border border-[#B5412F]/30 transition-colors cursor-pointer"
                  title={t("nav_logout")}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("nav_logout")}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-[#2F5D3A] hover:bg-[#24492D] text-[#F6F1E7] px-3.5 py-2 rounded-[8px] text-xs font-bold transition-colors cursor-pointer ml-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t("nav_login")}</span>
              </Link>
            )}
          </div>

          {/* Mobile Right Controls: Language Selector & Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-[#2B2118]/25 rounded-[8px] px-2 py-1.5">
              <Globe className="w-3.5 h-3.5 text-[#2F5D3A] shrink-0" />
              <select
                aria-label="Select Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-xs font-bold text-[#2B2118] outline-hidden cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center min-h-[48px] min-w-[48px] p-2.5 rounded-[8px] text-[#2B2118] hover:bg-[#2B2118]/8 cursor-pointer focus:outline-hidden"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-7 h-7 text-[#2B2118]" />
              ) : (
                <Menu className="w-7 h-7 text-[#2B2118]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2B2118]/15 bg-[#FAF6EF] px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-[8px] text-base font-bold text-left transition-colors min-h-[48px] ${isActive
                  ? "bg-[#2F5D3A] text-[#F6F1E7]"
                  : "text-[#2B2118] hover:bg-[#2B2118]/8"
                  }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}

          {/* Mobile Auth Button */}
          <div className="pt-2 mt-2 border-t border-[#2B2118]/15">
            {user ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#2B2118]/80 bg-white border border-[#2B2118]/20 rounded-[8px]">
                  <UserIcon className="w-4 h-4 text-[#2F5D3A]" />
                  <span className="truncate">{userName || user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] text-base font-bold text-[#B5412F] bg-white border border-[#B5412F]/40 hover:bg-[#B5412F]/10 transition-colors min-h-[48px] cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t("nav_logout")}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[8px] text-base font-bold bg-[#2F5D3A] text-[#F6F1E7] hover:bg-[#24492D] transition-colors min-h-[48px]"
              >
                <LogIn className="w-5 h-5" />
                <span>{t("nav_login")} / {t("nav_signup")}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
