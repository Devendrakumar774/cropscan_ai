"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  History,
  Camera,
  ArrowLeft,
  Trash2,
  Calendar,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  LogIn,
  UserPlus,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { getScanHistory, deleteScanRecord, ScanRecord } from "@/lib/supabase";

function HistoryLoadingSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-[8px] p-4 sm:p-5 border border-[#2B2118]/15 shadow-xs flex flex-col sm:flex-row gap-4 items-start animate-pulse"
        >
          <div className="w-full sm:w-24 h-36 sm:h-24 rounded-[6px] bg-[#2B2118]/10 shrink-0 self-center sm:self-start" />
          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="h-5 w-20 bg-[#2B2118]/10 rounded" />
              <div className="h-4 w-28 bg-[#2B2118]/10 rounded" />
            </div>
            <div className="h-6 w-3/4 bg-[#2B2118]/15 rounded" />
            <div className="h-4 w-1/2 bg-[#2B2118]/10 rounded" />
            <div className="h-8 w-28 bg-[#2B2118]/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const { language, t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadScans = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const records = await getScanHistory(user.id);
      setScans(records);
    } catch (err: unknown) {
      console.error("Failed to load history:", err);
      setErrorMsg(
        language === "en"
          ? "Unable to connect to database. Please check your connection and try again."
          : "डेटाबेस से जुड़ने में समस्या आई। कृपया नेटवर्क चेक करें और दोबारा कोशिश करें।"
      );
    } finally {
      setLoading(false);
    }
  }, [user, language]);

  useEffect(() => {
    if (!authLoading) {
      loadScans();
    }
  }, [authLoading, loadScans]);

  const handleOpenResult = (scan: ScanRecord) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "cropscan_last_result",
        JSON.stringify({
          ...scan.result_json,
          imagePreview: scan.image_url,
          crop: scan.crop,
          language: language,
          scanId: scan.id,
        })
      );
    }
    router.push("/result");
  };

  const handleDeleteScan = async (id: string, imageUrl: string | null) => {
    setDeletingId(id);
    try {
      await deleteScanRecord(id, imageUrl, user?.id);
      setScans((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
      setNotice(
        language === "en"
          ? "Scan removed from history."
          : "स्कैन इतिहास से हटा दिया गया है।"
      );
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error("Failed to delete scan:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const getBadgeStyle = (scan: ScanRecord) => {
    if (scan.result_json && scan.result_json.is_plant === false) {
      return {
        bg: "bg-[#2B2118]/15 text-[#2B2118] border border-[#2B2118]/30",
        label: t("result_badge_not_plant"),
      };
    }

    switch (scan.problem_type) {
      case "disease":
        return {
          bg: "bg-[#B5412F] text-white",
          label: t("result_badge_disease"),
        };
      case "pest":
        return {
          bg: "bg-[#E0A526] text-[#2B2118]",
          label: t("result_badge_pest"),
        };
      case "nutrient_deficiency":
        return {
          bg: "bg-[#E0A526]/20 text-[#2B2118] border border-[#E0A526]",
          label: t("result_badge_deficiency"),
        };
      case "healthy":
      default:
        return {
          bg: "bg-[#2F5D3A] text-white",
          label: t("result_badge_healthy"),
        };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(language === "en" ? "en-US" : "hi-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-5 py-2 text-left max-w-full overflow-hidden">
      {/* Header */}
      <div className="space-y-1 text-left">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight">
          {t("history_title")}
        </h1>
        <p className="text-sm sm:text-base text-[#2B2118]/85">{t("history_subtitle")}</p>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="bg-[#2F5D3A]/10 border border-[#2F5D3A] text-[#2F5D3A] rounded-[8px] p-3 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Auth Gate: Unauthenticated User */}
      {!authLoading && !user ? (
        <div className="bg-white rounded-[6px] p-6 sm:p-7 border border-[#2B2118]/25 flex flex-col gap-5 text-left">
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-bold text-[#2B2118]">
              {t("history_login_required_title")}
            </h2>
            <p className="text-sm sm:text-base text-[#2B2118]/85 leading-relaxed">
              {t("history_login_required_desc")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link
              href="/login?redirect=/history"
              className="flex-1 min-h-[48px] h-12 flex items-center justify-center gap-2 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base px-6 rounded-[6px] transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>{t("history_btn_login")}</span>
            </Link>

            <Link
              href="/signup?redirect=/history"
              className="flex-1 min-h-[48px] h-12 flex items-center justify-center gap-2 bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border border-[#2B2118]/25 font-bold text-base px-6 rounded-[6px] transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0 text-[#2B2118]/80" />
              <span>{t("history_btn_signup")}</span>
            </Link>
          </div>

          <div className="border-t border-[#2B2118]/15 pt-3">
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#2F5D3A] hover:underline"
            >
              <span>{t("history_btn_scan_guest")} &rarr;</span>
            </Link>
          </div>
        </div>
      ) : authLoading || loading ? (
        /* Friendly Loading Skeletons */
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2F5D3A] pb-1">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>
              {language === "en"
                ? "Loading past scans..."
                : "पुराने स्कैन लोड हो रहे हैं..."}
            </span>
          </div>
          <HistoryLoadingSkeletons />
        </div>
      ) : errorMsg ? (
        /* Friendly Error State */
        <div className="bg-[#B5412F]/10 border border-[#B5412F]/40 rounded-[6px] p-5 sm:p-6 flex flex-col gap-3 text-left">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-bold text-[#B5412F]">
              {language === "en" ? "Unable to load scan history" : "इतिहास लोड करने में समस्या आई"}
            </h2>
            <p className="text-sm text-[#2B2118]/85 leading-relaxed font-medium">
              {errorMsg}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => loadScans()}
              className="min-h-[44px] h-11 inline-flex items-center justify-center gap-2 bg-[#B5412F] hover:bg-[#9c3625] text-white font-bold text-sm px-5 rounded-[6px] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>{language === "en" ? "Try Again" : "दोबारा कोशिश करें"}</span>
            </button>
          </div>
        </div>
      ) : scans.length === 0 ? (
        /* Friendly & Inviting Empty State (No icon box, flat 6px card) */
        <div className="bg-white rounded-[6px] p-6 sm:p-7 border border-[#2B2118]/25 flex flex-col gap-4 text-left">
          <div className="space-y-1">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#2B2118]">
              {t("history_empty_title")}
            </h2>
            <p className="text-sm text-[#2B2118]/80 leading-relaxed font-normal">
              {t("history_empty_desc")}
            </p>
          </div>

          <div className="border border-[#2B2118]/15 rounded-[6px] p-3.5 space-y-2 text-xs sm:text-sm text-[#2B2118]">
            <p className="font-bold text-[#2F5D3A]">
              {language === "en" ? "Benefits of saving your scans:" : "स्कैन सहेजने के फायदे:"}
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-[#2B2118]/85">
              <li>{language === "en" ? "Keep track of crop problems across seasons" : "हर मौसम में फसल की बीमारी का हिसाब रखें"}</li>
              <li>{language === "en" ? "See cheap home remedies whenever you need" : "सस्ते घरेलू नुस्खे जब चाहें तब देखें"}</li>
              <li>{language === "en" ? "Show past records to local farm officers" : "कृषि अधिकारी को पुराना रिकॉर्ड दिखाएं"}</li>
            </ul>
          </div>

          <div className="pt-2">
            <Link
              href="/scan"
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2.5 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base px-6 rounded-[6px] transition-colors focus:outline-hidden cursor-pointer"
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span>{t("history_btn_new")}</span>
            </Link>
          </div>
        </div>
      ) : (
        /* List of Saved Scans (Clean divided list, Rule 4) */
        <div className="bg-white rounded-[6px] border border-[#2B2118]/25 divide-y divide-[#2B2118]/15 overflow-hidden">
          {scans.map((scan) => {
            const badge = getBadgeStyle(scan);
            const isConfirming = confirmDeleteId === scan.id;

            return (
              <div
                key={scan.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start text-left transition-colors hover:bg-[#2B2118]/2"
              >
                {/* Thumbnail */}
                <div
                  onClick={() => handleOpenResult(scan)}
                  className="w-full sm:w-28 h-36 sm:h-28 rounded-[6px] bg-[#FAF6EF] border border-[#2B2118]/15 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer relative group"
                >
                  {scan.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={scan.image_url}
                      alt={scan.problem_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#2B2118]/50 gap-1 p-2">
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px] text-center font-bold">No photo</span>
                    </div>
                  )}
                </div>

                {/* Main Scan Details */}
                <div className="flex-1 min-w-0 space-y-2 w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[4px] ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                    <div className="text-xs text-[#2B2118]/70 font-semibold">
                      <span>{formatDate(scan.created_at)}</span>
                    </div>
                  </div>

                  <div
                    onClick={() => handleOpenResult(scan)}
                    className="cursor-pointer group"
                  >
                    <h2 className="font-heading text-lg sm:text-xl font-bold text-[#2B2118] group-hover:text-[#2F5D3A] transition-colors truncate">
                      {scan.problem_name}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#2B2118]/80 font-medium">
                      Crop: {scan.crop} &middot; Sureness: {scan.confidence}%
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#2B2118]/10 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleOpenResult(scan)}
                      className="text-[#2F5D3A] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>{language === "en" ? "View Diagnosis" : "जांच व इलाज देखें"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {isConfirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[#B5412F] text-[11px]">
                          {language === "en" ? "Delete?" : "हटाएं?"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteScan(scan.id, scan.image_url)}
                          disabled={deletingId === scan.id}
                          className="px-2 py-1 bg-[#B5412F] text-white rounded text-[11px] hover:bg-[#9c3625] cursor-pointer"
                        >
                          {deletingId === scan.id ? "..." : language === "en" ? "Yes" : "हाँ"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-[#2B2118]/70 hover:text-[#2B2118] text-[11px] cursor-pointer"
                        >
                          {language === "en" ? "No" : "नहीं"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(scan.id)}
                        className="text-[#2B2118]/50 hover:text-[#B5412F] transition-colors cursor-pointer p-1"
                        title={language === "en" ? "Delete scan" : "स्कैन हटाएं"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom CTA: Plain text link (Rule 6) */}
      <div className="pt-2 text-left">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2B2118]/80 hover:text-[#2B2118] underline"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-[#2B2118]/70" />
          <span>{t("history_btn_home")}</span>
        </Link>
      </div>
    </div>
  );
}
