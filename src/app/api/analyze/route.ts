import { NextRequest, NextResponse } from "next/server";

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
          : "Photo is not a clear plant leaf",
      problem_type: "healthy",
      confidence: 0,
      cause:
        typeof obj.cause === "string" && obj.cause.trim()
          ? obj.cause
          : "The uploaded photo does not clearly show a recognizable crop leaf or is too blurry. Please take a clear photo in daylight.",
      symptoms_seen: Array.isArray(obj.symptoms_seen)
        ? obj.symptoms_seen.map(String)
        : [],
      cheap_local_remedy: [],
      chemical_option: [],
      do_not_buy: [],
      prevention: Array.isArray(obj.prevention)
        ? obj.prevention.map(String)
        : [
          "Ensure proper camera focus on the leaf",
          "Take photo in daylight",
          "Keep one leaf per photo",
        ],
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
        : "Symptoms observed on the leaf indicate an agricultural issue.",
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
  };
}

export async function POST(req: NextRequest) {
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

    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
       "problem_name": "<Explain in ${targetLanguageName} that photo is not a clear plant or is blurry>",
       "problem_type": "healthy",
       "confidence": 0,
       "cause": "<Helpful guidance in ${targetLanguageName} to take a clearer leaf photo in daylight>",
       "symptoms_seen": [],
       "cheap_local_remedy": [],
       "chemical_option": [],
       "do_not_buy": [],
       "prevention": ["<Tip 1 in ${targetLanguageName}>", "<Tip 2 in ${targetLanguageName}>"]
     }

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

    // Helper to call Gemini API
    const callGemini = async (model: string) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      return await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    };

    let geminiRes = await callGemini(modelName);

    // If model returned 404 or unavailable, attempt fallback to gemini-flash-latest or gemini-3.8-flash
    if (!geminiRes.ok && (geminiRes.status === 404 || geminiRes.status === 503)) {
      const fallbackModel = modelName === "gemini-3.8-flash" ? "gemini-flash-latest" : "gemini-3.8-flash";
      console.warn(`Primary model ${modelName} returned status ${geminiRes.status}. Retrying with ${fallbackModel}...`);
      const fallbackRes = await callGemini(fallbackModel);
      if (fallbackRes.ok) {
        geminiRes = fallbackRes;
      }
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error(`Gemini API error [${geminiRes.status}]:`, errText);
      let parsedErr: { error?: { message?: string } } | null = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {
        // ignore
      }
      return NextResponse.json(
        {
          error:
            parsedErr?.error?.message ||
            `Gemini API request failed with status ${geminiRes.status}`,
        },
        { status: geminiRes.status >= 400 && geminiRes.status < 500 ? geminiRes.status : 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      return NextResponse.json(
        { error: "Gemini returned an empty response. Please try with another leaf photo." },
        { status: 502 }
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
      return NextResponse.json(
        {
          error: "Failed to parse model response as JSON.",
          raw: rawText,
        },
        { status: 502 }
      );
    }

    // Validate and sanitize the output strictly against the required shape
    const validatedResult = sanitizeAndValidate(parsedResult);

    return NextResponse.json(validatedResult);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Analysis API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
