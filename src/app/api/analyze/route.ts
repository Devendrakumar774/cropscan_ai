import { NextRequest, NextResponse } from "next/server";

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

function sanitizeAndValidate(raw: unknown): CropDiagnosisResult {
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
      ? obj.symptoms_seen.map(String)
      : [],
    cheap_local_remedy: Array.isArray(obj.cheap_local_remedy)
      ? obj.cheap_local_remedy.map(String)
      : [],
    chemical_option: Array.isArray(obj.chemical_option)
      ? obj.chemical_option.map(String)
      : [],
    do_not_buy: Array.isArray(obj.do_not_buy)
      ? obj.do_not_buy.map(String)
      : [],
    prevention: Array.isArray(obj.prevention)
      ? obj.prevention.map(String)
      : [],
    cost_estimate,
  };
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
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

    // Extract mime type and clean base64 data
    let mimeType = "image/jpeg";
    let base64Data = image;

    const dataUrlMatch = image.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    const systemPrompt = `You are an expert agricultural plant pathologist and agronomist.
A farmer has submitted a leaf photograph for crop diagnosis.
Declared Crop: "${selectedCrop}".
Target Farmer Language: "${targetLanguageName}".

Farmer's Additional Field Context:
- Days since symptoms started: ${daysSince}
- Field area affected: ${spread}
- Recent fertilizer or pesticide application: ${chemicals}

* Diagnostic Guidance:
- Use this additional context to refine your diagnosis. For example: rapid onset (1-3 days) across "Most" of the field suggests aggressive blight or chemical burn. Symptoms appearing right after fertilizer/spray could indicate phytotoxicity or chemical scorch. Long duration (7+ days) with a few plants affected indicates slower-moving pathogens or soil nutrient deficiencies.

CRITICAL LANGUAGE REQUIREMENT:
You MUST write ALL string values in the JSON output strictly in ${targetLanguageName} (using the native script and vocabulary of ${targetLanguageName} that local farmers understand).
Keep ALL JSON keys in English as specified in the schema.

Instructions:
1. Examine the image carefully.
   - If the image does NOT show a plant/crop leaf, or if it is too blurry, too dark, out of focus, or indecipherable:
     Return:
     {
       "is_plant": false,
       "problem_name": "Ye patte ki photo nahi lag rahi",
       "problem_type": "healthy",
       "confidence": 0,
       "cause": "Patte ko paas se, achhi roshni mein, saaf photo lein.",
       "symptoms_seen": [],
       "cheap_local_remedy": [],
       "chemical_option": [],
       "do_not_buy": [],
       "prevention": []
     }
     (Note: write the string values of problem_name and cause translated naturally into ${targetLanguageName})

2. If the image IS a crop leaf:
   - Identify whether it is healthy or affected by a fungal/bacterial/viral disease, insect/pest damage, or nutrient deficiency.
   - "problem_name": Specific disease/deficiency name in ${targetLanguageName} (can include common/scientific name in parentheses).
   - "problem_type": STRICTLY one of: "disease", "pest", "nutrient_deficiency", "healthy".
   - "confidence": Integer 0 to 100 representing confidence score.
   - "cause": Detailed, simple explanation in ${targetLanguageName} of the biological or soil cause.
   - "symptoms_seen": Array of specific visual symptoms in ${targetLanguageName} spotted on this leaf.
   - "cheap_local_remedy": Array of affordable, organic, or household remedies in ${targetLanguageName} (e.g., neem oil, sour buttermilk, bio-fungicides).
   - "chemical_option": Array of standard chemical treatments / fertilizers in ${targetLanguageName} with active ingredient and dosage (e.g. spray dosage per liter).
   - "do_not_buy": Array of unnecessary or overpriced chemicals/tonics in ${targetLanguageName} that shopkeepers wrongly sell for this issue.
   - "prevention": Array of agricultural cultural practices in ${targetLanguageName} to avoid this problem in future crop cycles.
   - "cost_estimate": An object estimating approximate treatment cost in Indian Rupees (INR) per acre:
     {
       "local_remedy_cost_inr": "Approximate INR range for cheap/local remedy per acre (e.g. '₹50 - ₹150' or '₹50 - ₹150 / एकड़' written in ${targetLanguageName})",
       "chemical_cost_inr": "Approximate INR range for chemical option per acre (e.g. '₹450 - ₹800' or '₹450 - ₹800 / एकड़' written in ${targetLanguageName})",
       "savings_summary": "One sentence in ${targetLanguageName} comparing cost and highlighting potential farmer savings per acre"
     }

You MUST return STRICT JSON adhering directly to the required schema with no extra commentary or markdown.`;

    const requestBody = {
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
              text: systemPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.15,
      },
    };

    const primaryModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const fallbackModel =
      process.env.GEMINI_FALLBACK_MODEL ||
      (primaryModel === "gemini-3.8-flash" ? "gemini-2.5-flash" : "gemini-3.8-flash");

    const BACKOFF_DELAYS = [1000, 2000, 4000];
    const TIMEOUT_MS = 25000;
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const callModelWithTimeout = async (model: string): Promise<Response> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        return await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    };

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

    let geminiRes: Response | null = null;
    let geminiData: GeminiApiResponse | null = null;
    let lastErrorReason = "";

    // 1. Primary Model: Initial attempt + up to 3 retries with exponential backoff (1s, 2s, 4s) on 503, 429, or timeout
    for (let attempt = 0; attempt <= 3; attempt++) {
      if (attempt > 0) {
        const delay = BACKOFF_DELAYS[attempt - 1] || 4000;
        console.warn(
          `[Gemini API] Primary model "${primaryModel}" encountered temporary error (${lastErrorReason}). Retrying ${attempt}/3 with exponential backoff after ${delay}ms...`
        );
        await sleep(delay);
      }

      try {
        const res = await callModelWithTimeout(primaryModel);
        if (res.ok) {
          geminiRes = res;
          geminiData = await res.json();
          break;
        }

        lastErrorReason = `HTTP ${res.status}`;

        // Retry when Gemini returns 503 (high demand) or 429 (rate limit)
        if (res.status === 503 || res.status === 429) {
          continue;
        }

        // For non-retryable client errors (like 404 or bad parameter), break early to fallback model
        console.warn(
          `[Gemini API] Primary model "${primaryModel}" returned non-transient status ${res.status}. Switching to fallback model.`
        );
        break;
      } catch (fetchErr: unknown) {
        const isTimeout =
          fetchErr instanceof Error &&
          (fetchErr.name === "AbortError" || fetchErr.message.includes("timeout"));
        lastErrorReason = isTimeout ? "network timeout (25s)" : (fetchErr instanceof Error ? fetchErr.message : "network failure");
        console.warn(
          `[Gemini API] Network issue on primary model "${primaryModel}": ${lastErrorReason}.`
        );
        continue;
      }
    }

    // 2. If primary model still fails, fall back to GEMINI_FALLBACK_MODEL and retry once
    if (!geminiRes) {
      console.warn(
        `[Gemini API] Primary model "${primaryModel}" failed after all attempts. Falling back to second model GEMINI_FALLBACK_MODEL ("${fallbackModel}")...`
      );

      for (let fbAttempt = 0; fbAttempt <= 1; fbAttempt++) {
        if (fbAttempt > 0) {
          console.warn(
            `[Gemini API] Retrying fallback model "${fallbackModel}" after 2000ms (previous: ${lastErrorReason})...`
          );
          await sleep(2000);
        }

        try {
          const res = await callModelWithTimeout(fallbackModel);
          if (res.ok) {
            geminiRes = res;
            geminiData = await res.json();
            console.warn(
              `[Gemini API] Fallback model "${fallbackModel}" successfully processed the diagnosis.`
            );
            break;
          }

          lastErrorReason = `HTTP ${res.status}`;
          if (res.status === 503 || res.status === 429) {
            continue;
          }
          break;
        } catch (fbErr: unknown) {
          const isTimeout =
            fbErr instanceof Error &&
            (fbErr.name === "AbortError" || fbErr.message.includes("timeout"));
          lastErrorReason = isTimeout ? "network timeout (25s)" : (fbErr instanceof Error ? fbErr.message : "network failure");
          console.warn(
            `[Gemini API] Network issue on fallback model "${fallbackModel}": ${lastErrorReason}.`
          );
          continue;
        }
      }
    }

    // 3. If everything fails, return friendly JSON error in selected language
    if (!geminiRes || !geminiData) {
      console.warn(
        `[Gemini API] All attempts failed across primary ("${primaryModel}") and fallback ("${fallbackModel}"). Reason: ${lastErrorReason}. Returning friendly high-demand message.`
      );
      const friendlyMessage = getFriendlyHighDemandMessage(langKey);
      return NextResponse.json(
        {
          error: friendlyMessage,
          is_server_busy: true,
        },
        { status: 503 }
      );
    }

    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      console.warn("[Gemini API] Received empty candidate text from Gemini.");
      const friendlyMessage = getFriendlyHighDemandMessage(langKey);
      return NextResponse.json(
        { error: friendlyMessage, is_server_busy: true },
        { status: 503 }
      );
    }

    // Parse JSON safely
    const cleanedJsonStr = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(cleanedJsonStr);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON:", rawText);
      const friendlyMessage = getFriendlyHighDemandMessage(langKey);
      return NextResponse.json(
        {
          error: friendlyMessage,
          is_server_busy: true,
        },
        { status: 502 }
      );
    }

    // Validate and sanitize the output strictly against the required shape
    const validatedResult = sanitizeAndValidate(parsedResult);

    return NextResponse.json(validatedResult);
  } catch (error: unknown) {
    console.error("Analysis API unexpected error:", error);
    const friendlyMessage = getFriendlyHighDemandMessage(reqLanguage);
    return NextResponse.json({ error: friendlyMessage, is_server_busy: true }, { status: 503 });
  }
}
