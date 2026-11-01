import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export interface CostEstimate {
  local_remedy_cost_inr: string;
  chemical_cost_inr: string;
  savings_summary?: string;
}

export interface CropDiagnosisResult {
  is_plant: boolean;
  problem_name: string;
  problem_type: "disease" | "pest" | "nutrient_deficiency" | "healthy";
  confidence: number;
  cause: string;
  symptoms_seen: string[];
  cheap_local_remedy: string[];
  chemical_option: string[];
  do_not_buy: string[];
  prevention: string[];
  cost_estimate?: CostEstimate;
  timing_ms?: number;
}

const VALID_PROBLEM_TYPES = [
  "disease",
  "pest",
  "nutrient_deficiency",
  "healthy",
] as const;

const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  mr: "Marathi (मराठी)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  gu: "Gujarati (ગુજરાતી)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
};

const FRIENDLY_HIGH_DEMAND_MESSAGES: Record<string, string> = {
  hi: "अभी सर्वर पर बहुत लोड है, 1 मिनट बाद दोबारा कोशिश करें",
  en: "Server is busy right now. Please try again in 1 minute.",
  mr: "सर्व्हरवर सध्या खूप लोड आहे, कृपया १ मिनिटानंतर पुन्हा प्रयत्न करा.",
  pa: "ਸਰਵਰ 'ਤੇ ਇਸ ਵੇਲੇ ਬਹੁਤ ਲੋਡ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ 1 ਮਿੰਟ ਬਾਅਦ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
  gu: "હાલમાં સર્વર પર ઘણો લોડ છે, કૃપા કરીને 1 મિનિટ પછી ફરી પ્રયાસ કરો.",
  ta: "சர்வரில் தற்போது அதிக சுமை உள்ளது, தயவுசெய்து 1 நிமிடம் கழித்து மீண்டும் முயற்சிக்கவும்.",
  te: "సర్వర్‌పై ప్రస్తుతం రద్దీ ఎక్కువగా ఉంది, దయచేసి 1 నిమిషం తర్వాత మళ్లీ ప్రయత్నించండి.",
};

function getFriendlyHighDemandMessage(lang: string = "hi"): string {
  const normalized = (lang || "").toLowerCase().trim();
  return (
    FRIENDLY_HIGH_DEMAND_MESSAGES[normalized] ||
    FRIENDLY_HIGH_DEMAND_MESSAGES.hi
  );
}

// Strict Gemini JSON Response Schema
const CROP_DIAGNOSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_plant: { type: "BOOLEAN" },
    problem_name: { type: "STRING" },
    problem_type: {
      type: "STRING",
      enum: ["disease", "pest", "nutrient_deficiency", "healthy"],
    },
    confidence: { type: "INTEGER" },
    cause: { type: "STRING" },
    symptoms_seen: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    cheap_local_remedy: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    chemical_option: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    do_not_buy: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    prevention: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    cost_estimate: {
      type: "OBJECT",
      properties: {
        local_remedy_cost_inr: { type: "STRING" },
        chemical_cost_inr: { type: "STRING" },
        savings_summary: { type: "STRING" },
      },
      required: ["local_remedy_cost_inr", "chemical_cost_inr"],
    },
  },
  required: [
    "is_plant",
    "problem_name",
    "problem_type",
    "confidence",
    "cause",
    "symptoms_seen",
    "cheap_local_remedy",
    "chemical_option",
    "do_not_buy",
    "prevention",
  ],
};

function sanitizeAndValidate(raw: unknown, timingMs: number): CropDiagnosisResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid response format: expected a JSON object");
  }

  const obj = raw as Record<string, unknown>;
  const is_plant = Boolean(obj.is_plant);

  // If not a plant or image is too blurry
  if (!is_plant) {
    return {
      is_plant: false,
      problem_name:
        typeof obj.problem_name === "string" && obj.problem_name.trim()
          ? obj.problem_name
          : "Ye patte ki photo nahi lag rahi",
      problem_type: "healthy",
      confidence: 0,
      cause:
        typeof obj.cause === "string" && obj.cause.trim()
          ? obj.cause
          : "Patte ko paas se, achhi roshni mein, saaf photo lein.",
      symptoms_seen: [],
      cheap_local_remedy: [],
      chemical_option: [],
      do_not_buy: [],
      prevention: [],
      timing_ms: timingMs,
    };
  }

  // Validate problem_type
  let problem_type: CropDiagnosisResult["problem_type"] = "disease";
  if (
    typeof obj.problem_type === "string" &&
    VALID_PROBLEM_TYPES.includes(obj.problem_type as CropDiagnosisResult["problem_type"])
  ) {
    problem_type = obj.problem_type as CropDiagnosisResult["problem_type"];
  }

  // Validate confidence (0 - 100)
  let confidence = Number(obj.confidence);
  if (isNaN(confidence) || confidence < 0) confidence = 50;
  if (confidence > 100) confidence = 100;
  confidence = Math.round(confidence);

  // Validate or construct cost_estimate (per acre)
  let cost_estimate: CostEstimate | undefined = undefined;
  if (typeof obj.cost_estimate === "object" && obj.cost_estimate !== null) {
    const ce = obj.cost_estimate as Record<string, unknown>;
    cost_estimate = {
      local_remedy_cost_inr:
        typeof ce.local_remedy_cost_inr === "string" && ce.local_remedy_cost_inr.trim()
          ? ce.local_remedy_cost_inr.trim()
          : "₹50 - ₹150",
      chemical_cost_inr:
        typeof ce.chemical_cost_inr === "string" && ce.chemical_cost_inr.trim()
          ? ce.chemical_cost_inr.trim()
          : "₹450 - ₹800",
      savings_summary:
        typeof ce.savings_summary === "string" && ce.savings_summary.trim()
          ? ce.savings_summary.trim()
          : undefined,
    };
  } else if (problem_type !== "healthy") {
    cost_estimate = {
      local_remedy_cost_inr: "₹50 - ₹150",
      chemical_cost_inr: "₹450 - ₹800",
      savings_summary: "देसी उपाय अपनाने से प्रति एकड़ ₹300-600 की बचत हो सकती है",
    };
  }

  return {
    is_plant: true,
    problem_name:
      typeof obj.problem_name === "string" && obj.problem_name.trim()
        ? obj.problem_name
        : "Crop Condition Detected",
    problem_type,
    confidence,
    cause:
      typeof obj.cause === "string" && obj.cause.trim()
        ? obj.cause
        : "Spots or marks observed on the leaf show a crop problem.",
    symptoms_seen: Array.isArray(obj.symptoms_seen)
      ? obj.symptoms_seen.map(String).slice(0, 2)
      : [],
    cheap_local_remedy: Array.isArray(obj.cheap_local_remedy)
      ? obj.cheap_local_remedy.map(String).slice(0, 3)
      : [],
    chemical_option: Array.isArray(obj.chemical_option)
      ? obj.chemical_option.map(String).slice(0, 3)
      : [],
    do_not_buy: Array.isArray(obj.do_not_buy)
      ? obj.do_not_buy.map(String).slice(0, 3)
      : [],
    prevention: Array.isArray(obj.prevention)
      ? obj.prevention.map(String).slice(0, 3)
      : [],
    cost_estimate,
    timing_ms: timingMs,
  };
}

export async function POST(req: NextRequest) {
  const serverStartTime = Date.now();
  let reqLanguage = "hi";

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KE;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY environment variable is missing in .env.local. Please configure your Gemini API key.",
        },
        { status: 500 }
      );
    }

    // 1. MEASURE REQUEST PARSE TIME
    const body = await req.json();
    const parseTimeMs = Date.now() - serverStartTime;
    console.log(`[CropScan API] Request JSON parsed in ${parseTimeMs}ms`);

    const {
      image,
      crop,
      language,
      days_since_symptoms,
      field_spread,
      recent_chemicals,
      context,
    } = body;

    if (typeof language === "string" && language.trim()) {
      reqLanguage = language.trim();
    }

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Image is required (base64 string)." },
        { status: 400 }
      );
    }

    const selectedCrop = typeof crop === "string" && crop.trim() ? crop.trim() : "Crop";
    const langKey = typeof language === "string" ? language.toLowerCase().trim() : "hi";
    const targetLanguageName = LANGUAGE_MAP[langKey] || language || "Hindi";

    const daysSince =
      days_since_symptoms || context?.days_since_symptoms || "Not specified";
    const spread =
      field_spread || context?.field_spread || "Not specified";
    const chemicals =
      recent_chemicals || context?.recent_chemicals || "None reported";

    // Clean base64 data
    let mimeType = "image/jpeg";
    let base64Data = image;

    const dataUrlMatch = image.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    // 3. SHORTENED PROMPT (Max 15 words per sentence, max 3 items per list, max 2 symptoms)
    const compactSystemPrompt = `Expert plant pathologist. Diagnose this leaf photo for a farmer.
Crop: "${selectedCrop}". Target Farmer Language: "${targetLanguageName}".
Field context: Days since started: ${daysSince}, Area affected: ${spread}, Recent spray: ${chemicals}.

RULES:
1. All string values MUST be in ${targetLanguageName} (native script). JSON keys stay in English.
2. If NOT a plant leaf or too blurry to identify: set "is_plant": false, "confidence": 0, "problem_name": "Ye patte ki photo nahi lagti" (in ${targetLanguageName}), empty lists.
3. If a crop leaf: identify disease, pest, nutrient deficiency, or healthy.
4. Output MUST be short and concise:
   - Each sentence max 15 words.
   - Max 2 symptoms in symptoms_seen.
   - Max 3 items in cheap_local_remedy, chemical_option, do_not_buy, and prevention.
   - No long paragraphs. Simple farmer language.
5. In cost_estimate, give approximate INR per acre (e.g. "₹50 - ₹150" and "₹450 - ₹800").`;

    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const fallbackModel =
      process.env.GEMINI_FALLBACK_MODEL ||
      (primaryModel === "gemini-3.8-flash" ? "gemini-3.5-flash-lite" : "gemini-3.5-flash");

    const TIMEOUT_MS = 15000; // 15 seconds per attempt
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    interface GeminiApiResponse {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
      error?: {
        message?: string;
        code?: number;
        status?: string;
      };
    }

    // Helper to call model with AbortController timeout & optional thinkingConfig
    const callModel = async (
      modelName: string,
      includeThinking: boolean = true
    ): Promise<Response> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const generationConfig: Record<string, unknown> = {
        responseMimeType: "application/json",
        responseSchema: CROP_DIAGNOSIS_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 900,
      };

      if (includeThinking) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: compactSystemPrompt,
              },
            ],
          },
        ],
        generationConfig,
      };

      try {
        return await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    };

    // Invocation wrapper: handles 15s timeout, 400 rejection of thinkingConfig, and single 1s retry on 503/429
    const executeModelAttempt = async (
      modelName: string,
      attemptTag: string
    ): Promise<{ res: Response | null; data: GeminiApiResponse | null; error: string }> => {
      let includeThinking = true;

      for (let retry = 0; retry <= 1; retry++) {
        if (retry > 0) {
          console.warn(`[CropScan API] Retrying ${modelName} after 1s delay on high demand...`);
          await sleep(1000);
        }

        const callStart = Date.now();
        try {
          let res = await callModel(modelName, includeThinking);
          let callDuration = Date.now() - callStart;

          // If rejected with 400 (e.g. model does not support thinkingConfig), immediately retry without it
          if (res.status === 400 && includeThinking) {
            console.warn(
              `[CropScan API] Model ${modelName} returned 400 with thinkingConfig. Retrying without thinkingConfig immediately...`
            );
            includeThinking = false;
            const subStart = Date.now();
            res = await callModel(modelName, false);
            callDuration += Date.now() - subStart;
          }

          console.log(
            `[CropScan API] Call to "${modelName}" (${attemptTag}, try ${retry + 1}) took ${callDuration}ms (HTTP ${res.status})`
          );

          if (res.ok) {
            const data: GeminiApiResponse = await res.json();
            return { res, data, error: "" };
          }

          if (res.status === 503 || res.status === 429) {
            // Retry once on 503 or 429
            continue;
          }

          // Non-retryable status (e.g. 404, bad argument), return error immediately
          return { res, data: null, error: `HTTP ${res.status}` };
        } catch (fetchErr: unknown) {
          const callDuration = Date.now() - callStart;
          const isTimeout =
            fetchErr instanceof Error &&
            (fetchErr.name === "AbortError" || fetchErr.message.includes("timeout"));
          const reason = isTimeout ? "timeout (15s exceeded)" : (fetchErr instanceof Error ? fetchErr.message : "network failure");
          console.warn(`[CropScan API] "${modelName}" (${attemptTag}) failed after ${callDuration}ms: ${reason}`);

          // On timeout or network failure, do not spend more time on slow model, switch immediately
          return { res: null, data: null, error: reason };
        }
      }

      return { res: null, data: null, error: "high demand (503/429) after retry" };
    };

    let geminiRes: Response | null = null;
    let geminiData: GeminiApiResponse | null = null;
    let lastErrorReason = "";

    // 5. TRY PRIMARY MODEL (15s timeout, 1 retry max)
    console.log(`[CropScan API] Starting diagnosis with primary model: "${primaryModel}"`);
    const primaryAttempt = await executeModelAttempt(primaryModel, "primary");
    if (primaryAttempt.res && primaryAttempt.data) {
      geminiRes = primaryAttempt.res;
      geminiData = primaryAttempt.data;
    } else {
      lastErrorReason = primaryAttempt.error;
      console.warn(
        `[CropScan API] Primary model "${primaryModel}" failed (${lastErrorReason}). Switching immediately to fallback model: "${fallbackModel}"`
      );

      // Check remaining server budget (Total 40s budget)
      if (Date.now() - serverStartTime < 36000) {
        const fallbackAttempt = await executeModelAttempt(fallbackModel, "fallback");
        if (fallbackAttempt.res && fallbackAttempt.data) {
          geminiRes = fallbackAttempt.res;
          geminiData = fallbackAttempt.data;
          console.log(`[CropScan API] Fallback model "${fallbackModel}" succeeded.`);
        } else {
          lastErrorReason = fallbackAttempt.error;
        }
      }
    }

    // Total server duration so far
    const totalServerMs = Date.now() - serverStartTime;

    // Handle failure of both models
    if (!geminiRes || !geminiData) {
      console.warn(
        `[CropScan API] Both models failed after ${totalServerMs}ms. Reason: ${lastErrorReason}. Returning friendly high-demand message.`
      );
      const friendlyMessage = getFriendlyHighDemandMessage(langKey);
      return NextResponse.json(
        {
          error: friendlyMessage,
          is_server_busy: true,
          timing_ms: totalServerMs,
        },
        { status: 503 }
      );
    }

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      console.warn(`[CropScan API] Received empty candidate text after ${totalServerMs}ms.`);
      const friendlyMessage = getFriendlyHighDemandMessage(langKey);
      return NextResponse.json(
        { error: friendlyMessage, is_server_busy: true, timing_ms: totalServerMs },
        { status: 503 }
      );
    }

    // Clean JSON string (responseSchema returns clean JSON directly, but strip any markdown wrappers just in case)
    const cleanedJsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(cleanedJsonStr);
    } catch (parseError) {
      console.error(`[CropScan API] Failed to parse JSON (${totalServerMs}ms):`, rawText, parseError);
      const friendlyMessage = getFriendlyHighDemandMessage(langKey);
      return NextResponse.json(
        {
          error: friendlyMessage,
          is_server_busy: true,
          timing_ms: totalServerMs,
        },
        { status: 502 }
      );
    }

    // Validate and sanitize the output strictly against the required shape, attach timing_ms
    const validatedResult = sanitizeAndValidate(parsedResult, totalServerMs);
    console.log(`[CropScan API] Total server execution time: ${totalServerMs}ms`);

    return NextResponse.json(validatedResult);
  } catch (error: unknown) {
    const totalServerMs = Date.now() - serverStartTime;
    console.error(`[CropScan API] Unexpected error after ${totalServerMs}ms:`, error);
    const friendlyMessage = getFriendlyHighDemandMessage(reqLanguage);
    return NextResponse.json(
      { error: friendlyMessage, is_server_busy: true, timing_ms: totalServerMs },
      { status: 503 }
    );
  }
}
