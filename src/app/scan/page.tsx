"use client";

import { useState, useRef, ChangeEvent } from "react";
import Link from "next/link";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Info,
  Code2,
  HelpCircle,
} from "lucide-react";
import { compressImageToUnder1MB, formatBytes, CompressionResult } from "@/lib/imageCompression";
import { uploadCropImage, saveScanRecord } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import type { CropDiagnosisResult } from "@/app/api/analyze/route";

export const CROPS = [
  { value: "Wheat", label: "Wheat / Gehun (गेहूं)" },
  { value: "Rice", label: "Rice / Dhan (चावल / धान)" },
  { value: "Tomato", label: "Tomato / Tamatar (टमाटर)" },
  { value: "Cotton", label: "Cotton / Kapas (कपास)" },
  { value: "Potato", label: "Potato / Aloo (आलू)" },
  { value: "Maize", label: "Maize / Makka (मक्का)" },
  { value: "Sugarcane", label: "Sugarcane / Ganna (गन्ना)" },
  { value: "Other", label: "Other / Anya (अन्य)" },
] as const;

export type CropValue = (typeof CROPS)[number]["value"];

export default function ScanPage() {
  const { language, t } = useLanguage();
  const [selectedCrop, setSelectedCrop] = useState<CropValue>("Wheat");
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CropDiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 3 Follow-up Questions State
  const [daysSinceSymptoms, setDaysSinceSymptoms] = useState<"1-3" | "4-7" | "7+" | null>(null);
  const [fieldSpread, setFieldSpread] = useState<"A few plants" | "Half" | "Most" | null>(null);
  const [recentChemicals, setRecentChemicals] = useState<string>("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(
        language === "en"
          ? "Please select a valid image file (JPG, PNG, WebP)."
          : "Kripya photo file chunein (JPG, PNG ya WebP)."
      );
      return;
    }

    try {
      setError(null);
      setIsCompressing(true);
      setAnalysisResult(null);

      const result = await compressImageToUnder1MB(file);
      setCompressionResult(result);
    } catch (err) {
      console.error("Compression error:", err);
      setError(
        language === "en"
          ? "Failed to process image. Please try again with another photo."
          : "Photo process karne mein dikkat aayi. Kripya doosri photo chunein."
      );
    } finally {
      setIsCompressing(false);
      e.target.value = "";
    }
  };

  const handleResetImage = () => {
    if (compressionResult?.previewUrl) {
      URL.revokeObjectURL(compressionResult.previewUrl);
    }
    setCompressionResult(null);
    setAnalysisResult(null);
    setError(null);
    setDaysSinceSymptoms(null);
    setFieldSpread(null);
    setRecentChemicals("");
  };

  // Convert File/Blob to base64 Data URL
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleScanSubmit = async () => {
    if (!compressionResult || isScanning) return;

    setIsScanning(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const base64Image = await fileToBase64(compressionResult.file);

      // Concurrent: upload compressed photo to Supabase 'crop-images' bucket + call /api/analyze
      const [uploadedUrl, response] = await Promise.all([
        uploadCropImage(compressionResult.file),
        fetch("/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64Image,
            crop: selectedCrop,
            language: language,
            days_since_symptoms: daysSinceSymptoms,
            field_spread: fieldSpread,
            recent_chemicals: recentChemicals.trim() || null,
          }),
        }),
      ]);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          (language === "en"
            ? `Diagnosis failed (Status ${response.status})`
            : `Jaanch fail hui (Code ${response.status})`)
        );
      }

      console.log("=== [CropScan AI] Gemini Analysis Result ===", data);
      setAnalysisResult(data);

      const finalImageUrl = uploadedUrl || compressionResult.previewUrl;

      // Save scan record to Supabase 'scans' table
      const savedScan = await saveScanRecord({
        crop: selectedCrop,
        problem_name: data.problem_name,
        problem_type: data.problem_type,
        confidence: data.confidence,
        result_json: data,
        image_url: finalImageUrl,
      });

      console.log("=== [CropScan AI] Scan Saved to Supabase ===", savedScan);

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "cropscan_last_result",
          JSON.stringify({
            ...data,
            imagePreview: finalImageUrl,
            crop: selectedCrop,
            language: language,
            scanId: savedScan.id,
          })
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : language === "en"
            ? "An unexpected error occurred during scan."
            : "Jaanch karte waqt anchaaha error aaya.";
      console.error("Scan submission error:", err);
      setError(message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 py-2 text-left">
      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelection}
        disabled={isScanning || isCompressing}
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelection}
        disabled={isScanning || isCompressing}
      />

      {/* Header */}
      <div className="space-y-1 text-left">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight">
          {t("scan_title")}
        </h1>
        <p className="text-base text-[#2B2118]/85">{t("scan_subtitle")}</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-[#B5412F]/10 border border-[#B5412F] text-[#B5412F] rounded-[8px] p-4 flex items-start gap-3 text-sm text-left">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#B5412F]" />
          <div className="space-y-1">
            <p className="font-bold">
              {language === "en" ? "Notice:" : "Dhyan dein:"}
            </p>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Photo Capture & Upload Box */}
      {!compressionResult ? (
        <div className="bg-white rounded-[8px] border border-[#2B2118]/20 p-5 sm:p-6 flex flex-col gap-4 text-left shadow-xs">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-bold text-[#2B2118]">
              {isCompressing
                ? language === "en"
                  ? "Compressing photo under 1 MB..."
                  : "Photo taiyar ki ja rahi hai..."
                : t("scan_box_title")}
            </h2>
            <p className="text-sm text-[#2B2118]/80 leading-normal">
              {isCompressing
                ? language === "en"
                  ? "Optimizing photo under 1 MB for fast analysis"
                  : "Photo ko 1 MB se kam kiya ja raha hai taaki bina rukawat scan ho sake."
                : t("scan_box_desc")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isCompressing}
              className="w-full min-h-[48px] h-13 flex items-center justify-center gap-3 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base sm:text-lg px-6 rounded-[8px] transition-colors cursor-pointer focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCompressing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              <span>{t("scan_btn_camera")}</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isCompressing}
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-3 bg-[#FAF6EF] hover:bg-[#F2EBE0] active:bg-[#EAE1D3] text-[#2B2118] border border-[#2B2118]/25 font-bold text-base px-6 rounded-[8px] transition-colors cursor-pointer focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-5 h-5 text-[#2B2118]/80" />
              <span>{t("scan_btn_gallery")}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Image Preview Card */
        <div className="bg-white rounded-[8px] p-5 border border-[#2B2118]/20 shadow-xs space-y-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#2F5D3A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#2F5D3A]" />
              <span>{t("scan_photo_selected")}</span>
            </span>
            <button
              type="button"
              onClick={handleResetImage}
              disabled={isScanning}
              className="flex items-center gap-1.5 text-xs font-bold text-[#2B2118] bg-[#FAF6EF] hover:bg-[#F2EBE0] border border-[#2B2118]/20 px-3 py-2 rounded-[8px] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t("scan_btn_retake")}</span>
            </button>
          </div>

          <div className="relative w-full h-64 sm:h-72 rounded-[8px] overflow-hidden bg-[#FAF6EF] border border-[#2B2118]/20 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={compressionResult.previewUrl}
              alt="Chuni gayi fasal ka patta"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="bg-[#FAF6EF] border border-[#2B2118]/15 rounded-[8px] p-3 flex items-center justify-between text-xs text-[#2B2118] font-medium">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#2F5D3A] shrink-0" />
              <span>
                Photo size: <strong>{formatBytes(compressionResult.compressedSize)}</strong>
                {compressionResult.originalSize > compressionResult.compressedSize && (
                  <span className="text-[#2B2118]/60 ml-1">
                    (from {formatBytes(compressionResult.originalSize)})
                  </span>
                )}
              </span>
            </div>
            <span className="bg-[#E0A526] text-[#2B2118] px-2 py-0.5 rounded-[4px] text-[11px] font-bold">
              {t("scan_under_1mb")}
            </span>
          </div>
        </div>
      )}

      {/* Crop Selector */}
      <div className="bg-white rounded-[8px] p-5 border border-[#2B2118]/20 shadow-xs space-y-2 text-left">
        <label
          htmlFor="crop-select"
          className="block text-sm font-bold text-[#2B2118]"
        >
          {t("scan_crop_label")}
        </label>
        <select
          id="crop-select"
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value as CropValue)}
          disabled={isScanning}
          className="w-full bg-[#FAF6EF] hover:bg-white focus:bg-white text-[#2B2118] font-semibold text-base py-3 px-4 rounded-[8px] border border-[#2B2118]/30 focus:border-[#2F5D3A] transition-colors outline-hidden cursor-pointer disabled:opacity-60 min-h-[48px]"
        >
          {CROPS.map((crop) => (
            <option key={crop.value} value={crop.value}>
              {crop.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#2B2118]/70">{t("scan_crop_help")}</p>
      </div>

      {/* 3 Quick Optional Follow-up Questions Card (Displayed after photo is selected) */}
      {compressionResult && (
        <div className="bg-white rounded-[8px] p-5 border border-[#2B2118]/20 shadow-xs space-y-4 text-left">
          <div className="border-b border-[#2B2118]/15 pb-2">
            <h3 className="font-heading text-base font-bold text-[#2B2118]">
              {t("scan_q_title")}
            </h3>
          </div>

          {/* Question 1: How many days since symptoms started? (1-3, 4-7, 7+) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#2B2118]">
              {t("scan_q1_label")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["1-3", "4-7", "7+"] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() =>
                    setDaysSinceSymptoms(daysSinceSymptoms === days ? null : days)
                  }
                  disabled={isScanning}
                  className={`min-h-[44px] py-2 px-3 rounded-[8px] font-bold text-sm border transition-colors cursor-pointer text-center ${daysSinceSymptoms === days
                    ? "bg-[#2F5D3A] text-[#F6F1E7] border-[#2F5D3A]"
                    : "bg-[#FAF6EF] hover:bg-[#F2EBE0] text-[#2B2118] border-[#2B2118]/25"
                    }`}
                >
                  {days} {language === "en" ? "days" : "din"}
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: How much of the field is affected? (A few plants, Half, Most) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#2B2118]">
              {t("scan_q2_label")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { key: "A few plants" as const, label: t("scan_q2_opt1") },
                { key: "Half" as const, label: t("scan_q2_opt2") },
                { key: "Most" as const, label: t("scan_q2_opt3") },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() =>
                    setFieldSpread(fieldSpread === opt.key ? null : opt.key)
                  }
                  disabled={isScanning}
                  className={`min-h-[44px] py-2 px-3 rounded-[8px] font-bold text-xs sm:text-sm border transition-colors cursor-pointer text-center ${fieldSpread === opt.key
                    ? "bg-[#2F5D3A] text-[#F6F1E7] border-[#2F5D3A]"
                    : "bg-[#FAF6EF] hover:bg-[#F2EBE0] text-[#2B2118] border-[#2B2118]/25"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Recent fertilizer or pesticide (text, optional) */}
          <div className="space-y-2">
            <label
              htmlFor="chemicals-input"
              className="block text-sm font-semibold text-[#2B2118]"
            >
              {t("scan_q3_label")}
            </label>
            <input
              id="chemicals-input"
              type="text"
              value={recentChemicals}
              onChange={(e) => setRecentChemicals(e.target.value)}
              disabled={isScanning}
              placeholder={t("scan_q3_placeholder")}
              className="w-full bg-[#FAF6EF] hover:bg-white focus:bg-white text-[#2B2118] text-sm py-3 px-4 rounded-[8px] border border-[#2B2118]/30 focus:border-[#2F5D3A] transition-colors outline-hidden disabled:opacity-60 min-h-[44px]"
            />
          </div>
        </div>
      )}

      {/* Scan Now Button */}
      <div className="pt-1 flex flex-col gap-3 text-left">
        <button
          type="button"
          onClick={handleScanSubmit}
          disabled={!compressionResult || isScanning || isCompressing}
          className={`w-full min-h-[48px] h-13 flex items-center justify-center gap-3 font-bold text-base sm:text-lg px-6 rounded-[8px] transition-colors ${!compressionResult || isCompressing
            ? "bg-[#2B2118]/15 text-[#2B2118]/50 cursor-not-allowed border border-[#2B2118]/15"
            : isScanning
              ? "bg-[#2F5D3A] text-[#F6F1E7] cursor-wait opacity-90"
              : "bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] cursor-pointer"
            }`}
        >
          {isScanning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t("scan_loading")}</span>
            </>
          ) : (
            <span>{t("scan_btn_submit")}</span>
          )}
        </button>

        {/* Raw JSON Result Display */}
        {analysisResult && (
          <div className="bg-white border border-[#2B2118]/25 rounded-[8px] p-5 flex flex-col gap-3 text-left shadow-xs">
            <div className="flex items-center justify-between border-b border-[#2B2118]/15 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#2F5D3A]" />
                <span className="font-heading text-base font-bold text-[#2B2118]">
                  Gemini AI Raw JSON ({language.toUpperCase()})
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-[4px] ${analysisResult.is_plant
                  ? "bg-[#2F5D3A] text-[#F6F1E7]"
                  : "bg-[#B5412F] text-white"
                  }`}
              >
                {analysisResult.is_plant ? "Plant Detected" : "Not a Plant"}
              </span>
            </div>

            {/* Quick Summary Pill Banner */}
            <div className="bg-[#FAF6EF] rounded-[8px] p-3 text-sm text-[#2B2118] space-y-1">
              <p>
                <strong>Problem:</strong> {analysisResult.problem_name}
              </p>
              <p>
                <strong>Type:</strong> {analysisResult.problem_type} &middot;{" "}
                <strong>Confidence:</strong> {analysisResult.confidence}%
              </p>
              <p className="text-xs text-[#2B2118]/80">{analysisResult.cause}</p>
            </div>

            {/* Raw JSON Block */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#2B2118]/70">
                Full JSON Response:
              </label>
              <pre className="w-full bg-[#2B2118] text-[#F6F1E7] font-mono text-xs p-4 rounded-[8px] overflow-x-auto max-h-96 leading-relaxed">
                {JSON.stringify(analysisResult, null, 2)}
              </pre>
            </div>

            <Link
              href="/result"
              className="inline-flex items-center justify-center gap-2 bg-[#2F5D3A] hover:bg-[#24492D] text-[#F6F1E7] text-sm font-bold min-h-[48px] px-5 rounded-[8px] transition-colors mt-2"
            >
              <span>{t("scan_btn_view_result")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="bg-white rounded-[8px] p-5 border border-[#2B2118]/15 shadow-xs space-y-2 text-left">
        <h3 className="font-heading text-sm font-bold text-[#2B2118]">
          {t("scan_tips_title")}
        </h3>
        <ul className="text-sm text-[#2B2118]/85 space-y-1.5 list-disc list-inside">
          <li>{t("scan_tip1")}</li>
          <li>{t("scan_tip2")}</li>
          <li>{t("scan_tip3")}</li>
        </ul>
      </div>
    </div>
  );
}
