import { equipmentId } from "../data/equipment-catalog";
import {
  analyzeCarPhotos,
  type DetectedEquipmentItem,
  type PhotoAnalysisResponse,
  type VisionHint,
  type VisionPhotoInput,
} from "./car-vision";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";

export type ScannedEquipmentHit = {
  id: string;
  label: string;
  category: 0 | 1 | 2 | 3;
  confidence: number;
  reason: string;
};

export type PhotoScanResult = {
  detected: ScannedEquipmentHit[];
  scannedCount: number;
  summary: string;
  analysis?: PhotoAnalysisResponse;
};

type PhotoMetrics = {
  avgLum: number;
  topLum: number;
  centerLum: number;
  darkRatio: number;
  brightSpecRatio: number;
  saturationAvg: number;
  coolAccentRatio: number;
  warmLeatherRatio: number;
  edgeEnergy: number;
  aspectRatio: number;
};

async function measurePhotoMetrics(src: string): Promise<PhotoMetrics | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = 96;
        const h = 60;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const total = w * h;
        let lumSum = 0;
        let topLumSum = 0;
        let topCount = 0;
        let centerLumSum = 0;
        let centerCount = 0;
        let darkCount = 0;
        let brightSpecCount = 0;
        let satSum = 0;
        let coolAccentCount = 0;
        let warmLeatherCount = 0;
        let edgeSum = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const sat = max > 0 ? (max - min) / max : 0;

            lumSum += lum;
            satSum += sat;
            if (lum < 48) darkCount++;
            if (lum > 236 && sat < 0.25) brightSpecCount++;
            if (y < h * 0.28) {
              topLumSum += lum;
              topCount++;
            }
            if (y >= h * 0.3 && y <= h * 0.75 && x >= w * 0.2 && x <= w * 0.8) {
              centerLumSum += lum;
              centerCount++;
            }
            if (b > r + 24 && b > 120 && sat > 0.35) coolAccentCount++;
            if (r > g + 16 && g > b + 12 && lum > 55 && lum < 175 && sat > 0.25) warmLeatherCount++;

            if (x > 0) {
              const prev = idx - 4;
              const prevLum = 0.2126 * data[prev] + 0.7152 * data[prev + 1] + 0.0722 * data[prev + 2];
              edgeSum += Math.abs(lum - prevLum);
            }
          }
        }

        resolve({
          avgLum: lumSum / total,
          topLum: topLumSum / Math.max(1, topCount),
          centerLum: centerLumSum / Math.max(1, centerCount),
          darkRatio: darkCount / total,
          brightSpecRatio: brightSpecCount / total,
          saturationAvg: satSum / total,
          coolAccentRatio: coolAccentCount / total,
          warmLeatherRatio: warmLeatherCount / total,
          edgeEnergy: edgeSum / total,
          aspectRatio: img.width / Math.max(1, img.height),
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function fetchServerVision(
  photos: Array<{ src: string; name?: string }>,
  hint: VisionHint,
): Promise<Partial<PhotoAnalysisResponse> | null> {
  if (typeof window === "undefined" || typeof fetch === "undefined") return null;
  const payload = {
    photos: photos.slice(0, 6).map(p => ({ src: p.src, name: p.name })),
    hint,
  };
  try {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return null;
      const { data, error } = await supabase.functions.invoke("analyze-listing", { body: payload });
      if (error || !data || typeof data !== "object") return null;
      return data as Partial<PhotoAnalysisResponse>;
    }
    const response = await fetch("/api/analyze-car-photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<PhotoAnalysisResponse>;
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export async function analyzeUploadedCarPhotos(params: {
  photos: Array<{ src: string; name?: string }>;
  hint?: VisionHint;
}): Promise<PhotoAnalysisResponse> {
  const { photos, hint = {} } = params;
  const metricsList = await Promise.all(photos.map(p => measurePhotoMetrics(p.src)));
  const enrichedPhotos: VisionPhotoInput[] = photos.map((p, idx) => {
    const m = metricsList[idx];
    return {
      src: p.src,
      name: p.name,
      ...(m
        ? {
            aspectRatio: m.aspectRatio,
            avgLum: m.avgLum,
            darkRatio: m.darkRatio,
            coolAccentRatio: m.coolAccentRatio,
            warmLeatherRatio: m.warmLeatherRatio,
            brightSpecRatio: m.brightSpecRatio,
            edgeEnergy: m.edgeEnergy,
            saturationAvg: m.saturationAvg,
          }
        : {}),
    };
  });

  const serverRes = await fetchServerVision(photos, hint);
  const mergedHint: VisionHint = {
    ...hint,
    make: serverRes?.detectedMake || hint.make,
    model: serverRes?.detectedModel || hint.model,
    generation: serverRes?.detectedGeneration || hint.generation,
    variant: serverRes?.detectedTrim || hint.variant,
    bodyType: serverRes?.detectedBodyStyle || hint.bodyType,
    fuel: serverRes?.detectedFuel || hint.fuel,
    date: serverRes?.detectedYear ? `${serverRes.detectedYear}-06` : hint.date,
  };

  const normalized = await analyzeCarPhotos({
    photos: enrichedPhotos,
    hint: mergedHint,
  });

  // Preserve OpenRouter Vision equipment labels & source when server returned Vision AI results
  if (serverRes?.source === "openrouter-vision" && Array.isArray(serverRes.detectedEquipment) && serverRes.detectedEquipment.length) {
    const combined = new Map<string, DetectedEquipmentItem>();
    for (const item of normalized.detectedEquipment) combined.set(item.id, item);
    for (const sItem of serverRes.detectedEquipment) {
      if (!sItem?.label) continue;
      const id = sItem.id || equipmentId(sItem.label);
      if (!combined.has(id)) {
        combined.set(id, {
          id,
          label: sItem.label,
          category: sItem.category ?? 0,
          confidence: sItem.confidence ?? 90,
          visualReason: sItem.visualReason || "Prepoznato AI vizualnom analizom",
        });
      }
    }
    return {
      ...normalized,
      source: "openrouter-vision",
      confidence: serverRes.confidence || normalized.confidence,
      detectedColor: serverRes.detectedColor || normalized.detectedColor,
      detectedEquipment: [...combined.values()].slice(0, 9),
    };
  }

  return normalized;
}

export async function scanPhotosForEquipment(params: {
  photos: Array<{ src: string; name?: string }>;
  vehicle: {
    make: string;
    model: string;
    generation?: string;
    fuel?: string;
    variant?: string;
    date?: string;
    bodyType?: string;
    title?: string;
    trim?: string;
  };
}): Promise<PhotoScanResult> {
  const analysis = await analyzeUploadedCarPhotos({
    photos: params.photos,
    hint: params.vehicle,
  });

  const detected: ScannedEquipmentHit[] = analysis.detectedEquipment.map(item => ({
    id: item.id,
    label: item.label,
    category: item.category,
    confidence: item.confidence / 100,
    reason: item.visualReason,
  }));

  return {
    detected,
    scannedCount: params.photos.length,
    summary: analysis.summary,
    analysis,
  };
}

export { equipmentId, type PhotoAnalysisResponse, type DetectedEquipmentItem };
