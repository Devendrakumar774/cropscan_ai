import { createClient } from "@supabase/supabase-js";
import type { CropDiagnosisResult } from "@/app/api/analyze/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ScanRecord {
  id: string;
  user_id?: string;
  crop: string;
  problem_name: string;
  problem_type: "disease" | "pest" | "nutrient_deficiency" | "healthy";
  confidence: number;
  result_json: CropDiagnosisResult;
  image_url: string | null;
  created_at: string;
}

const LOCAL_STORAGE_SCANS_KEY = "cropscan_saved_scans";

/**
 * Uploads compressed leaf image to Supabase Storage bucket 'crop-images'
 */
export async function uploadCropImage(file: File | Blob): Promise<string | null> {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not found. Skipping cloud storage upload.");
    return null;
  }

  try {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomStr}.jpg`;

    const { data, error } = await supabase.storage
      .from("crop-images")
      .upload(fileName, file, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.warn("Supabase storage upload error:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from("crop-images")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl || null;
  } catch (err) {
    console.warn("Error uploading crop image to Supabase:", err);
    return null;
  }
}

/**
 * Saves a new scan to the 'scans' table and mirrors in localStorage
 */
export async function saveScanRecord(params: {
  crop: string;
  problem_name: string;
  problem_type: "disease" | "pest" | "nutrient_deficiency" | "healthy";
  confidence: number;
  result_json: CropDiagnosisResult;
  image_url: string | null;
  user_id?: string;
}): Promise<ScanRecord> {
  const newRecord: ScanRecord = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    user_id: params.user_id || "anonymous",
    crop: params.crop,
    problem_name: params.problem_name,
    problem_type: params.problem_type,
    confidence: params.confidence,
    result_json: params.result_json,
    image_url: params.image_url,
    created_at: new Date().toISOString(),
  };

  // Try saving to Supabase
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const { data, error } = await supabase
        .from("scans")
        .insert([
          {
            crop: params.crop,
            problem_name: params.problem_name,
            problem_type: params.problem_type,
            confidence: params.confidence,
            result_json: params.result_json,
            image_url: params.image_url,
            user_id: params.user_id || "anonymous",
          },
        ])
        .select()
        .single();

      if (!error && data) {
        newRecord.id = data.id;
        newRecord.created_at = data.created_at;
      } else if (error) {
        console.warn("Supabase table insert error:", error.message);
      }
    } catch (err) {
      console.warn("Failed to insert into Supabase scans table:", err);
    }
  }

  // Backup in localStorage
  if (typeof window !== "undefined") {
    try {
      const storageKey = params.user_id && params.user_id !== "anonymous"
        ? `${LOCAL_STORAGE_SCANS_KEY}_${params.user_id}`
        : LOCAL_STORAGE_SCANS_KEY;
      const existingStr = localStorage.getItem(storageKey);
      const existing: ScanRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [newRecord, ...existing.filter((s) => s.id !== newRecord.id)];
      localStorage.setItem(storageKey, JSON.stringify(updated.slice(0, 50)));
    } catch (localErr) {
      console.warn("Failed to save to local backup:", localErr);
    }
  }

  return newRecord;
}

/**
 * Fetches scans from Supabase 'scans' table, filtered by user_id if provided, with localStorage fallback
 */
export async function getScanHistory(userId?: string): Promise<ScanRecord[]> {
  let supabaseRecords: ScanRecord[] = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      let query = supabase.from("scans").select("*");
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        supabaseRecords = data as ScanRecord[];
      } else if (error) {
        console.warn("Supabase fetch scans error:", error.message);
      }
    } catch (err) {
      console.warn("Error fetching from Supabase:", err);
    }
  }

  const storageKey = userId && userId !== "anonymous"
    ? `${LOCAL_STORAGE_SCANS_KEY}_${userId}`
    : LOCAL_STORAGE_SCANS_KEY;

  // If Supabase returns records, sync to localStorage and return
  if (supabaseRecords.length > 0) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(supabaseRecords.slice(0, 50)));
      } catch {
        // ignore
      }
    }
    return supabaseRecords;
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem(storageKey);
      if (localStr) {
        return JSON.parse(localStr) as ScanRecord[];
      }
    } catch {
      // ignore
    }
  }

  return [];
}

/**
 * Deletes a scan record by id from Supabase and localStorage
 */
export async function deleteScanRecord(
  id: string,
  imageUrl?: string | null,
  userId?: string
): Promise<boolean> {
  let success = false;

  // Delete from Supabase
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const { error } = await supabase.from("scans").delete().eq("id", id);
      if (!error) {
        success = true;
      } else {
        console.warn("Supabase delete scan error:", error.message);
      }

      // If image URL is in crop-images storage, delete file
      if (imageUrl && imageUrl.includes("/crop-images/")) {
        const parts = imageUrl.split("/crop-images/");
        const filePath = parts[1];
        if (filePath) {
          await supabase.storage.from("crop-images").remove([filePath]);
        }
      }
    } catch (err) {
      console.warn("Error deleting scan from Supabase:", err);
    }
  }

  // Delete from localStorage
  if (typeof window !== "undefined") {
    try {
      const storageKey = userId && userId !== "anonymous"
        ? `${LOCAL_STORAGE_SCANS_KEY}_${userId}`
        : LOCAL_STORAGE_SCANS_KEY;
      const localStr = localStorage.getItem(storageKey);
      if (localStr) {
        const list: ScanRecord[] = JSON.parse(localStr);
        const filtered = list.filter((s) => s.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(filtered));
        success = true;
      }
    } catch {
      // ignore
    }
  }

  return success;
}

export interface DashboardStats {
  isSample: boolean;
  totalScans: number;
  healthyCount: number;
  diseaseCount: number;
  pestCount: number;
  deficiencyCount: number;
  topProblems: {
    name: string;
    count: number;
    percentage: number;
    problem_type: string;
  }[];
  scansByCrop: {
    crop: string;
    count: number;
    percentage: number;
  }[];
}

export async function getDashboardStats(userId?: string): Promise<DashboardStats> {
  const records = await getScanHistory(userId);

  if (!records || records.length === 0) {
    return {
      isSample: false,
      totalScans: 0,
      healthyCount: 0,
      diseaseCount: 0,
      pestCount: 0,
      deficiencyCount: 0,
      topProblems: [],
      scansByCrop: [],
    };
  }

  const totalScans = records.length;
  let healthyCount = 0;
  let diseaseCount = 0;
  let pestCount = 0;
  let deficiencyCount = 0;

  const problemMap: Record<string, { count: number; type: string }> = {};
  const cropMap: Record<string, number> = {};

  for (const scan of records) {
    // Problem type counts
    if (scan.problem_type === "healthy") healthyCount++;
    else if (scan.problem_type === "disease") diseaseCount++;
    else if (scan.problem_type === "pest") pestCount++;
    else if (scan.problem_type === "nutrient_deficiency") deficiencyCount++;
    else diseaseCount++;

    // Problem names
    const pName = scan.problem_name || "Unknown Problem";
    if (!problemMap[pName]) {
      problemMap[pName] = { count: 0, type: scan.problem_type };
    }
    problemMap[pName].count += 1;

    // Crops
    const cName = scan.crop || "Other Crop";
    cropMap[cName] = (cropMap[cName] || 0) + 1;
  }

  // Top 5 problems
  const topProblems = Object.entries(problemMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, val]) => ({
      name,
      count: val.count,
      percentage: Math.round((val.count / totalScans) * 100),
      problem_type: val.type,
    }));

  // Scans by crop
  const scansByCrop = Object.entries(cropMap)
    .sort((a, b) => b[1] - a[1])
    .map(([crop, count]) => ({
      crop,
      count,
      percentage: Math.round((count / totalScans) * 100),
    }));

  return {
    isSample: false,
    totalScans,
    healthyCount,
    diseaseCount,
    pestCount,
    deficiencyCount,
    topProblems,
    scansByCrop,
  };
}

