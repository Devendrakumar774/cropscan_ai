import Link from "next/link";
import { Camera, History, Sparkles, ShieldCheck, Sprout } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Hero Header */}
      <section className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-xs text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700">
          <Sprout className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Protect Your Harvest with <span className="text-emerald-700">CropScan AI</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
            Snap or upload a photo of a leaf to detect crop diseases and nutrient deficiencies with expert treatment recommendations.
          </p>
        </div>

        {/* Primary Call to Action Buttons - Large and Mobile-friendly */}
        <div className="pt-2 flex flex-col gap-3">
          <Link
            href="/scan"
            className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-lg py-4 px-6 rounded-2xl shadow-sm transition-all focus:outline-hidden focus:ring-4 focus:ring-emerald-200"
          >
            <Camera className="w-6 h-6" />
            <span>Scan Crop Leaf Now</span>
          </Link>

          <Link
            href="/history"
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-emerald-50/80 active:bg-emerald-100 text-emerald-800 border-2 border-emerald-600 font-bold text-base py-3.5 px-6 rounded-2xl transition-all focus:outline-hidden focus:ring-4 focus:ring-emerald-100"
          >
            <History className="w-5 h-5" />
            <span>View Past Scans</span>
          </Link>
        </div>
      </section>

      {/* How it Works - Informational Placeholders */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-800 px-1">
          How It Works
        </h2>

        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-emerald-100/80 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-base">
              1
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Take a Clear Leaf Photo</h3>
              <p className="text-sm text-slate-600 leading-normal">
                Focus on affected areas in good daylight for the highest accuracy.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-100/80 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-base">
              2
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Instant AI Analysis</h3>
              <p className="text-sm text-slate-600 leading-normal">
                Detect fungal, bacterial, viral conditions, or soil nutrient shortages.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-100/80 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-base">
              3
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Get Treatment Advice</h3>
              <p className="text-sm text-slate-600 leading-normal">
                Follow actionable organic and chemical remediation steps.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
