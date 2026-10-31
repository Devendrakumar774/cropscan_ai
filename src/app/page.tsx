"use client";

import Link from "next/link";
import { Camera, ArrowRight, History, BarChart3 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-7 py-2 text-left max-w-full overflow-hidden">
      {/* 1. HERO SECTION (Plain section, not a boxed card) */}
      <section className="space-y-5 text-left border-b border-[#2B2118]/25 pb-7">
        <div className="space-y-2">
          {/* Plain uppercase text label with no background */}
          <div className="text-xs font-bold uppercase tracking-wider text-[#2F5D3A]">
            {t("home_kisan_badge")}
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[#2B2118] tracking-tight leading-tight">
            {t("home_hero_title")}
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[#2B2118]/85 leading-relaxed font-normal">
            {t("home_hero_desc")}
          </p>
        </div>

        {/* Action Buttons: Exactly ONE solid green button */}
        <div className="pt-1 flex flex-col gap-3">
          <Link
            href="/scan"
            className="w-full min-h-[52px] h-14 flex items-center justify-center gap-3 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-lg sm:text-xl px-6 rounded-[6px] transition-colors cursor-pointer"
          >
            <Camera className="w-6 h-6 shrink-0" />
            <span>{t("home_hero_scan_cta")}</span>
            <ArrowRight className="w-5 h-5 shrink-0 ml-1 hidden xs:inline-block" />
          </Link>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <Link
              href="/history"
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border border-[#2B2118]/25 font-bold text-sm sm:text-base px-4 rounded-[6px] transition-colors"
            >
              <History className="w-4 h-4 shrink-0 text-[#2B2118]/80" />
              <span>{t("home_btn_history")}</span>
            </Link>

            <Link
              href="/dashboard"
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border border-[#2B2118]/25 font-bold text-sm sm:text-base px-4 rounded-[6px] transition-colors"
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-[#2B2118]/80" />
              <span>{t("home_btn_dashboard")}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. PESTICIDE WARNING (Warning state: 1px border, 6px radius, no icon next to heading) */}
      <section className="bg-[#B5412F]/10 border border-[#B5412F]/30 rounded-[6px] p-5 text-left space-y-1.5">
        <h2 className="font-heading text-lg sm:text-xl font-bold text-[#B5412F] leading-tight">
          {t("home_pesticide_save_title")}
        </h2>
        <p className="text-xs sm:text-sm text-[#2B2118]/90 font-medium leading-relaxed">
          {t("home_pesticide_save_desc")}
        </p>
      </section>

      {/* 3. THREE SHORT STEPS (Plain section separated by 1px line, NOT repetitive cards) */}
      <section className="space-y-4 text-left border-t border-[#2B2118]/25 pt-6">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#2B2118]">
          {t("home_steps_heading")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="space-y-2 text-left">
            <span className="text-xs font-bold text-[#2F5D3A] uppercase tracking-wider">
              Step 1
            </span>
            <h3 className="font-heading text-base sm:text-lg font-bold text-[#2B2118]">
              {t("home_step1_title")}
            </h3>
            <p className="text-xs sm:text-sm text-[#2B2118]/80 leading-relaxed">
              {t("home_step1_desc")}
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-2 text-left">
            <span className="text-xs font-bold text-[#E0A526] uppercase tracking-wider">
              Step 2
            </span>
            <h3 className="font-heading text-base sm:text-lg font-bold text-[#2B2118]">
              {t("home_step2_title")}
            </h3>
            <p className="text-xs sm:text-sm text-[#2B2118]/80 leading-relaxed">
              {t("home_step2_desc")}
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2 text-left">
            <span className="text-xs font-bold text-[#2F5D3A] uppercase tracking-wider">
              Step 3
            </span>
            <h3 className="font-heading text-base sm:text-lg font-bold text-[#2B2118]">
              {t("home_step3_title")}
            </h3>
            <p className="text-xs sm:text-sm text-[#2B2118]/80 leading-relaxed">
              {t("home_step3_desc")}
            </p>
          </div>
        </div>
      </section>

      {/* 4. TRUST HIGHLIGHTS (Plain section separated by 1px line, no icons next to headings) */}
      <section className="border-t border-[#2B2118]/25 pt-6 text-left space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-medium text-[#2B2118]/80">
          <div className="border border-[#2B2118]/25 rounded-[6px] p-3 text-center">
            <span className="font-bold text-[#2B2118]">{t("home_badge_free")}</span>
          </div>

          <div className="border border-[#2B2118]/25 rounded-[6px] p-3 text-center">
            <span className="font-bold text-[#2B2118]">{t("home_badge_languages")}</span>
          </div>

          <div className="border border-[#2B2118]/25 rounded-[6px] p-3 text-center">
            <span className="font-bold text-[#2B2118]">{t("home_badge_weather")}</span>
          </div>

          <div className="border border-[#2B2118]/25 rounded-[6px] p-3 text-center">
            <span className="font-bold text-[#2B2118]">1800-180-1551</span>
          </div>
        </div>
      </section>
    </div>
  );
}
