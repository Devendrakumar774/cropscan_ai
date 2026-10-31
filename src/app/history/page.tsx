import Link from "next/link";
import { History, Camera, ArrowLeft } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="flex flex-col gap-5 py-2">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Scan History
        </h1>
        <p className="text-base text-slate-600">
          Keep track of your past field assessments and crop health logs.
        </p>
      </div>

      {/* Empty State Layout */}
      <div className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-xs flex flex-col items-center justify-center text-center gap-4 py-12">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <History className="w-8 h-8" />
        </div>

        <div className="space-y-1 max-w-xs">
          <h2 className="text-lg font-bold text-slate-800">
            No scans recorded yet
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Diagnosed crop leaves will appear in this history log with dates and treatments for seasonal tracking.
          </p>
        </div>

        <div className="w-full pt-4 max-w-sm">
          <Link
            href="/scan"
            className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-sm transition-all focus:outline-hidden focus:ring-4 focus:ring-emerald-200"
          >
            <Camera className="w-6 h-6" />
            <span>Start Your First Scan</span>
          </Link>
        </div>
      </div>

      {/* Back to Home Button */}
      <div className="pt-2">
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

