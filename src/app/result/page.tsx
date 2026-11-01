"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Ban,
  FlaskConical,
  Sprout,
  HelpCircle,
  ArrowLeft,
  Info,
  Loader2,
  PhoneCall,
  MapPin,
  ExternalLink,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageCode, LANGUAGES } from "@/lib/translations";
import type { CropDiagnosisResult } from "@/app/api/analyze/route";
import SprayWeatherCard from "@/components/SprayWeatherCard";

interface StoredScanData extends CropDiagnosisResult {
  imagePreview?: string;
  crop?: string;
  language?: string;
  client_timing_ms?: number;
  sync_status?: "saving" | "saved" | "failed" | "skipped";
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

// Realistic sample result in Hindi (Devanagari)
const SAMPLE_RESULT_HI: StoredScanData = {
  is_plant: true,
  problem_name: "अगेती झुलसा (Early Blight)",
  problem_type: "disease",
  confidence: 85,
  cause:
    "फफूंद (Alternaria solani) के कारण होता है। खेत में अधिक नमी, पिछली फसल के अवशेष और गर्म-नम मौसम से यह बीमारी तेजी से फैलती है।",
  symptoms_seen: [
    "पुराने पत्तों पर गोल-गोल भूरे रंग के छल्लेदार धब्बे (Target rings)",
    "निचली पत्तियां पहले पीली पड़कर सूखने लगती हैं",
    "रोग बढ़ने पर पत्तियां झुलसकर नीचे गिर जाती हैं",
  ],
  cheap_local_remedy: [
    "1 लीटर खट्टी छाछ को 15 लीटर पानी में घोलकर सुबह के समय पत्तियों पर छिड़कें",
    "50 मिली नीम का तेल (Neem Oil 10,000 ppm) प्रति पंप मिलाकर छिड़काव करें",
    "जमीन के पास की बीमार पत्तियों को तोड़कर खेत से बाहर गड्ढे में दबा दें",
  ],
  chemical_option: [
    "मैंकोजेब 75% WP (Mancozeb) 2 से 2.5 ग्राम प्रति लीटर पानी में मिलाकर छिड़कें",
    "यदि प्रकोप अधिक हो तो कॉपर ऑक्सीक्लोराइड 50% WP @ 3 ग्राम प्रति लीटर का उपयोग करें",
  ],
  do_not_buy: [
    "दुकानदार के कहने पर महंगे टॉनिक या ग्रोथ बूस्टर बिल्कुल न खरीदें",
    "बिना जरूरत के तेज कीटनाशक न डालें क्योंकि यह फफूंद का रोग है, कीड़ा नहीं",
    "खुली या बिना लेबल वाली दवाई न लें",
  ],
  prevention: [
    "फसल चक्र अपनाएं, हर साल एक ही खेत में टमाटर या आलू लगातार न लगाएं",
    "ड्रिप सिंचाई करें ताकि पत्तों पर लंबे समय तक पानी न ठहरा रहे",
    "खेत को खरपतवार-मुक्त रखें और हवा का संचार अच्छा रखें",
  ],
  cost_estimate: {
    local_remedy_cost_inr: "₹60 - ₹120 / एकड़",
    chemical_cost_inr: "₹450 - ₹750 / एकड़",
    savings_summary: "देसी छाछ व नीम तेल से प्रति एकड़ लगभग ₹400-600 की सीधी बचत होती है।",
  },
  crop: "टमाटर (Tomato)",
};

// Realistic sample result in English
const SAMPLE_RESULT_EN: StoredScanData = {
  is_plant: true,
  problem_name: "Early Blight (Alternaria solani)",
  problem_type: "disease",
  confidence: 85,
  cause:
    "Caused by fungus. Wet weather and splashing rainwater make it spread quickly.",
  symptoms_seen: [
    "Round brown rings on older leaves",
    "Yellow edges forming around brown spots",
    "Bottom leaves dry up and drop off",
  ],
  cheap_local_remedy: [
    "Mix 1 liter sour buttermilk in 15 liters water and spray in the morning.",
    "Spray neem oil (5 ml per liter water with a little soap).",
    "Pick off bad lower leaves and bury them outside the field.",
  ],
  chemical_option: [
    "Spray Mancozeb 75% WP (2 to 2.5 grams per liter water).",
    "If the spots spread quickly, use Copper Oxychloride 50% WP (3 grams per liter).",
  ],
  do_not_buy: [
    "Do NOT buy costly tonics or growth boosters pushed by shops.",
    "Do NOT buy insect poisons for leaf spots.",
    "Do not buy open bottles without proper labels.",
  ],
  prevention: [
    "Do not plant tomato or potato in the same field every year.",
    "Water at the roots so leaves stay dry.",
    "Keep space between plants so air flows freely.",
  ],
  cost_estimate: {
    local_remedy_cost_inr: "₹60 - ₹120 / acre",
    chemical_cost_inr: "₹450 - ₹750 / acre",
    savings_summary: "Sour buttermilk and neem spray saves about ₹400-600 per acre.",
  },
  crop: "Tomato",
};

export default function ResultPage() {
  const { language, t } = useLanguage();
  const [data, setData] = useState<StoredScanData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Initialize data from session storage or fallback
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // Check for error in URL query
        const urlParams = new URLSearchParams(window.location.search);
        const urlErr = urlParams.get("error");
        if (urlErr) {
          setErrorMessage(decodeURIComponent(urlErr));
          setIsLoading(false);
          return;
        }

        const stored = sessionStorage.getItem("cropscan_last_result");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.error) {
            setErrorMessage(parsed.error);
            setIsLoading(false);
            return;
          }
          if (parsed && (typeof parsed.is_plant === "boolean" || typeof parsed.problem_name === "string")) {
            setData(parsed);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Error reading stored scan result:", err);
      }
      setData(language === "en" ? SAMPLE_RESULT_EN : SAMPLE_RESULT_HI);
      setIsLoading(false);
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
    if (!data || !data.is_plant) return;

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceNotice(t("result_voice_unsupported"));
      return;
    }

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
          : `ध्यान दें: आपके फोन में ${currentLangLabel} (${targetLangCode}) की अलग आवाज़ नहीं मिली। सिस्टम की उपलब्ध आवाज़ से बोलने की कोशिश की जा रही है।`
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
    if (!data.is_plant) {
      speechText = `${data.problem_name}. ${data.cause}`;
    } else if (language === "en") {
      speechText = `Problem: ${data.problem_name}. Cause: ${data.cause}. Cheap and local treatment: ${remediesStr}. Warning, do not buy these: ${doNotBuyStr}.`;
    } else {
      speechText = `समस्या का नाम: ${data.problem_name}. कारण: ${data.cause}. देसी और सस्ता इलाज: ${remediesStr}. ध्यान दें, ये चीजें न खरीदें: ${doNotBuyStr}.`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = targetLangCode;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 0.88;
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

  // Colored badge mapping (only for is_plant=true)
  const getBadgeStyle = () => {
    if (!data || !data.is_plant) {
      return {
        bg: "bg-[#2B2118]/15 text-[#2B2118] border border-[#2B2118]/30",
        label: t("result_badge_not_plant"),
      };
    }

    switch (data.problem_type) {
      case "disease":
        return {
          bg: "bg-[#B5412F] text-white",
          label: t("result_badge_disease"),
        };
      case "pest":
        return {
          bg: "bg-[#E0A526] text-[#2B2118]",
          label: t("result_badge_pest"),
        };
      case "nutrient_deficiency":
        return {
          bg: "bg-[#E0A526]/20 text-[#2B2118] border border-[#E0A526]",
          label: t("result_badge_deficiency"),
        };
      case "healthy":
      default:
        return {
          bg: "bg-[#2F5D3A] text-white",
          label: t("result_badge_healthy"),
        };
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-left">
        <Loader2 className="w-8 h-8 text-[#2F5D3A] animate-spin" />
        <p className="text-sm font-semibold text-[#2B2118]">
          {language === "en" ? "Loading diagnosis..." : "Jaanch ka natija load ho raha hai..."}
        </p>
      </div>
    );
  }

  // Real error message state
  if (errorMessage) {
    return (
      <div className="flex flex-col gap-5 py-2 text-left">
        <div className="space-y-1 text-left">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight">
            {t("result_error_title")}
          </h1>
          <p className="text-base text-[#2B2118]/85">
            {language === "en"
              ? "The leaf analysis could not be completed."
              : "Patte ki jaanch poori nahi ho saki."}
          </p>
        </div>

        <div className="bg-[#B5412F]/10 border border-[#B5412F]/40 rounded-[6px] p-6 space-y-4 text-left">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-bold text-[#B5412F]">
              {language === "en" ? "Notice:" : "ध्यान दें:"}
            </h2>
            <p className="text-sm font-medium text-[#2B2118] leading-relaxed">
              {errorMessage}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/scan"
              className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2.5 bg-[#B5412F] hover:bg-[#9c3625] text-white font-bold text-base px-6 rounded-[6px] transition-colors focus:outline-hidden"
            >
              <RefreshCw className="w-5 h-5 shrink-0" />
              <span>{t("result_btn_try_again")}</span>
            </Link>
          </div>
        </div>

        <div className="pt-2 text-left">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#2B2118]/80 hover:text-[#2B2118] underline"
          >
            <ArrowLeft className="w-4 h-4 shrink-0 text-[#2B2118]/70" />
            <span>{t("result_btn_home")}</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const badge = getBadgeStyle();
  const showLowConfidenceBanner = data.is_plant && data.confidence < 70;

  return (
    <div className="flex flex-col gap-5 py-2 text-left max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="space-y-1 text-left">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] tracking-tight">
          {t("result_title")}
        </h1>
        <p className="text-base text-[#2B2118]/85">
          {data.is_plant && data.crop ? `Crop: ${data.crop}` : t("result_subtitle")}
        </p>
      </div>

      {/* 1. NON-PLANT PHOTO: Neutral Grey Card */}
      {!data.is_plant ? (
        <div className="bg-white rounded-[6px] p-6 sm:p-7 border border-[#2B2118]/25 space-y-4 text-left">
          {/* Uploaded photo preview */}
          {data.imagePreview && (
            <div className="w-full h-56 sm:h-64 rounded-[6px] overflow-hidden bg-[#FAF6EF] border border-[#2B2118]/15 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.imagePreview}
                alt={t("result_not_plant_title")}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="space-y-2 pt-1">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#2B2118] leading-tight">
              {t("result_not_plant_title")}
            </h2>
            <p className="text-base text-[#2B2118]/85 font-medium leading-relaxed">
              {t("result_not_plant_help")}
            </p>
            {data.cause && data.cause !== t("result_not_plant_help") && (
              <p className="text-xs text-[#2B2118]/70 leading-normal pt-1">
                {data.cause}
              </p>
            )}
          </div>

          <div className="pt-2">
            <Link
              href="/scan"
              className="w-full min-h-[48px] h-13 flex items-center justify-center gap-2.5 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base sm:text-lg px-6 rounded-[6px] transition-colors focus:outline-hidden"
            >
              <RefreshCw className="w-5 h-5 shrink-0" />
              <span>{t("result_btn_scan_again")}</span>
            </Link>
          </div>
        </div>
      ) : (
        /* 2. PLANT DETECTED: Diagnosis & Treatment Sections */
        <>
          {/* Non-blocking sync note if background cloud save was skipped or failed */}
          {data.sync_status === "failed" && (
            <div className="bg-[#E0A526]/10 border border-[#E0A526]/30 text-[#2B2118] text-xs px-3.5 py-2 rounded-[6px]">
              {language === "en"
                ? "Note: Could not save to history offline. Your diagnosis is available below."
                : "सूचना: यह जांच पुराने रिकॉर्ड में नहीं जुड़ सकी। इलाज नीचे दिया गया है।"}
            </div>
          )}

          {/* Main Result Card */}
          <div className="bg-white rounded-[6px] p-5 sm:p-6 border border-[#2B2118]/25 space-y-4 text-left">
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
              <div className="w-full bg-[#2B2118]/10 h-2.5 rounded-[3px] overflow-hidden">
                <div
                  className={`h-full rounded-[2px] transition-all duration-500 ${data.problem_type === "disease"
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

          {/* Low Confidence Warning Banner (State card) */}
          {showLowConfidenceBanner && (
            <div className="bg-[#E0A526]/15 border border-[#E0A526] text-[#2B2118] rounded-[6px] p-4 text-left space-y-0.5">
              <p className="font-bold text-sm">{t("result_warning_low")}</p>
              <p className="text-xs text-[#2B2118]/85">{t("result_warning_low_sub")}</p>
            </div>
          )}

          {/* Action Buttons: Exactly ONE solid green primary button, secondary is outlined */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/scan"
                className="min-h-[48px] h-13 flex items-center justify-center gap-2.5 bg-[#2F5D3A] hover:bg-[#24492D] active:bg-[#1C3B24] text-[#F6F1E7] font-bold text-base px-5 rounded-[6px] transition-colors focus:outline-hidden"
              >
                <RefreshCw className="w-5 h-5 shrink-0" />
                <span>{t("result_btn_scan_again")}</span>
              </Link>

              {/* Web Speech API Play / Stop Toggle Button (Outlined) */}
              <button
                type="button"
                onClick={handleToggleSpeech}
                className={`min-h-[48px] h-13 flex items-center justify-center gap-2.5 font-bold text-base px-5 rounded-[6px] border transition-colors cursor-pointer focus:outline-hidden ${isSpeaking
                  ? "bg-[#B5412F] text-white border-[#B5412F]"
                  : "bg-transparent hover:bg-[#2B2118]/5 text-[#2B2118] border-[#2B2118]/25"
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

            {/* Voice Notice */}
            {voiceNotice && (
              <div className="border border-[#2B2118]/20 rounded-[6px] p-3 text-xs text-[#2B2118] text-left">
                <p className="leading-relaxed">{voiceNotice}</p>
              </div>
            )}
          </div>

          {/* Spray Weather Advice Section */}
          <SprayWeatherCard />

          {/* Section: Why is this happening (No icon next to heading) */}
          <div className="bg-white rounded-[6px] p-5 sm:p-6 border border-[#2B2118]/25 space-y-3 text-left">
            <div className="border-b border-[#2B2118]/15 pb-2">
              <h3 className="font-heading text-lg font-bold text-[#2B2118]">
                {t("result_sec_why")}
              </h3>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-[#2B2118]/70 uppercase tracking-wider">{t("result_cause_label")}</p>
              <p className="text-sm text-[#2B2118]/90 leading-relaxed">
                {data.cause || "Patte par bimari ya kami ke nishan dikh rahe hain."}
              </p>
            </div>

            {data.symptoms_seen && data.symptoms_seen.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#2B2118]/10">
                <p className="text-xs font-bold text-[#2B2118]/70 uppercase tracking-wider">
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

          {/* Section: Cheap & local treatment first (No icon next to heading) */}
          <div className="bg-[#2F5D3A]/10 border border-[#2F5D3A]/30 rounded-[6px] p-5 sm:p-6 space-y-3 text-left">
            <div className="border-b border-[#2F5D3A]/25 pb-2">
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
                  : "इस स्थिति में किसी विशेष घरेलू उपाय की आवश्यकता नहीं है।"}
              </p>
            )}
          </div>

          {/* Section: Chemical option (No icon next to heading) */}
          <div className="border border-[#2B2118]/25 rounded-[6px] p-5 sm:p-6 space-y-3 text-left bg-white">
            <div className="border-b border-[#2B2118]/15 pb-2">
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
                  : "इस स्थिति के लिए किसी रासायनिक दवा की आवश्यकता नहीं है।"}
              </p>
            )}
          </div>

          {/* Section: Estimated Cost Comparison (No icon next to heading) */}
          {data.cost_estimate && (
            <div className="bg-white rounded-[6px] p-5 sm:p-6 border border-[#2B2118]/25 space-y-4 text-left">
              <div className="border-b border-[#2B2118]/15 pb-2">
                <h3 className="font-heading text-lg font-bold text-[#2B2118]">
                  {t("result_sec_cost")}
                </h3>
              </div>

              <p className="text-xs text-[#2B2118]/80 font-medium">
                {t("result_cost_sub")}
              </p>

              {/* Cost comparison cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Cheap / Local Remedy */}
                <div className="border border-[#2F5D3A]/30 rounded-[6px] p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#2F5D3A]">
                      {t("result_cost_local")}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F5D3A]">
                      {t("result_cost_badge_budget")}
                    </span>
                  </div>
                  <div>
                    <p className="font-heading text-xl sm:text-2xl font-bold text-[#2F5D3A]">
                      {data.cost_estimate.local_remedy_cost_inr}
                    </p>
                  </div>
                </div>

                {/* Chemical Option */}
                <div className="border border-[#2B2118]/25 rounded-[6px] p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#2B2118]">
                      {t("result_cost_chemical")}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2B2118]/70">
                      {t("result_cost_badge_chemical")}
                    </span>
                  </div>
                  <div>
                    <p className="font-heading text-xl sm:text-2xl font-bold text-[#2B2118]">
                      {data.cost_estimate.chemical_cost_inr}
                    </p>
                  </div>
                </div>
              </div>

              {/* Savings Summary Banner if provided */}
              {data.cost_estimate.savings_summary && (
                <div className="border border-[#E0A526]/50 bg-[#E0A526]/10 rounded-[6px] p-3 text-xs sm:text-sm text-[#2B2118]">
                  <p className="font-semibold leading-relaxed">
                    {data.cost_estimate.savings_summary}
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-xs text-[#2B2118]/70 pt-1">
                <p className="leading-relaxed">
                  {t("result_cost_approx_note")}
                </p>
              </div>
            </div>
          )}

          {/* Section: Do NOT buy these (State card: Warning / Stop) */}
          <div className="bg-[#B5412F]/10 border border-[#B5412F]/30 rounded-[6px] p-5 sm:p-6 space-y-3 text-left">
            <div className="border-b border-[#B5412F]/25 pb-2">
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
                  : "अनावश्यक या गैर-प्रमाणित टॉनिक खरीदने से बचें।"}
              </p>
            )}
          </div>

          {/* Section: Talk to an Expert (No icons next to headings, outlined buttons) */}
          <div className="bg-white rounded-[6px] p-5 sm:p-6 border border-[#2B2118]/25 space-y-4 text-left">
            <div className="border-b border-[#2B2118]/15 pb-2">
              <h3 className="font-heading text-lg font-bold text-[#2B2118]">
                {t("result_sec_expert")}
              </h3>
            </div>

            <p className="text-xs text-[#2B2118]/80 font-medium">
              {t("result_expert_sub")}
            </p>

            <div className="space-y-3 pt-1">
              {/* Kisan Call Centre (Outlined button) */}
              <div className="border border-[#2F5D3A]/30 rounded-[6px] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2F5D3A]">
                      {t("result_expert_kcc_title")}
                    </span>
                    <p className="font-heading text-2xl font-bold text-[#2B2118] tracking-wide">
                      1800-180-1551
                    </p>
                  </div>
                  <a
                    href="tel:18001801551"
                    className="min-h-[44px] h-11 flex items-center justify-center gap-2 border border-[#2F5D3A] text-[#2F5D3A] hover:bg-[#2F5D3A]/10 font-bold text-sm px-5 rounded-[6px] transition-colors cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4 shrink-0" />
                    <span>{t("result_expert_kcc_call_action")}</span>
                  </a>
                </div>
                <p className="text-xs text-[#2B2118]/75 leading-relaxed border-t border-[#2B2118]/15 pt-2">
                  {t("result_expert_kcc_timing")}
                </p>
              </div>

              {/* Link to find Nearest Krishi Vigyan Kendra (Outlined button) */}
              <div className="border border-[#2B2118]/25 rounded-[6px] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#2B2118]/70">
                      ICAR Krishi Vigyan Kendra
                    </span>
                    <p className="font-heading text-base font-bold text-[#2B2118] leading-tight">
                      {t("result_expert_kvk_btn")}
                    </p>
                  </div>
                  <a
                    href="https://kvk.icar.gov.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] h-11 flex items-center justify-center gap-2 border border-[#2B2118]/25 hover:bg-[#2B2118]/5 text-[#2B2118] font-bold text-sm px-4 rounded-[6px] transition-colors cursor-pointer"
                  >
                    <span>{language === "en" ? "Locate KVK" : "केन्द्र खोजें"}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[#2B2118]/70" />
                  </a>
                </div>
                <p className="text-xs text-[#2B2118]/75 leading-relaxed border-t border-[#2B2118]/15 pt-2">
                  {t("result_expert_kvk_desc")}
                </p>
              </div>
            </div>
          </div>

          {/* Section: Prevention tips (No icon next to heading) */}
          <div className="bg-white rounded-[6px] p-5 sm:p-6 border border-[#2B2118]/25 space-y-3 text-left">
            <div className="border-b border-[#2B2118]/15 pb-2">
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
                  : "खेत में स्वच्छता और सही सिंचाई का ध्यान रखें।"}
              </p>
            )}
          </div>
        </>
      )}

      {/* Bottom Home CTA: Plain link (Rule 6) */}
      <div className="pt-2 text-left">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2B2118]/80 hover:text-[#2B2118] underline"
        >
          <ArrowLeft className="w-4 h-4 shrink-0 text-[#2B2118]/70" />
          <span>{t("result_btn_home")}</span>
        </Link>
      </div>
    </div>
  );
}
