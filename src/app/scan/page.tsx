"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { compressImageToUnder1MB, formatBytes, CompressionResult } from "@/lib/imageCompression";

export const CROPS = [
  "Wheat",
  "Rice",
  "Tomato",
  "Cotton",
  "Potato",
  "Maize",
  "Sugarcane",
  "Other",
] as const;

export type CropType = (typeof CROPS)[number];

export default function ScanPage() {
  const [selectedCrop, setSelectedCrop] = useState<CropType>("Wheat");
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogged, setScanLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    try {
      setError(null);
      setIsCompressing(true);
      setScanLogged(false);

      const result = await compressImageToUnder1MB(file);
      setCompressionResult(result);
    } catch (err) {
      console.error("Compression error:", err);
      setError("Failed to process and compress the selected image. Please try again.");
    } finally {
      setIsCompressing(false);
      // Reset input value so the same file can be re-selected if desired
      e.target.value = "";
    }
  };

  const handleResetImage = () => {
    if (compressionResult?.previewUrl) {
      URL.revokeObjectURL(compressionResult.previewUrl);
    }
    setCompressionResult(null);
    setScanLogged(false);
    setError(null);
  };

  const handleScanSubmit = async () => {
    if (!compressionResult || isScanning) return;

    setIsScanning(true);
    setScanLogged(false);
    setError(null);

    try {
      // Simulate scan request delay for responsive feedback
      await new Promise((resolve) => setTimeout(resolve, 1400));

      // Log the payload as required:
      console.log("=== [CropScan AI] Scan Submitted ===");
      console.log("Selected Crop:", selectedCrop);
      console.log("Original File Size:", formatBytes(compressionResult.originalSize));
      console.log("Compressed File Size (< 1 MB):", formatBytes(compressionResult.compressedSize));
      console.log("Original Dimensions:", `${compressionResult.originalDimensions.width}x${compressionResult.originalDimensions.height}`);
      console.log("Compressed Dimensions:", `${compressionResult.compressedDimensions.width}x${compressionResult.compressedDimensions.height}`);
      console.log("Compressed File Object:", compressionResult.file);
      console.log("====================================");

      setScanLogged(true);
    } catch (err) {
      console.error("Scan submission error:", err);
      setError("An unexpected error occurred while preparing the scan.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 py-2">
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
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Scan Crop Leaf
        </h1>
        <p className="text-base text-slate-600">
          Upload or take a photo of a leaf to identify crop issues.
        </p>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Photo Capture & Upload Section */}
      {!compressionResult ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-emerald-300 p-6 flex flex-col items-center justify-center text-center gap-5 bg-emerald-50/20">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            {isCompressing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Camera className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1 max-w-xs">
            <p className="text-lg font-bold text-slate-900">
              {isCompressing ? "Compressing Image..." : "Add Leaf Photo"}
            </p>
            <p className="text-sm text-slate-500">
              {isCompressing
                ? "Optimizing photo under 1 MB for fast analysis"
                : "Capture directly with camera or select from phone gallery"}
            </p>
          </div>

          {/* Big Action Buttons for Farmers */}
          <div className="w-full flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isCompressing}
              className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-sm transition-all cursor-pointer focus:outline-hidden focus:ring-4 focus:ring-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Camera className="w-6 h-6" />
              <span>Take Photo with Camera</span>
            </button>

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isCompressing}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-emerald-50/80 active:bg-emerald-100 text-emerald-800 border-2 border-emerald-600 font-bold text-base py-3.5 px-6 rounded-2xl transition-all cursor-pointer focus:outline-hidden focus:ring-4 focus:ring-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ImageIcon className="w-5 h-5 text-emerald-700" />
              <span>Choose from Gallery</span>
            </button>
          </div>
        </div>
      ) : (
        /* Image Preview Card */
        <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Leaf Photo Selected</span>
            </span>
            <button
              type="button"
              onClick={handleResetImage}
              disabled={isScanning}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake / Change</span>
            </button>
          </div>

          {/* Scaled Preview Frame */}
          <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-emerald-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={compressionResult.previewUrl}
              alt="Selected crop leaf preview"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Client-side Compression Details Badge */}
          <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-950 font-medium">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Optimized size:{" "}
                <strong className="text-emerald-800 font-bold">
                  {formatBytes(compressionResult.compressedSize)}
                </strong>
                {compressionResult.originalSize > compressionResult.compressedSize && (
                  <span className="text-slate-500 font-normal ml-1">
                    (from {formatBytes(compressionResult.originalSize)})
                  </span>
                )}
              </span>
            </div>
            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
              &lt; 1 MB
            </span>
          </div>
        </div>
      )}

      {/* Crop Selector Dropdown */}
      <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-xs space-y-2">
        <label
          htmlFor="crop-select"
          className="block text-sm font-bold text-slate-800 uppercase tracking-wide"
        >
          Select Crop Type
        </label>
        <div className="relative">
          <select
            id="crop-select"
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value as CropType)}
            disabled={isScanning}
            className="w-full bg-slate-50 hover:bg-white focus:bg-white text-slate-900 font-semibold text-base py-3.5 px-4 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-hidden cursor-pointer disabled:opacity-60"
          >
            {CROPS.map((crop) => (
              <option key={crop} value={crop} className="py-1">
                {crop}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          Selecting the exact crop ensures higher diagnostic precision.
        </p>
      </div>

      {/* Scan Now Submit Button */}
      <div className="pt-1 flex flex-col gap-3">
        <button
          type="button"
          onClick={handleScanSubmit}
          disabled={!compressionResult || isScanning || isCompressing}
          className={`w-full flex items-center justify-center gap-3 font-bold text-lg py-4 px-6 rounded-2xl shadow-sm transition-all ${
            !compressionResult || isCompressing
              ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
              : isScanning
              ? "bg-emerald-700 text-white cursor-wait opacity-90"
              : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer shadow-md focus:outline-hidden focus:ring-4 focus:ring-emerald-200"
          }`}
        >
          {isScanning ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Scanning Crop Leaf...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              <span>Scan Now</span>
            </>
          )}
        </button>

        {/* Scan Logged Success Feedback */}
        {scanLogged && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col gap-3 text-emerald-950">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Scan submitted! Data logged to browser console.</span>
            </div>
            <p className="text-xs text-slate-600">
              Crop: <strong className="text-slate-800">{selectedCrop}</strong> &middot; Image:{" "}
              <strong className="text-slate-800">
                {compressionResult && formatBytes(compressionResult.compressedSize)}
              </strong>{" "}
              (ready for AI pipeline integration).
            </p>
            <Link
              href="/result"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-all"
            >
              <span>View Diagnosis Results Page</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
