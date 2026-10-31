"use client";

import Link from "next/link";
import { Camera, History, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-6 py-2 text-left">
      {/* Main Greeting Card */}
      <section className="bg-white rounded-[8px] p-6 border border-[#2B2118]/15 shadow-xs text-left space-y-4">
        <div className="space-y-2">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#2F5D3A] bg-[#2F5D3A]/10 px-2.5 py-1 rounded-[6px]">
            {t("home_kisan_badge")}
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight leading-tight">
            {t("home_hero_title")}
          </h1>
          <p className="text-base sm:text-lg text-[#2B2118]/85 leading-relaxed">
            {t("home_hero_desc")}
          </p>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex flex-col gap-3">
          <Link
            href="/scan"
            className="w-full min-h-[48px] h-13 flex items-center justify-center gap-3 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-lg px-6 rounded-[8px] transition-colors focus:outline-hidden"
          >
            <Camera className="w-5 h-5 shrink-0" />
            <span>{t("home_btn_scan")}</span>
          </Link>

          <Link
            href="/history"
            className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 bg-[#FAF6EF] hover:bg-[#F2EBE0] active:bg-[#EAE1D3] text-[#2B2118] border border-[#2B2118]/25 font-bold text-base px-6 rounded-[8px] transition-colors focus:outline-hidden"
          >
            <History className="w-5 h-5 shrink-0 text-[#2B2118]/80" />
            <span>{t("home_btn_history")}</span>
          </Link>
        </div>
      </section>

      {/* Step by Step Guide */}
      <section className="space-y-3 text-left">
        <h2 className="font-heading text-lg font-bold text-[#2B2118]">
          {t("home_how_it_works")}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white rounded-[8px] p-4 border border-[#2B2118]/15 shadow-xs text-left">
            <h3 className="font-heading text-base font-bold text-[#2F5D3A] mb-1">
              {t("home_step1_title")}
            </h3>
            <p className="text-sm text-[#2B2118]/85 leading-normal">
              {t("home_step1_desc")}
            </p>
          </div>

          <div className="bg-white rounded-[8px] p-4 border border-[#2B2118]/15 shadow-xs text-left">
            <h3 className="font-heading text-base font-bold text-[#2F5D3A] mb-1">
              {t("home_step2_title")}
            </h3>
            <p className="text-sm text-[#2B2118]/85 leading-normal">
              {t("home_step2_desc")}
            </p>
          </div>

          <div className="bg-white rounded-[8px] p-4 border border-[#2B2118]/15 shadow-xs text-left">
            <h3 className="font-heading text-base font-bold text-[#2F5D3A] mb-1">
              {t("home_step3_title")}
            </h3>
            <p className="text-sm text-[#2B2118]/85 leading-normal">
              {t("home_step3_desc")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
