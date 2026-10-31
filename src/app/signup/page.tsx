"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";

function getFriendlyAuthError(err: unknown, language: string): string {
  const raw = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();

  if (
    raw.includes("user already registered") ||
    raw.includes("already registered") ||
    raw.includes("already exists") ||
    raw.includes("identity already exists")
  ) {
    return language === "en"
      ? "An account already exists with this email"
      : "इस ईमेल से खाता पहले से है";
  }
  if (raw.includes("password should be at least") || raw.includes("password is too short")) {
    return language === "en"
      ? "Password must be at least 6 characters"
      : "पासवर्ड कम से कम 6 अक्षरों का रखें";
  }
  if (raw.includes("network") || raw.includes("fetch")) {
    return language === "en"
      ? "Connection issue, please try again"
      : "नेटवर्क समस्या, कृपया दोबारा कोशिश करें";
  }
  return language === "en"
    ? "Could not create account. Please try again."
    : "खाता नहीं बन सका, कृपया दोबारा कोशिश करें।";
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/history";

  const { language } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(
        language === "en"
          ? "Please fill in all required fields"
          : "कृपया सभी जरूरी जानकारी भरें"
      );
      return;
    }

    if (password.length < 6) {
      setError(
        language === "en"
          ? "Password must be at least 6 characters"
          : "पासवर्ड कम से कम 6 अक्षरों का रखें"
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessNotice(null);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        router.push(redirectPath);
      } else {
        setSuccessNotice(
          language === "en"
            ? "Account created! Check your email for a confirmation link, or log in."
            : "खाता बन गया है! अगर ईमेल पर पुष्टि लिंक आए तो उसे खोलें, या लॉगिन करें।"
        );
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
              {language === "en" ? "Create a new account" : "नया खाता बनाएं"}
            </h1>
            <p className="text-sm text-[#2B2118]/80">
              {language === "en"
                ? "To save your crop scans and treatments."
                : "पुराने स्कैन और इलाज हमेशा देखने के लिए।"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4 text-left">
            {/* Full Name Field (Optional) */}
            <div className="space-y-1.5">
              <label
                htmlFor="fullName"
                className="block text-sm font-bold text-[#2B2118]"
              >
                {language === "en" ? "Name (optional)" : "नाम (वैकल्पिक)"}
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                placeholder={language === "en" ? "e.g. Ramesh Kumar" : "जैसे: रमेश कुमार"}
                className="w-full bg-transparent text-[#2B2118] font-medium text-base px-3.5 rounded-[6px] border border-[#2B2118]/25 focus:border-[#2F5D3A] focus:outline-hidden h-[52px] transition-colors"
              />
            </div>

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
                  placeholder={language === "en" ? "At least 6 characters" : "कम से कम 6 अक्षर"}
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

            {/* Success Notice if email confirmation sent */}
            {successNotice && (
              <p className="text-sm font-semibold text-[#2F5D3A] pt-1">
                {successNotice}
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
                  ? "Create account"
                  : "नया खाता बनाएं"}
            </button>
          </form>

          {/* Links */}
          <div className="space-y-3 pt-2 text-left">
            {/* Login Text Link */}
            <p className="text-sm text-[#2B2118]/80">
              {language === "en" ? "Already have an account? " : "पहले से खाता है? "}
              <Link
                href={`/login?redirect=${encodeURIComponent(redirectPath)}`}
                className="font-bold text-[#2B2118] underline hover:text-[#2F5D3A]"
              >
                {language === "en" ? "Log in" : "खाता खोलें"}
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="py-20 text-left text-sm font-bold text-[#2B2118]">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
