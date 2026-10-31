"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { getScanHistory, deleteScanRecord, ScanRecord } from "@/lib/supabase";
import type { CropDiagnosisResult } from "@/app/api/analyze/route";

export default function HistoryPage() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadScans() {
      try {
        setLoading(true);
        const records = await getScanHistory();
        setScans(records);
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadScans();
  }, []);

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
      await deleteScanRecord(id, imageUrl);
      setScans((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
      setNotice(
        language === "en"
          ? "Scan removed from history."
          : "Scan history se hata diya gaya hai."
      );
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error("Failed to delete scan:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const getBadgeStyle = (type: CropDiagnosisResult["problem_type"]) => {
    switch (type) {
      case "disease":
        return {
          bg: "bg-[#B5412F] text-white",
          label: language === "en" ? "Disease" : "Disease / Bimari",
        };
      case "pest":
        return {
          bg: "bg-[#E0A526] text-[#2B2118]",
          label: language === "en" ? "Pest" : "Pest / Kida",
        };
      case "nutrient_deficiency":
        return {
          bg: "bg-[#E0A526]/20 text-[#2B2118] border border-[#E0A526]",
          label: language === "en" ? "Deficiency" : "Deficiency / Kami",
        };
      case "healthy":
      default:
        return {
          bg: "bg-[#2F5D3A] text-white",
          label: language === "en" ? "Healthy" : "Healthy / Swasth",
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
    <div className="flex flex-col gap-5 py-2 text-left">
      {/* Header */}
      <div className="space-y-1 text-left">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight">
          {t("history_title")}
        </h1>
        <p className="text-base text-[#2B2118]/85">{t("history_subtitle")}</p>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="bg-[#2F5D3A]/10 border border-[#2F5D3A] text-[#2F5D3A] rounded-[8px] p-3 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-[8px] p-8 border border-[#2B2118]/15 shadow-xs flex flex-col items-center justify-center gap-3 py-14">
          <Loader2 className="w-7 h-7 text-[#2F5D3A] animate-spin" />
          <p className="text-sm font-semibold text-[#2B2118]">
            {language === "en"
              ? "Loading past scans from Supabase..."
              : "Purane scan load ho rahe hain..."}
          </p>
        </div>
      ) : scans.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-[8px] p-6 border border-[#2B2118]/15 shadow-xs flex flex-col gap-4 text-left">
          <div className="flex items-center gap-2 text-[#2F5D3A]">
            <History className="w-6 h-6 shrink-0" />
            <span className="font-heading text-lg font-bold text-[#2B2118]">
              {t("history_empty_title")}
            </span>
          </div>

          <p className="text-sm text-[#2B2118]/80 leading-relaxed">
            {t("history_empty_desc")}
          </p>

          <div className="pt-2">
            <Link
              href="/scan"
              className="w-full min-h-[48px] h-13 flex items-center justify-center gap-2.5 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base sm:text-lg px-6 rounded-[8px] transition-colors focus:outline-hidden"
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span>{t("history_btn_new")}</span>
            </Link>
          </div>
        </div>
      ) : (
        /* List of Saved Scans */
        <div className="flex flex-col gap-3">
          {scans.map((scan) => {
            const badge = getBadgeStyle(scan.problem_type);
            const isConfirming = confirmDeleteId === scan.id;

            return (
              <div
                key={scan.id}
                className="bg-white rounded-[8px] p-4 sm:p-5 border border-[#2B2118]/20 shadow-xs flex flex-col sm:flex-row gap-4 items-start text-left transition-all hover:border-[#2F5D3A]/40"
              >
                {/* Thumbnail Image */}
                <div
                  onClick={() => handleOpenResult(scan)}
                  className="w-full sm:w-22 h-36 sm:h-22 rounded-[6px] overflow-hidden bg-[#FAF6EF] border border-[#2B2118]/15 shrink-0 flex items-center justify-center cursor-pointer"
                >
                  {scan.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={scan.image_url}
                      alt={scan.problem_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-7 h-7 text-[#2B2118]/40" />
                  )}
                </div>

                {/* Content & Metadata */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2B2118]/70">
                      {scan.crop}
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <h2
                    onClick={() => handleOpenResult(scan)}
                    className="font-heading text-lg font-bold text-[#2B2118] leading-tight hover:text-[#2F5D3A] transition-colors cursor-pointer"
                  >
                    {scan.problem_name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#2B2118]/75">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#2B2118]/60 shrink-0" />
                      <span>{formatDate(scan.created_at)}</span>
                    </span>
                    <span className="font-semibold">
                      Confidence: {scan.confidence}%
                    </span>
                  </div>

                  {/* Actions: Open Result & Delete */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#2B2118]/10">
                    <button
                      type="button"
                      onClick={() => handleOpenResult(scan)}
                      className="min-h-[44px] px-4 py-2 bg-[#2F5D3A] hover:bg-[#24492D] text-[#F6F1E7] font-bold text-xs sm:text-sm rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>
                        {language === "en" ? "View Diagnosis" : "Ilaaj Dekhein"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* Delete Option with Confirmation */}
                    {!isConfirming ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(scan.id)}
                        disabled={deletingId === scan.id}
                        className="min-h-[44px] min-w-[44px] p-2 text-[#B5412F] hover:bg-[#B5412F]/10 border border-[#B5412F]/30 rounded-[8px] transition-colors cursor-pointer flex items-center justify-center"
                        title={language === "en" ? "Delete scan" : "Hataayein"}
                        aria-label="Delete scan"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-[#B5412F]/10 border border-[#B5412F]/40 p-1.5 rounded-[8px]">
                        <span className="text-xs font-bold text-[#B5412F] px-1">
                          {language === "en" ? "Delete?" : "Mitaayein?"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteScan(scan.id, scan.image_url)}
                          disabled={deletingId === scan.id}
                          className="text-xs font-bold bg-[#B5412F] text-white px-2.5 py-1 rounded-[6px] hover:bg-[#9c3625] cursor-pointer"
                        >
                          {deletingId === scan.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : language === "en" ? (
                            "Yes"
                          ) : (
                            "Haan"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-bold bg-white text-[#2B2118] border border-[#2B2118]/25 px-2 py-1 rounded-[6px] hover:bg-[#FAF6EF] cursor-pointer"
                        >
                          {language === "en" ? "Cancel" : "Nahi"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Back to Home Button */}
      <div className="pt-1 text-left">
        <Link
          href="/"
          className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 bg-[#FAF6EF] hover:bg-[#F2EBE0] active:bg-[#EAE1D3] text-[#2B2118] border border-[#2B2118]/25 font-bold text-base px-6 rounded-[8px] transition-colors focus:outline-hidden"
        >
          <ArrowLeft className="w-5 h-5 shrink-0 text-[#2B2118]/80" />
          <span>{t("history_btn_home")}</span>
        </Link>
      </div>
    </div>
  );
}
