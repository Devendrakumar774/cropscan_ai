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
      const existingStr = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
      const existing: ScanRecord[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [newRecord, ...existing.filter((s) => s.id !== newRecord.id)];
      localStorage.setItem(LOCAL_STORAGE_SCANS_KEY, JSON.stringify(updated.slice(0, 50)));
    } catch (localErr) {
      console.warn("Failed to save to local backup:", localErr);
    }
  }

  return newRecord;
}

/**
 * Fetches all scans from Supabase 'scans' table, with localStorage fallback
 */
export async function getScanHistory(): Promise<ScanRecord[]> {
  let supabaseRecords: ScanRecord[] = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        supabaseRecords = data as ScanRecord[];
      } else if (error) {
        console.warn("Supabase fetch scans error:", error.message);
      }
    } catch (err) {
      console.warn("Error fetching from Supabase:", err);
    }
  }

  // If Supabase returns records, sync to localStorage and return
  if (supabaseRecords.length > 0) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_SCANS_KEY, JSON.stringify(supabaseRecords.slice(0, 50)));
      } catch {
        // ignore
      }
    }
    return supabaseRecords;
  }

  // Fallback to localStorage
  if (typeof window !== "undefined") {
    try {
      const localStr = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
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
export async function deleteScanRecord(id: string, imageUrl?: string | null): Promise<boolean> {
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
      const localStr = localStorage.getItem(LOCAL_STORAGE_SCANS_KEY);
      if (localStr) {
        const list: ScanRecord[] = JSON.parse(localStr);
        const filtered = list.filter((s) => s.id !== id);
        localStorage.setItem(LOCAL_STORAGE_SCANS_KEY, JSON.stringify(filtered));
        success = true;
      }
    } catch {
      // ignore
    }
  }

  return success;
}

