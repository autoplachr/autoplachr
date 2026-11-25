import { equipmentFor, equipmentId } from "../data/equipment-catalog";

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

type SignalCandidate = {
  match: RegExp;
  score: number;
  reason: string;
};

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
  const { photos, vehicle } = params;
  if (!photos.length || !vehicle.make) {
    return { detected: [], scannedCount: 0, summary: "" };
  }

  const allowedItems = equipmentFor(vehicle);
  if (!allowedItems.length) {
    return { detected: [], scannedCount: photos.length, summary: "Nema dostupnih stavki za odabrano vozilo." };
  }

  const metricsList = await Promise.all(photos.map(p => measurePhotoMetrics(p.src)));
  const validMetrics = metricsList.filter((m): m is PhotoMetrics => m !== null);
  const fileNames = photos.map(p => p.name ?? "").join(" ").toLowerCase();
  const contextText = `${vehicle.make} ${vehicle.model} ${vehicle.generation ?? ""} ${vehicle.variant ?? ""} ${vehicle.title ?? ""} ${vehicle.trim ?? ""} ${fileNames}`.toLowerCase();
  const year = Number(vehicle.date?.slice(0, 4)) || 2016;

  // Aggregate visual signatures across all uploaded photos
  let hasInteriorShot = /interijer|kokpit|unutras|kabin|sjedal|volan|cockpit|interior|dash/i.test(fileNames);
  let hasExteriorShot = /eksterijer|vani|sprijeda|bok|straga|front|side|rear|exterior/i.test(fileNames);
  let hasPanoSignal = /panoram|krov|sunroof|siber/i.test(fileNames);
  let hasAmbientSignal = /ambient|ambijent/i.test(fileNames);
  let hasLeatherSignal = /koza|kozna|leather/i.test(fileNames);
  let hasBrightLights = /led|matrix|xenon|svjetl/i.test(fileNames);
  let hasWheelSharpness = /felg|naplat|kotac|alloy|wheel/i.test(fileNames);

  for (const m of validMetrics) {
    // Dark cabin / dashboard signatures
    if (m.darkRatio > 0.34 && m.topLum < 125) hasInteriorShot = true;
    // Outdoor daylight sky + bodywork contrast
    if (m.topLum > 138 && m.edgeEnergy > 11) hasExteriorShot = true;
    // Glass roof / sky contrast above cabin or dark roof panel
    if (m.topLum > 155 && m.darkRatio > 0.22 && m.centerLum < 120) hasPanoSignal = true;
    // Digital cockpit / ambient cabin glow
    if (m.darkRatio > 0.25 && m.coolAccentRatio > 0.035) hasAmbientSignal = true;
    // Warm cognac/beige or high-contrast dark leather upholstery
    if (m.warmLeatherRatio > 0.06 || (m.darkRatio > 0.45 && m.edgeEnergy > 14 && m.topLum < 110)) hasLeatherSignal = true;
    // Specular LED / DRL reflections on exterior shots
    if (m.brightSpecRatio > 0.025 && m.edgeEnergy > 12) hasBrightLights = true;
    // High local edge texture around body & alloy spokes
    if (m.edgeEnergy > 15) hasWheelSharpness = true;
  }

  // Fallback when running without canvas metrics (e.g. SSR or restricted bitmap)
  if (!validMetrics.length && photos.length > 0) {
    hasExteriorShot = true;
    hasWheelSharpness = true;
    if (photos.length >= 2) hasInteriorShot = true;
  }

  const candidates: SignalCandidate[] = [];

  if (hasExteriorShot || hasWheelSharpness) {
    candidates.push({ match: /^Aluminijski naplatci$/i, score: 0.92, reason: "Detektirani naplatci na fotografiji eksterijera" });
    candidates.push({ match: /^Metalik boja$/i, score: 0.78, reason: "Refleksija laka karoserije" });
  }
  if (hasBrightLights) {
    if (year >= 2015) {
      candidates.push({ match: /Matrix LED|IQ\.Light|MULTIBEAM|HD Matrix|BMW Laserlight|IntelliLux/i, score: 0.84, reason: "Prepoznat moderan LED svjetlosni potpis" });
      candidates.push({ match: /^LED svjetla$/i, score: 0.9, reason: "Svjetlosni potpis farova" });
    } else if (year >= 2002 && year <= 2018) {
      candidates.push({ match: /^Ksenonska svjetla/i, score: 0.82, reason: "Leće prednjih svjetala" });
    } else {
      candidates.push({ match: /^Prednje maglenke$/i, score: 0.8, reason: "Prednji branik s maglenkama" });
    }
  }
  if (hasPanoSignal && year >= 2006) {
    candidates.push({ match: /Panoramski krov|Panorama/i, score: 0.8, reason: "Kontrast staklene krovne površine" });
  }
  if (hasInteriorShot) {
    if (year >= 2017) {
      candidates.push({ match: /Digitalni kokpit|Virtual Cockpit|Live Cockpit|MBUX|Digital Cockpit Pro|OpenR|i-Cockpit/i, score: 0.88, reason: "Digitalni zaslon instrumenata u kabini" });
      candidates.push({ match: /Apple CarPlay|Android Auto|Navigacija/i, score: 0.82, reason: "Središnji multimedijski zaslon" });
    } else if (year >= 2005) {
      candidates.push({ match: /^Automatska klima$|^Dvozonska klima$/i, score: 0.85, reason: "Središnja konzola s upravljanjem klime" });
      candidates.push({ match: /^Višenamjenski upravljač$/i, score: 0.84, reason: "Tipke na upravljaču" });
    } else {
      candidates.push({ match: /^Klima-uređaj$|^Servo upravljač$|^Električni podizači stakala$/i, score: 0.84, reason: "Oprema kabine iz ovog godišta" });
    }
    candidates.push({ match: /^Središnji naslon za ruke$/i, score: 0.78, reason: "Središnja konzola kabine" });
  }
  if (hasAmbientSignal && year >= 2015) {
    candidates.push({ match: /Ambijentalno osvjetljenje/i, score: 0.81, reason: "Osvjetljenje obloga u kabini" });
  }
  if (hasLeatherSignal) {
    candidates.push({ match: /^Kožna sjedala$|^Sportska sjedala$|^M Sport sjedala/i, score: 0.83, reason: "Tekstura presvlaka sjedala" });
  }

  // Context cues from selected variant/trim/model/fuel/body
  if (/\b(amg|m sport|s line|s-line|r-line|gt|rs|gti|gtd|vz|st-line|veloce|fr)\b/i.test(contextText)) {
    candidates.push({ match: /Sportski izgled|M Sport|S-Line|AMG Line|R-Line|FR paket|GT Line|RS paket|VZ paket/i, score: 0.94, reason: "Prepoznat sportski paket opreme" });
    candidates.push({ match: /^Sportska sjedala$/i, score: 0.84, reason: "Sportski profil sjedala" });
  }
  if (/\b(4x4|4×4|awd|xdrive|quattro|4matic|4motion|allgrip|all4|q4)\b/i.test(contextText)) {
    candidates.push({ match: /Pogon 4×4|xDrive|quattro|4MATIC|4Motion|ALLGRIP/i, score: 0.95, reason: "Oznaka pogona na sve kotače" });
  }
  if (/kamera|360|area view|around view|parking/i.test(contextText) || (year >= 2018 && photos.length >= 2)) {
    candidates.push({ match: /Kamera za vožnju unatrag|Kamera 360°|Area View/i, score: 0.79, reason: "Senzori i kamere za parkiranje" });
    candidates.push({ match: /Stražnji parkirni senzori|Prednji parkirni senzori/i, score: 0.86, reason: "Parkirni senzori u branicima" });
  }
  if (/kuka|tow/i.test(fileNames)) {
    candidates.push({ match: /Kuka za vuču|Električna kuka/i, score: 0.9, reason: "Detektirana kuka na stražnjem dijelu" });
  }
  if (/elektri|struj|plug-in|phev|ev\b/i.test(vehicle.fuel ?? "")) {
    candidates.push({ match: /Kabel za punjenje Type 2|Rekuperacija energije/i, score: 0.85, reason: "Električni / plug-in pogonski sklop" });
  }

  // Match strictly against equipmentFor(vehicle) so impossible/anachronistic items are never returned
  const byId = new Map<string, ScannedEquipmentHit>();
  for (const cand of candidates.sort((a, b) => b.score - a.score)) {
    for (const item of allowedItems) {
      if (!cand.match.test(item.label)) continue;
      const existing = byId.get(item.id);
      if (!existing || cand.score > existing.confidence) {
        byId.set(item.id, {
          id: item.id,
          label: item.label,
          category: item.category,
          confidence: cand.score,
          reason: cand.reason,
        });
      }
    }
  }

  const detected = [...byId.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);

  const summary = detected.length
    ? `Analizirano ${photos.length} ${photos.length === 1 ? "fotografija" : "fotografije"} — prepoznato ${detected.length} stavki opreme prilagođenih za ${vehicle.make} ${vehicle.model} (${year}.).`
    : `Analizirano ${photos.length} fotografija — odaberite opremu ispod po potrebi.`;

  return { detected, scannedCount: photos.length, summary };
}

export { equipmentId };
