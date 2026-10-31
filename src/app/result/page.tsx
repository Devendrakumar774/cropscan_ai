"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Ban,
  FlaskConical,
  Sprout,
  HelpCircle,
  Info,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageCode, LANGUAGES } from "@/lib/translations";
import type { CropDiagnosisResult } from "@/app/api/analyze/route";

interface StoredScanData extends CropDiagnosisResult {
  imagePreview?: string;
  crop?: string;
  language?: string;
}

const BCP47_LANG_CODES: Record<LanguageCode, string> = {
  hi: "hi-IN",
  en: "en-IN",
  mr: "mr-IN",
  pa: "pa-IN",
  gu: "gu-IN",
  ta: "ta-IN",
  te: "te-IN",
};

// Sample fallback in Hindi
const SAMPLE_RESULT_HI: StoredScanData = {
  is_plant: true,
  problem_name: "Early Blight (Agheti Jhulsa)",
  problem_type: "disease",
  confidence: 85,
  cause:
    "Fafundi (Alternaria solani) ki wajah se hota hai. Fasal mein zyaada nami, purani fasal ke avshesh ya garam-nam hawa se ye bimari tezi se phailti hai.",
  symptoms_seen: [
    "Patton par gol-gol bhoore rang ke dhabbe (concentric target rings)",
    "Neechli pattiya pehle peeli padkar sookhne lagti hain",
    "Bimari badhne par pattiya jhulaskar girne lagti hain",
  ],
  cheap_local_remedy: [
    "1 liter khatti chhaachh (buttermilk) ko 15 liter paani mein ghol kar subah ke samay chhidkaav karein",
    "50 ml neem ka tel (Neem Oil 10,000 ppm) prati pamp milakar chhidkein",
    "Zameen ke paas wali bimaar pattiya tod kar khet se bahar mitti mein daba dein",
  ],
  chemical_option: [
    "Mancozeb 75% WP (Indofil M-45) 2 se 2.5 gram prati liter paani mein milakar chhidkein",
    "Agar asar zyaada ho to Copper Oxychloride 50% WP @ 3 gram/L paani ka upyog karein",
  ],
  do_not_buy: [
    "Dukaandar ke kehne par mehenge tonic ya growth booster bilkul na khareedein",
    "Bina zaroorat ke tez insecticide (keet-nashak) na daalein kyunki ye fafund ka rog hai kida nahi",
    "Khuli ya bina label wali dawayi na lein",
  ],
  prevention: [
    "Fasal chakr (crop rotation) apnayein, har saal ek hi zameen par tamatar/aloo na lagayein",
    "Drip sinchai karein taaki patton par paani zyaada der na thehre",
    "Khet ko kharpatwaar-mukt rakhein aur hawa ka aavaagaman achha rakhein",
  ],
  crop: "Tomato (Tamatar)",
};

// Sample fallback in English
const SAMPLE_RESULT_EN: StoredScanData = {
  is_plant: true,
  problem_name: "Early Blight (Alternaria solani)",
  problem_type: "disease",
  confidence: 85,
  cause:
    "Caused by fungal pathogen Alternaria solani. Spreads rapidly under humid weather, splashing rain, and poor crop rotation.",
  symptoms_seen: [
    "Concentric dark brown rings ('target board' pattern) on older leaves",
    "Yellow halo chlorosis developing around necrotic lesions",
    "Lower leaves shrivel and drop prematurely",
  ],
  cheap_local_remedy: [
    "Foliar spray of sour buttermilk (1L in 15L water) early in the morning",
    "Cold-pressed Neem Oil spray (5ml/L water mixed with mild soap)",
    "Prune lower infected foliage and compost deeply away from crop area",
  ],
  chemical_option: [
    "Mancozeb 75% WP @ 2.0 to 2.5 g per liter of clean water",
    "Copper Oxychloride 50% WP @ 3.0 g/L for severe blight outbreaks",
  ],
  do_not_buy: [
    "Do NOT buy overpriced synthetic growth tonics pushed by dealers",
    "Do NOT buy chemical insecticides for fungal leaf spot symptoms",
    "Avoid unsealed or unlabelled pesticide containers",
  ],
  prevention: [
    "Implement 2-3 year crop rotation without solanaceous crops",
    "Employ drip irrigation to prevent prolonged leaf wetness",
    "Ensure adequate plant spacing for good canopy airflow",
  ],
  crop: "Tomato",
};

export default function ResultPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<StoredScanData>(SAMPLE_RESULT_HI);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Initialize data from session storage or fallback
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("cropscan_last_result");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.problem_name === "string") {
            setData(parsed);
            return;
          }
        }
      } catch (err) {
        console.error("Error reading stored scan result:", err);
      }
      setData(language === "en" ? SAMPLE_RESULT_EN : SAMPLE_RESULT_HI);
    }
  }, [language]);

  // Load and listen for SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Web Speech API text-to-speech handler
  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceNotice(
        language === "en"
          ? "Speech synthesis is not supported in this browser."
          : "Aapke browser mein aawaz sunne ki suvidha uplabdh nahi hai."
      );
      return;
    }

    // Toggle: if currently speaking, stop
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    setVoiceNotice(null);

    const targetLangCode = BCP47_LANG_CODES[language] || "hi-IN";
    const currentLangLabel =
      LANGUAGES.find((l) => l.code === language)?.label || language;

    // Check voice support
    const allVoices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    const exactVoice = allVoices.find(
      (v) => v.lang.toLowerCase() === targetLangCode.toLowerCase()
    );
    const prefixVoice = allVoices.find(
      (v) => v.lang.toLowerCase().startsWith(language.toLowerCase())
    );
    const selectedVoice = exactVoice || prefixVoice;

    if (!selectedVoice && allVoices.length > 0) {
      setVoiceNotice(
        language === "en"
          ? `Friendly Note: A dedicated voice for ${currentLangLabel} (${targetLangCode}) was not found on your device. Speech will use the system default voice.`
          : `Dhyan dein: Aapke phone/browser mein ${currentLangLabel} (${targetLangCode}) ki alag aawaz nahi mili. System ki uplabdh aawaz se bolne ki koshish ki ja rahi hai.`
      );
    }

    // Compose spoken text: problem name, cause, cheap remedy, and do-not-buy warning
    const remediesStr =
      Array.isArray(data.cheap_local_remedy) && data.cheap_local_remedy.length > 0
        ? data.cheap_local_remedy.join(". ")
        : "";

    const doNotBuyStr =
      Array.isArray(data.do_not_buy) && data.do_not_buy.length > 0
        ? data.do_not_buy.join(". ")
        : "";

    let speechText = "";
    if (language === "en") {
      speechText = `Problem: ${data.problem_name}. Cause: ${data.cause}. Cheap and local treatment: ${remediesStr}. Warning, do not buy these: ${doNotBuyStr}.`;
    } else if (language === "mr") {
      speechText = `समस्या: ${data.problem_name}. कारण: ${data.cause}. कमी खर्चात स्थानिक उपाय: ${remediesStr}. हे खरेदी करू नका: ${doNotBuyStr}.`;
    } else if (language === "pa") {
      speechText = `ਸਮੱਸਿਆ: ${data.problem_name}. ਕਾਰਨ: ${data.cause}. ਸਸਤਾ ਅਤੇ ਘਰੇਲੂ ਇਲਾਜ: ${remediesStr}. ਇਹ ਨਾ ਖ਼ਰੀਦੋ: ${doNotBuyStr}.`;
    } else if (language === "gu") {
      speechText = `સમસ્યા: ${data.problem_name}. કારણ: ${data.cause}. સસ્તો અને દેશી ઈલાજ: ${remediesStr}. આ ન ખરીદો: ${doNotBuyStr}.`;
    } else if (language === "ta") {
      speechText = `பிரச்சனை: ${data.problem_name}. காரணம்: ${data.cause}. குறைந்த செலவு சிகிச்சை: ${remediesStr}. இவற்றை வாங்க வேண்டாம்: ${doNotBuyStr}.`;
    } else if (language === "te") {
      speechText = `సమస్య: ${data.problem_name}. కారణం: ${data.cause}. తక్కువ ఖర్చుతో చికిత్స: ${remediesStr}. వీటిని కొనకండి: ${doNotBuyStr}.`;
    } else {
      // Default Hindi
      speechText = `Bimari ka naam: ${data.problem_name}. Karan: ${data.cause}. Desi aur sasta ilaaj: ${remediesStr}. Dhyan dein, ye cheezein na khareedein: ${doNotBuyStr}.`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = targetLangCode;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 0.88; // Comfortable listening speed
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Colored badge mapping
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

  const badge = getBadgeStyle(data.problem_type);
  const isLowConfidence = data.confidence < 70;

  return (
    <div className="flex flex-col gap-5 py-2 text-left">
      {/* Top Header */}
      <div className="space-y-1 text-left">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight">
          {t("result_title")}
        </h1>
        <p className="text-base text-[#2B2118]/85">
          {data.crop ? `Crop: ${data.crop}` : t("result_subtitle")}
        </p>
      </div>

      {/* Top Card: Problem Name, Badge, Confidence Bar */}
      <div className="bg-white rounded-[8px] p-5 sm:p-6 border border-[#2B2118]/20 shadow-xs space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2B2118]/15 pb-3">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-[4px] ${badge.bg}`}
          >
            {badge.label}
          </span>
          <span className="text-xs font-bold text-[#2B2118]">
            {t("result_confidence")}: {data.confidence}%
          </span>
        </div>

        <div className="space-y-1">
          {data.imagePreview && (
            <div className="w-full h-48 sm:h-56 rounded-[6px] overflow-hidden bg-[#FAF6EF] border border-[#2B2118]/15 mb-3 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.imagePreview}
                alt={data.problem_name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] leading-tight">
            {data.problem_name}
          </h2>
        </div>

        {/* Confidence Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-[#2B2118]/75 font-semibold">
            <span>{t("result_confidence")}</span>
            <span>{data.confidence} / 100</span>
          </div>
          <div className="w-full bg-[#FAF6EF] border border-[#2B2118]/20 h-3 rounded-[4px] overflow-hidden">
            <div
              className={`h-full rounded-[3px] transition-all duration-500 ${
                data.problem_type === "disease"
                  ? "bg-[#B5412F]"
                  : data.problem_type === "pest"
                  ? "bg-[#E0A526]"
                  : data.problem_type === "nutrient_deficiency"
                  ? "bg-[#E0A526]"
                  : "bg-[#2F5D3A]"
              }`}
              style={{ width: `${Math.max(5, Math.min(100, data.confidence))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Low Confidence Warning Banner (if confidence < 70) */}
      {isLowConfidence && (
        <div className="bg-[#E0A526]/15 border border-[#E0A526] text-[#2B2118] rounded-[8px] p-4 flex items-start gap-3 text-left">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#E0A526]" />
          <div className="space-y-0.5">
            <p className="font-bold text-sm">{t("result_warning_low")}</p>
            <p className="text-xs text-[#2B2118]/85">{t("result_warning_low_sub")}</p>
          </div>
        </div>
      )}

      {/* Action Buttons: Scan Again & Listen */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/scan"
            className="min-h-[48px] h-13 flex items-center justify-center gap-2.5 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base px-5 rounded-[8px] transition-colors focus:outline-hidden"
          >
            <RefreshCw className="w-5 h-5 shrink-0" />
            <span>{t("result_btn_scan_again")}</span>
          </Link>

          {/* Web Speech API Play / Stop Toggle Button */}
          <button
            type="button"
            onClick={handleToggleSpeech}
            className={`min-h-[48px] h-13 flex items-center justify-center gap-2.5 font-bold text-base px-5 rounded-[8px] border transition-colors cursor-pointer focus:outline-hidden ${
              isSpeaking
                ? "bg-[#B5412F] text-white border-[#B5412F]"
                : "bg-[#FAF6EF] hover:bg-[#F2EBE0] active:bg-[#EAE1D3] text-[#2B2118] border-[#2B2118]/30"
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-5 h-5 shrink-0 text-white" />
                <span>{t("result_btn_stop")}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 shrink-0 text-[#2F5D3A]" />
                <span>{t("result_btn_listen")}</span>
              </>
            )}
          </button>
        </div>

        {/* Small Friendly Voice Support Notice */}
        {voiceNotice && (
          <div className="bg-[#FAF6EF] border border-[#2B2118]/20 rounded-[8px] p-3 text-xs text-[#2B2118] flex items-start gap-2 text-left">
            <Info className="w-4 h-4 text-[#E0A526] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{voiceNotice}</p>
          </div>
        )}
      </div>

      {/* Section: Why is this happening */}
      <div className="bg-white rounded-[8px] p-5 sm:p-6 border border-[#2B2118]/20 shadow-xs space-y-3 text-left">
        <div className="flex items-center gap-2 border-b border-[#2B2118]/15 pb-2">
          <HelpCircle className="w-5 h-5 text-[#2F5D3A] shrink-0" />
          <h3 className="font-heading text-lg font-bold text-[#2B2118]">
            {t("result_sec_why")}
          </h3>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#2B2118]">{t("result_cause_label")}</p>
          <p className="text-sm text-[#2B2118]/85 leading-relaxed bg-[#FAF6EF] p-3 rounded-[6px] border border-[#2B2118]/10">
            {data.cause || "Patte par bimari ya kami ke lakshan dikh rahe hain."}
          </p>
        </div>

        {data.symptoms_seen && data.symptoms_seen.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-sm font-semibold text-[#2B2118]">
              {t("result_symptoms_label")}
            </p>
            <ul className="space-y-1.5 text-sm text-[#2B2118]/85 list-disc list-inside">
              {data.symptoms_seen.map((symptom, idx) => (
                <li key={idx} className="leading-normal">
                  {symptom}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Section: Cheap & local treatment first (Green Card) */}
      <div className="bg-[#2F5D3A]/10 border border-[#2F5D3A] rounded-[8px] p-5 sm:p-6 shadow-xs space-y-3 text-left">
        <div className="flex items-center gap-2 border-b border-[#2F5D3A]/30 pb-2">
          <Sprout className="w-5 h-5 text-[#2F5D3A] shrink-0" />
          <h3 className="font-heading text-lg font-bold text-[#2F5D3A]">
            {t("result_sec_local")}
          </h3>
        </div>

        <p className="text-xs text-[#2B2118]/80 font-medium">
          {t("result_sec_local_sub")}
        </p>

        {data.cheap_local_remedy && data.cheap_local_remedy.length > 0 ? (
          <ul className="space-y-2 text-sm text-[#2B2118] list-disc list-inside">
            {data.cheap_local_remedy.map((remedy, idx) => (
              <li key={idx} className="font-medium leading-normal">
                {remedy}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#2B2118]/80 italic">
            {language === "en"
              ? "No specific local remedy needed."
              : "Is sthiti mein kisi desi upaay ki zaroorat nahi hai."}
          </p>
        )}
      </div>

      {/* Section: Chemical option (only if needed) (Grey Card) */}
      <div className="bg-[#FAF6EF] border border-[#2B2118]/25 rounded-[8px] p-5 sm:p-6 shadow-xs space-y-3 text-left">
        <div className="flex items-center gap-2 border-b border-[#2B2118]/15 pb-2">
          <FlaskConical className="w-5 h-5 text-[#2B2118]/80 shrink-0" />
          <h3 className="font-heading text-lg font-bold text-[#2B2118]">
            {t("result_sec_chemical")}
          </h3>
        </div>

        <p className="text-xs text-[#2B2118]/80 font-medium">
          {t("result_sec_chemical_sub")}
        </p>

        {data.chemical_option && data.chemical_option.length > 0 ? (
          <ul className="space-y-2 text-sm text-[#2B2118] list-disc list-inside">
            {data.chemical_option.map((opt, idx) => (
              <li key={idx} className="leading-normal">
                {opt}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#2B2118]/80 italic">
            {language === "en"
              ? "No chemical spray required for this condition."
              : "Kisi chemical dawa ki zaroorat nahi hai."}
          </p>
        )}
      </div>

      {/* Section: Do NOT buy these (Red Warning Card) */}
      <div className="bg-[#B5412F]/10 border border-[#B5412F] rounded-[8px] p-5 sm:p-6 shadow-xs space-y-3 text-left">
        <div className="flex items-center gap-2 border-b border-[#B5412F]/30 pb-2">
          <Ban className="w-5 h-5 text-[#B5412F] shrink-0" />
          <h3 className="font-heading text-lg font-bold text-[#B5412F]">
            {t("result_sec_dont_buy")}
          </h3>
        </div>

        <p className="text-xs text-[#2B2118]/80 font-medium">
          {t("result_sec_dont_buy_sub")}
        </p>

        {data.do_not_buy && data.do_not_buy.length > 0 ? (
          <ul className="space-y-2 text-sm text-[#2B2118] list-disc list-inside">
            {data.do_not_buy.map((item, idx) => (
              <li key={idx} className="font-medium text-[#B5412F] leading-normal">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#2B2118]/80 italic">
            {language === "en"
              ? "Avoid purchasing unverified crop tonics."
              : "Koi anavashyak chemical lene se bachein."}
          </p>
        )}
      </div>

      {/* Section: Prevention tips */}
      <div className="bg-white rounded-[8px] p-5 sm:p-6 border border-[#2B2118]/20 shadow-xs space-y-3 text-left">
        <div className="flex items-center gap-2 border-b border-[#2B2118]/15 pb-2">
          <ShieldCheck className="w-5 h-5 text-[#2F5D3A] shrink-0" />
          <h3 className="font-heading text-lg font-bold text-[#2B2118]">
            {t("result_sec_prevention")}
          </h3>
        </div>

        {data.prevention && data.prevention.length > 0 ? (
          <ul className="space-y-2 text-sm text-[#2B2118]/85 list-disc list-inside">
            {data.prevention.map((tip, idx) => (
              <li key={idx} className="leading-normal">
                {tip}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#2B2118]/80 italic">
            {language === "en"
              ? "Maintain clean field sanitation and healthy soil."
              : "Khet mein swachhta aur sahi sinchai ka dhyan rakhein."}
          </p>
        )}
      </div>

      {/* Bottom Scan Again CTA */}
      <div className="pt-2 text-left">
        <Link
          href="/scan"
          className="w-full min-h-[48px] h-13 flex items-center justify-center gap-2.5 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base sm:text-lg px-6 rounded-[8px] transition-colors focus:outline-hidden"
        >
          <Camera className="w-5 h-5 shrink-0" />
          <span>{t("home_btn_scan")}</span>
        </Link>
      </div>
    </div>
  );
}
