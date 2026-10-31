"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";

function getFriendlyAuthError(err: unknown, language: string): string {
  const raw = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (
    raw.includes("invalid login credentials") ||
    raw.includes("invalid_grant") ||
    raw.includes("wrong password") ||
    raw.includes("invalid email or password")
  ) {
    return language === "en" ? "Incorrect email or password" : "ईमेल या पासवर्ड गलत है";
  }
  if (raw.includes("email not confirmed")) {
    return language === "en"
      ? "Please verify your email before logging in"
      : "कृपया अपने ईमेल पर आया लिंक खोलकर खाता चालू करें";
  }
  if (raw.includes("network") || raw.includes("fetch")) {
    return language === "en"
      ? "Connection issue, please try again"
      : "नेटवर्क समस्या, कृपया दोबारा कोशिश करें";
  }
  return language === "en"
    ? "Could not log in. Please check your details."
    : "लॉगिन नहीं हो सका, कृपया जानकारी जांचें।";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/history";

  const { language } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(
        language === "en"
          ? "Please enter both email and password"
          : "कृपया ईमेल और पासवर्ड दोनों भरें"
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        router.push(redirectPath);
      }
    } catch (err: unknown) {
      setError(getFriendlyAuthError(err, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4 text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Left Column on Desktop: 3 Benefits */}
        <div className="hidden md:flex flex-col justify-start space-y-6 pt-2 pr-6 border-r border-[#2B2118]/15">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2F5D3A]">
              CropScan AI
            </span>
            <h2 className="font-heading text-xl font-bold text-[#2B2118] leading-tight">
              {language === "en" ? "Why log in?" : "खाता खोलने से क्या मिलेगा?"}
            </h2>
          </div>

          <ul className="space-y-4 text-sm font-medium text-[#2B2118]/90">
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#E0A526] mt-1.5 shrink-0" />
              <span>
                {language === "en" ? "All past scans in one place" : "पुराने स्कैन एक जगह"}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#E0A526] mt-1.5 shrink-0" />
              <span>
                {language === "en"
                  ? "Remember what disease affected each crop"
                  : "किस फसल में क्या बीमारी आई, याद रहे"}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#E0A526] mt-1.5 shrink-0" />
              <span>
                {language === "en" ? "Track your treatments and remedies" : "इलाज का हिसाब"}
              </span>
            </li>
          </ul>
        </div>

        {/* Right Column: Form directly on cream background */}
        <div className="w-full max-w-[420px] space-y-6">
          {/* Header with 3px Mustard Line */}
          <div className="space-y-2 text-left">
            <div className="w-12 h-[3px] bg-[#E0A526]" />
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight leading-tight">
              {language === "en" ? "Log in to your account" : "अपना खाता खोलें"}
            </h1>
            <p className="text-sm text-[#2B2118]/80">
              {language === "en" ? "To view your past scans." : "पुराने स्कैन वापस देखने के लिए।"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-bold text-[#2B2118]"
              >
                {language === "en" ? "Email" : "ईमेल"}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder={language === "en" ? "farmer@example.com" : "apna@email.com"}
                className="w-full bg-transparent text-[#2B2118] font-medium text-base px-3.5 rounded-[6px] border border-[#2B2118]/25 focus:border-[#2F5D3A] focus:outline-hidden h-[52px] transition-colors"
              />
            </div>

            {/* Password Field with text toggle */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-bold text-[#2B2118]"
              >
                {language === "en" ? "Password" : "पासवर्ड"}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder={language === "en" ? "Enter your password" : "अपना पासवर्ड लिखें"}
                  className="w-full bg-transparent text-[#2B2118] font-medium text-base px-3.5 pr-24 rounded-[6px] border border-[#2B2118]/25 focus:border-[#2F5D3A] focus:outline-hidden h-[52px] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#2B2118]/70 hover:text-[#2B2118] cursor-pointer py-1 px-1.5 focus:outline-hidden"
                >
                  {showPassword
                    ? language === "en"
                      ? "Hide"
                      : "छुपाएं"
                    : language === "en"
                      ? "Show"
                      : "दिखाएं"}
                </button>
              </div>
            </div>

            {/* Error Message: Plain brick-red text, no icon, no box */}
            {error && (
              <p className="text-sm font-semibold text-[#B5412F] pt-1">
                {error}
              </p>
            )}

            {/* Primary Button: 52px, solid deep green, text only */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] flex items-center justify-center bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base rounded-[6px] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed pt-0.5"
            >
              {loading
                ? language === "en"
                  ? "Wait..."
                  : "रुको..."
                : language === "en"
                  ? "Log in"
                  : "खाता खोलें"}
            </button>
          </form>

          {/* Links */}
          <div className="space-y-3 pt-2 text-left">
            {/* Signup Text Link */}
            <p className="text-sm text-[#2B2118]/80">
              {language === "en" ? "Don't have an account? " : "खाता नहीं है? "}
              <Link
                href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}
                className="font-bold text-[#2B2118] underline hover:text-[#2F5D3A]"
              >
                {language === "en" ? "Create a new account" : "नया खाता बनाएं"}
              </Link>
            </p>

            {/* Secondary Link for Guest Scanning */}
            <p className="text-sm">
              <Link
                href="/scan"
                className="font-medium text-[#2B2118]/70 underline hover:text-[#2B2118]"
              >
                {language === "en" ? "Scan without logging in" : "बिना लॉगिन के स्कैन करें"}
              </Link>
            </p>
          </div>

          {/* Mobile Only: 3 Benefits as small text below form */}
          <div className="md:hidden pt-6 border-t border-[#2B2118]/15 space-y-2 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-[#2B2118]/60">
              {language === "en" ? "With an account:" : "खाता खोलने पर:"}
            </p>
            <ul className="space-y-1.5 text-xs text-[#2B2118]/80 font-medium">
              <li>• {language === "en" ? "All past scans in one place" : "पुराने स्कैन एक जगह"}</li>
              <li>
                •{" "}
                {language === "en"
                  ? "Remember what disease affected each crop"
                  : "किस फसल में क्या बीमारी आई, याद रहे"}
              </li>
              <li>• {language === "en" ? "Track your treatments and remedies" : "इलाज का हिसाब"}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-left text-sm font-bold text-[#2B2118]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
