import Link from "next/link";
import { Camera, CheckCircle2, AlertTriangle, Pill, ArrowLeft, RefreshCw } from "lucide-react";

export default function ResultPage() {
  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Diagnosis & Advice
        </h1>
        <p className="text-base text-slate-600">
          AI diagnosis results and tailored agricultural remedies.
        </p>
      </div>

      {/* Empty State / Layout Placeholder Card */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-xs space-y-5">
        {/* Leaf Image Thumbnail Placeholder */}
        <div className="w-full h-48 rounded-2xl bg-emerald-50 border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center text-emerald-700 gap-2">
          <Camera className="w-8 h-8 opacity-60" />
          <span className="text-sm font-semibold text-slate-500">
            Uploaded Leaf Image Preview
          </span>
        </div>

        {/* Diagnosis Placeholder */}
        <div className="space-y-2 border-b border-emerald-100 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Condition Detected
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Confidence: --%
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Diagnosis Result Placeholder
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Specific disease or nutrient deficiency analysis details will appear here once a scan is processed.
          </p>
        </div>

        {/* Treatment Advice Placeholder */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-600" />
            <span>Recommended Treatment Plan</span>
          </h3>

          <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100/80 space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-emerald-900">Immediate Actions:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Organic management advice placeholder</li>
              <li>Fertilizer / fungicide dosage guidance placeholder</li>
              <li>Preventative field measures placeholder</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <Link
          href="/scan"
          className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-sm transition-all focus:outline-hidden focus:ring-4 focus:ring-emerald-200"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Scan Another Leaf</span>
        </Link>

        <Link
          href="/"
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-800 border-2 border-emerald-600 font-bold text-base py-3.5 px-6 rounded-2xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}

