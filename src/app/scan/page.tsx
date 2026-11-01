"use client";

import { useState, useRef, useEffect, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  RefreshCw,
  X,
} from "lucide-react";
import { compressImageToUnder1MB, formatBytes, CompressionResult } from "@/lib/imageCompression";
import { uploadCropImage, saveScanRecord } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { LANGUAGES, LanguageCode } from "@/lib/translations";
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

const FORM_STORAGE_KEY = "cropscan_scan_form_state";

export default function ScanPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();

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

  // In-App Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // 1. RESTORE FORM STATE FROM SESSION STORAGE ON MOUNT (No image stored)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(FORM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.crop && CROPS.some((c) => c.value === parsed.crop)) {
          setSelectedCrop(parsed.crop);
        }
        if (parsed.daysSinceSymptoms && ["1-3", "4-7", "7+"].includes(parsed.daysSinceSymptoms)) {
          setDaysSinceSymptoms(parsed.daysSinceSymptoms);
        }
        if (parsed.fieldSpread && ["A few plants", "Half", "Most"].includes(parsed.fieldSpread)) {
          setFieldSpread(parsed.fieldSpread);
        }
        if (typeof parsed.recentChemicals === "string") {
          setRecentChemicals(parsed.recentChemicals);
        }
        if (parsed.language && LANGUAGES.some((l) => l.code === parsed.language)) {
          setLanguage(parsed.language as LanguageCode);
        }
      }
    } catch (err) {
      console.warn("Could not restore scan form state from sessionStorage:", err);
    }
  }, [setLanguage]);

  // 2. PERSIST FORM STATE TO SESSION STORAGE ON EVERY CHANGE (No image stored)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stateToSave = {
        crop: selectedCrop,
        daysSinceSymptoms,
        fieldSpread,
        recentChemicals,
        language,
      };
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.warn("Could not save scan form state to sessionStorage:", err);
    }
  }, [selectedCrop, daysSinceSymptoms, fieldSpread, recentChemicals, language]);

  // 3. STOP CAMERA HELPER (Always stops all tracks)
  const stopCameraStream = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn("Error stopping camera tracks:", err);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 4. CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  // 5. ATTACH STREAM TO VIDEO ELEMENT WHEN CAMERA OPENS
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((playErr) => {
        console.warn("Video play error:", playErr);
      });
    }
  }, [isCameraOpen]);

  // 6. START IN-APP CAMERA WITH FALLBACK
  const startCamera = async (targetFacing: "environment" | "user" = facingMode) => {
    setError(null);

    // If getUserMedia unavailable (non-secure context or unsupported), fallback to input
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setError(t("camera_perm_denied"));
      cameraInputRef.current?.click();
      return;
    }

    stopCameraStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setFacingMode(targetFacing);
      setIsCameraOpen(true);

      // Check if device has more than one camera to show Flip button
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        setHasMultipleCameras(false);
      }
    } catch (err: unknown) {
      console.warn("Camera access failed or denied:", err);
      stopCameraStream();
      setIsCameraOpen(false);
      setError(t("camera_perm_denied"));
      cameraInputRef.current?.click();
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setIsCameraOpen(false);
  };

  const handleFlipCamera = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    await startCamera(nextMode);
  };

  // 7. CAPTURE VIDEO FRAME TO CANVAS & SCALE MAX 1280PX
  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 960;

    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;
    const MAX_DIM = 1280;

    if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
        targetWidth = MAX_DIM;
      } else {
        targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
        targetHeight = MAX_DIM;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      stopCameraStream();
      setIsCameraOpen(false);
      return;
    }

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Stop all stream tracks immediately on capture
    stopCameraStream();
    setIsCameraOpen(false);

    canvas.toBlob(
      async (blob) => {
        // Free canvas bitmap memory
        canvas.width = 0;
        canvas.height = 0;

        if (!blob) {
          setError(
            language === "en"
              ? "Could not capture image. Please try again."
              : "फोटो नहीं ली जा सकी। दोबारा कोशिश करें।"
          );
          return;
        }

        const capturedFile = new File([blob], `leaf-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        // Pass into same existing flow
        await processSelectedFile(capturedFile);
      },
      "image/jpeg",
      0.8
    );
  };

  // 8. UNIFIED FILE PROCESSOR WITH MEMORY REVOCATION
  const processSelectedFile = async (file: File) => {
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

      // Revoke previous object URL before replacing
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      const result = await compressImageToUnder1MB(file);
      previewUrlRef.current = result.previewUrl;
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
    }
  };

  const handleFileSelection = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
    e.target.value = "";
  };

  const handleResetImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCompressionResult(null);
    setAnalysisResult(null);
    setError(null);
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
        const friendlyFallback = t("scan_server_busy");
        const receivedError = data?.error;
        const isTechnical =
          !receivedError ||
          typeof receivedError !== "string" ||
          receivedError.includes("failed with status") ||
          receivedError.includes("status 5") ||
          receivedError.includes("429") ||
          receivedError.includes("JSON") ||
          receivedError.includes("GEMINI") ||
          receivedError.includes("API key");

        throw new Error(isTechnical ? friendlyFallback : receivedError);
      }

      console.log("=== [CropScan AI] Gemini Analysis Result ===", data);
      setAnalysisResult(data);

      const finalImageUrl = uploadedUrl || compressionResult.previewUrl;

      let savedScanId: string | undefined = undefined;

      // Do NOT save non-plant scans to Supabase history
      if (data.is_plant) {
        try {
          const savedScan = await saveScanRecord({
            crop: selectedCrop,
            problem_name: data.problem_name,
            problem_type: data.problem_type,
            confidence: data.confidence,
            result_json: data,
            image_url: finalImageUrl,
            user_id: user?.id || "anonymous",
          });
          savedScanId = savedScan?.id;
          console.log("=== [CropScan AI] Scan Saved to Supabase ===", savedScan);
        } catch (dbErr) {
          console.warn("Could not save to Supabase history:", dbErr);
        }
      } else {
        console.log("=== [CropScan AI] Non-plant scan detected; skipped saving to Supabase history ===");
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "cropscan_last_result",
          JSON.stringify({
            ...data,
            imagePreview: finalImageUrl,
            crop: selectedCrop,
            language: language,
            scanId: savedScanId,
          })
        );
      }

      router.push("/result");
    } catch (err: unknown) {
      console.error("Scan submission error:", err);
      const rawMsg = err instanceof Error ? err.message : "";
      const isTechnical =
        !rawMsg ||
        rawMsg.includes("Failed to fetch") ||
        rawMsg.includes("NetworkError") ||
        rawMsg.includes("status ") ||
        rawMsg.includes("Status ") ||
        rawMsg.includes("JSON") ||
        rawMsg.includes("Code ") ||
        rawMsg.includes("Internal") ||
        rawMsg.includes("Error:") ||
        rawMsg.includes("fetch failed");

      const displayMessage = isTechnical ? t("scan_server_busy") : rawMsg;
      setError(displayMessage);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 py-2 text-left max-w-full overflow-hidden">
      {/* FULLSCREEN IN-APP CAMERA VIEW */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
          {/* Top Bar with Close and Flip buttons */}
          <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <button
              type="button"
              onClick={handleCloseCamera}
              className="min-h-[44px] min-w-[44px] px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center gap-2 backdrop-blur-xs font-bold text-sm cursor-pointer border border-white/20 transition-colors"
              aria-label={t("camera_btn_close")}
            >
              <X className="w-5 h-5 text-white" />
              <span>{t("camera_btn_close")}</span>
            </button>

            {hasMultipleCameras && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="min-h-[44px] min-w-[44px] px-4 py-2 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center gap-2 backdrop-blur-xs font-bold text-sm cursor-pointer border border-white/20 transition-colors"
                aria-label={t("camera_btn_flip")}
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span>{t("camera_btn_flip")}</span>
              </button>
            )}
          </div>

          {/* Video Stream & Viewfinder */}
          <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Viewfinder Target Frame */}
            <div className="relative z-10 w-64 h-64 sm:w-72 sm:h-72 border-2 border-dashed border-white/60 rounded-xl flex flex-col items-center justify-center pointer-events-none p-4 text-center">
              <span className="text-xs font-bold text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs">
                {t("camera_center_leaf")}
              </span>
            </div>
          </div>

          {/* Bottom Bar: Big Round Capture Button */}
          <div className="relative z-10 flex items-center justify-center p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 bg-white/25 active:scale-95 transition-transform cursor-pointer focus:outline-hidden"
              aria-label={t("camera_btn_capture")}
            >
              <span className="w-16 h-16 rounded-full bg-white block shadow-md" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Inputs: Camera Fallback & Gallery */}
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

      {/* Error Alert with Try Again Button */}
      {error && (
        <div className="bg-[#B5412F]/10 border border-[#B5412F] text-[#B5412F] rounded-[8px] p-4 sm:p-5 flex flex-col gap-3 text-left">
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#B5412F]" />
            <div className="space-y-1 flex-1">
              <p className="font-bold">
                {t("result_error_title")}
              </p>
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleScanSubmit}
              disabled={isScanning || !compressionResult}
              className="min-h-[44px] px-4 py-2 bg-[#B5412F] hover:bg-[#9c3625] text-white font-bold text-xs sm:text-sm rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t("result_btn_try_again")}</span>
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="min-h-[44px] px-3 py-2 bg-transparent text-[#2B2118]/70 hover:text-[#2B2118] font-semibold text-xs rounded-[6px] cursor-pointer"
            >
              {language === "en" ? "Dismiss" : "हटाएं"}
            </button>
          </div>
        </div>
      )}

      {/* Photo Capture & Upload Box */}
      {!compressionResult ? (
        <div className="bg-white rounded-[6px] border border-[#2B2118]/25 p-5 sm:p-6 flex flex-col gap-4 text-left">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-bold text-[#2B2118]">
              {isCompressing
                ? language === "en"
                  ? "Preparing photo..."
                  : "फोटो तैयार की जा रही है..."
                : t("scan_box_title")}
            </h2>
            <p className="text-sm text-[#2B2118]/80 leading-normal">
              {isCompressing
                ? language === "en"
                  ? "Making photo smaller than 1 MB so it sends fast."
                  : "फोटो को 1 MB से कम किया जा रहा है ताकि जल्दी पहुंचे।"
                : t("scan_box_desc")}
            </p>
          </div>

          {/* Action Buttons: Exactly ONE solid green button, secondary is outlined */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={() => startCamera("environment")}
              disabled={isCompressing}
              className="w-full min-h-[48px] h-13 flex items-center justify-center gap-3 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base sm:text-lg px-6 rounded-[6px] transition-colors cursor-pointer focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-3 bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border border-[#2B2118]/25 font-bold text-base px-6 rounded-[6px] transition-colors cursor-pointer focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-5 h-5 text-[#2B2118]/80" />
              <span>{t("scan_btn_gallery")}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Image Preview Card */
        <div className="bg-white rounded-[6px] p-5 border border-[#2B2118]/25 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#2F5D3A]">
              <span>{t("scan_photo_selected")}</span>
            </span>
            <button
              type="button"
              onClick={handleResetImage}
              disabled={isScanning}
              className="flex items-center gap-1.5 text-xs font-bold text-[#2B2118] bg-transparent hover:bg-[#2B2118]/5 border border-[#2B2118]/25 px-3 py-2 rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t("scan_btn_retake")}</span>
            </button>
          </div>

          <div className="relative w-full h-64 sm:h-72 rounded-[6px] overflow-hidden bg-[#FAF6EF] border border-[#2B2118]/20 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={compressionResult.previewUrl}
              alt="Chuni gayi fasal ka patta"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="border border-[#2B2118]/25 rounded-[6px] p-3 flex items-center justify-between text-xs text-[#2B2118] font-medium">
            <span>
              Photo size: <strong>{formatBytes(compressionResult.compressedSize)}</strong>
              {compressionResult.originalSize > compressionResult.compressedSize && (
                <span className="text-[#2B2118]/60 ml-1">
                  (from {formatBytes(compressionResult.originalSize)})
                </span>
              )}
            </span>
            <span className="text-[#2B2118] border border-[#2B2118]/25 px-2 py-0.5 rounded-[4px] text-[11px] font-bold">
              {t("scan_under_1mb")}
            </span>
          </div>
        </div>
      )}

      {/* Crop Selector */}
      <div className="bg-white rounded-[6px] p-5 border border-[#2B2118]/25 space-y-2 text-left">
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
          className="w-full bg-transparent hover:bg-white focus:bg-white text-[#2B2118] font-semibold text-base py-3 px-4 rounded-[6px] border border-[#2B2118]/25 focus:border-[#2F5D3A] transition-colors outline-hidden cursor-pointer disabled:opacity-60 min-h-[48px]"
        >
          {CROPS.map((crop) => (
            <option key={crop.value} value={crop.value}>
              {crop.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-[#2B2118]/70">{t("scan_crop_help")}</p>
      </div>

      {/* 3 Quick Optional Follow-up Questions Card */}
      {compressionResult && (
        <div className="bg-white rounded-[6px] p-5 border border-[#2B2118]/25 space-y-4 text-left">
          <div className="border-b border-[#2B2118]/15 pb-2">
            <h3 className="font-heading text-base font-bold text-[#2B2118]">
              {t("scan_q_title")}
            </h3>
          </div>

          {/* Question 1: How many days ago did it start? */}
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
                  className={`min-h-[44px] py-2 px-3 rounded-[6px] font-bold text-sm border transition-colors cursor-pointer text-center ${daysSinceSymptoms === days
                    ? "bg-[#2F5D3A] text-[#F6F1E7] border-[#2F5D3A]"
                    : "bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border-[#2B2118]/25"
                    }`}
                >
                  {days} {language === "en" ? "days" : "din"}
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: How much of the field is affected? */}
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
                  className={`min-h-[44px] py-2 px-3 rounded-[6px] font-bold text-xs sm:text-sm border transition-colors cursor-pointer text-center ${fieldSpread === opt.key
                    ? "bg-[#2F5D3A] text-[#F6F1E7] border-[#2F5D3A]"
                    : "bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border-[#2B2118]/25"
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question 3: Recent fertilizer or pesticide */}
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
              className="w-full bg-transparent hover:bg-white focus:bg-white text-[#2B2118] text-sm py-3 px-4 rounded-[6px] border border-[#2B2118]/25 focus:border-[#2F5D3A] transition-colors outline-hidden disabled:opacity-60 min-h-[44px]"
            />
          </div>
        </div>
      )}

      {/* Submit Button (The ONE solid green primary button once photo chosen) */}
      <div className="pt-1 flex flex-col gap-3 text-left">
        <button
          type="button"
          onClick={handleScanSubmit}
          disabled={!compressionResult || isScanning || isCompressing}
          className={`w-full min-h-[48px] h-13 flex items-center justify-center gap-3 font-bold text-base sm:text-lg px-6 rounded-[6px] transition-colors ${!compressionResult || isCompressing
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
          <div className="bg-white border border-[#2B2118]/25 rounded-[6px] p-5 flex flex-col gap-3 text-left">
            <div className="flex items-center justify-between border-b border-[#2B2118]/15 pb-3">
              <span className="font-heading text-base font-bold text-[#2B2118]">
                Gemini AI Raw JSON ({language.toUpperCase()})
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-[4px] ${analysisResult.is_plant
                  ? "bg-[#2F5D3A] text-[#F6F1E7]"
                  : "bg-[#2B2118]/15 text-[#2B2118] border border-[#2B2118]/25"
                  }`}
              >
                {analysisResult.is_plant
                  ? language === "en"
                    ? "Plant Detected"
                    : "पौधा पहचाना गया"
                  : t("result_badge_not_plant")}
              </span>
            </div>

            {/* Quick Summary Banner */}
            <div className="border border-[#2B2118]/15 rounded-[6px] p-3 text-sm text-[#2B2118] space-y-1">
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
              <pre className="w-full bg-[#2B2118] text-[#F6F1E7] font-mono text-xs p-4 rounded-[6px] overflow-x-auto max-h-96 leading-relaxed">
                {JSON.stringify(analysisResult, null, 2)}
              </pre>
            </div>

            <Link
              href="/result"
              className="inline-flex items-center justify-center gap-2 border border-[#2F5D3A] text-[#2F5D3A] hover:bg-[#2F5D3A]/10 text-sm font-bold min-h-[48px] px-5 rounded-[6px] transition-colors mt-2"
            >
              <span>{t("scan_btn_view_result")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Prompt to log in if guest user */}
            {!user ? (
              <div className="border border-[#2B2118]/25 rounded-[6px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left mt-2">
                <div className="space-y-1">
                  <p className="font-heading font-bold text-sm text-[#2B2118]">
                    {t("scan_save_prompt_title")}
                  </p>
                  <p className="text-xs text-[#2B2118]/80 leading-normal">
                    {t("scan_save_prompt_desc")}
                  </p>
                </div>
                <Link
                  href="/login?redirect=/history"
                  className="inline-flex items-center gap-1.5 border border-[#2B2118]/25 hover:bg-[#2B2118]/5 text-[#2B2118] text-xs font-bold px-4 py-2.5 rounded-[6px] shrink-0 min-h-[44px]"
                >
                  <span>{t("scan_save_login_btn")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="border border-[#2F5D3A]/30 rounded-[6px] p-3 flex items-center justify-between text-xs text-[#2F5D3A] font-bold mt-2">
                <span>
                  {language === "en"
                    ? "Saved to your past scans."
                    : "आपके खाते में जुड़ गया।"}
                </span>
                <Link
                  href="/history"
                  className="underline hover:text-[#24492D]"
                >
                  {t("nav_history")} &rarr;
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guidelines: Plain section separated by 1px line */}
      <div className="border-t border-[#2B2118]/25 pt-6 space-y-2 text-left">
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
