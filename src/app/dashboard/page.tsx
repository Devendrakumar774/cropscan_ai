"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { getDashboardStats, DashboardStats } from "@/lib/supabase";

export default function DashboardPage() {
  const { language, t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadStats = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!user) {
      setStats(null);
      setLoading(false);
      setErrorMsg(null);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    let isTimedOut = false;
    timerRef.current = setTimeout(() => {
      isTimedOut = true;
      setLoading(false);
      setErrorMsg(
        language === "en"
          ? "Could not load your scans in time. Please check your connection and try again."
          : "स्कैन लोड करने में समय अधिक लगा। कृपया नेटवर्क जांचें और दोबारा कोशिश करें।"
      );
    }, 8000);

    try {
      const data = await getDashboardStats(user.id);
      if (!isTimedOut) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setStats(data);
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
      if (!isTimedOut) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setErrorMsg(
          language === "en"
            ? "Could not load your scans in time. Please check your connection and try again."
            : "स्कैन लोड करने में समय अधिक लगा। कृपया नेटवर्क जांचें और दोबारा कोशिश करें।"
        );
        setLoading(false);
      }
    }
  }, [user, language]);

  useEffect(() => {
    if (!authLoading) {
      loadStats();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [authLoading, loadStats]);

  const hasScans = Boolean(user && stats && stats.totalScans > 0 && !stats.isSample);

  return (
    <div className="flex flex-col gap-6 py-2 text-left max-w-full overflow-hidden">
      {/* Page Header (No badge) */}
      <div className="space-y-1 text-left">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight">
          {t("dashboard_title")}
        </h1>
        <p className="text-sm sm:text-base text-[#2B2118]/80">
          {t("dashboard_subtitle")}
        </p>
      </div>

      {/* Short Loading Line (Never a blank skeleton) */}
      {loading ? (
        <div className="py-6 flex items-center gap-2 text-sm text-[#2B2118]/80 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#2F5D3A] shrink-0" />
          <span>{t("dashboard_loading")}</span>
        </div>
      ) : errorMsg ? (
        /* Error with Retry Button after 8 seconds */
        <div className="bg-[#B5412F]/10 border border-[#B5412F]/40 text-[#B5412F] rounded-[8px] p-4 sm:p-5 space-y-3 text-left">
          <p className="text-sm font-semibold leading-relaxed">{errorMsg}</p>
          <div>
            <button
              type="button"
              onClick={() => loadStats()}
              className="min-h-[44px] px-4 py-2 bg-[#B5412F] hover:bg-[#9c3625] text-white font-bold text-xs sm:text-sm rounded-[6px] transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t("dashboard_retry")}</span>
            </button>
          </div>
        </div>
      ) : !hasScans ? (
        /* Plain Empty State for logged out or 0 scans */
        <div className="bg-white rounded-[8px] p-6 sm:p-7 border border-[#2B2118]/15 space-y-4 text-left">
          <p className="text-sm sm:text-base text-[#2B2118]/90 font-medium leading-relaxed">
            {t("dashboard_empty_text")}
          </p>
          <div>
            <Link
              href="/scan"
              className="inline-flex items-center justify-center gap-2 bg-[#2F5D3A] hover:bg-[#24492D] text-[#F6F1E7] font-bold text-sm min-h-[44px] px-5 rounded-[8px] transition-colors cursor-pointer"
            >
              <span>{t("dashboard_empty_cta")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : stats ? (
        /* Real Supabase Data Content */
        <div className="flex flex-col gap-6">
          {/* One plain row of four numbers separated by thin vertical lines */}
          <div className="bg-white rounded-[8px] border border-[#2B2118]/15 p-4 sm:p-5">
            <div className="grid grid-cols-4 divide-x divide-[#2B2118]/15 text-center">
              <div className="px-1 sm:px-3">
                <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118]">
                  {stats.totalScans}
                </div>
                <div className="text-[11px] sm:text-xs text-[#2B2118]/70 font-medium mt-0.5 truncate">
                  {t("dashboard_stat_total")}
                </div>
              </div>

              <div className="px-1 sm:px-3">
                <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118]">
                  {stats.diseaseCount}
                </div>
                <div className="text-[11px] sm:text-xs text-[#2B2118]/70 font-medium mt-0.5 truncate">
                  {t("dashboard_stat_diseases")}
                </div>
              </div>

              <div className="px-1 sm:px-3">
                <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118]">
                  {stats.pestCount + stats.deficiencyCount}
                </div>
                <div className="text-[11px] sm:text-xs text-[#2B2118]/70 font-medium mt-0.5 truncate">
                  {t("dashboard_stat_pests")}
                </div>
              </div>

              <div className="px-1 sm:px-3">
                <div className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118]">
                  {stats.healthyCount}
                </div>
                <div className="text-[11px] sm:text-xs text-[#2B2118]/70 font-medium mt-0.5 truncate">
                  {t("dashboard_stat_healthy")}
                </div>
              </div>
            </div>
          </div>

          {/* Top 5 Problems: simple horizontal bar list in one color */}
          {stats.topProblems && stats.topProblems.length > 0 && (
            <div className="bg-white rounded-[8px] p-5 border border-[#2B2118]/15 space-y-4 text-left">
              <h2 className="font-heading text-base sm:text-lg font-bold text-[#2B2118]">
                {t("dashboard_top_problems_title")}
              </h2>

              <div className="space-y-3.5">
                {stats.topProblems.map((prob, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[#2B2118] truncate pr-3">
                        {prob.name}
                      </span>
                      <span className="font-bold text-xs text-[#2B2118]/80 shrink-0">
                        {prob.count}
                      </span>
                    </div>
                    <div className="w-full bg-[#2B2118]/10 h-2 rounded-[2px] overflow-hidden">
                      <div
                        className="h-full bg-[#2F5D3A] rounded-[2px] transition-all duration-500"
                        style={{ width: `${Math.max(4, prob.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scans by Crop: simple horizontal bar list in one color */}
          {stats.scansByCrop && stats.scansByCrop.length > 0 && (
            <div className="bg-white rounded-[8px] p-5 border border-[#2B2118]/15 space-y-4 text-left">
              <h2 className="font-heading text-base sm:text-lg font-bold text-[#2B2118]">
                {t("dashboard_crops_title")}
              </h2>

              <div className="space-y-3.5">
                {stats.scansByCrop.map((cropItem, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[#2B2118] truncate pr-3">
                        {cropItem.crop}
                      </span>
                      <span className="font-bold text-xs text-[#2B2118]/80 shrink-0">
                        {cropItem.count}
                      </span>
                    </div>
                    <div className="w-full bg-[#2B2118]/10 h-2 rounded-[2px] overflow-hidden">
                      <div
                        className="h-full bg-[#2F5D3A] rounded-[2px] transition-all duration-500"
                        style={{ width: `${Math.max(4, cropItem.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action CTA */}
          <div className="pt-1">
            <Link
              href="/scan"
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base px-6 rounded-[8px] transition-colors cursor-pointer"
            >
              <span>{t("dashboard_btn_scan")}</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
