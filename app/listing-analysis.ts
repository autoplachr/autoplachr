import type { Photo } from "./catalog";
import { parseListingText } from "./search";

export type ListingAnalysis = Partial<ReturnType<typeof parseListingText>> & {
  source?: "vision";
  bestCoverIndex?: number;
};

export async function prepareListingPhoto(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  try {
    if (!context) throw new Error("Canvas unavailable");
    const width = bitmap.width;
    const height = bitmap.height;
    canvas.width = 64;
    canvas.height = 40;
    context.drawImage(bitmap, 0, 0, 64, 40);
    const pixels = context.getImageData(0, 0, 64, 40).data;
    const luminance = (pixel: number) => .2126 * pixels[pixel * 4] + .7152 * pixels[pixel * 4 + 1] + .0722 * pixels[pixel * 4 + 2];
    let brightness = 0, centerEdges = 0, borderEdges = 0;
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 64; x++) {
        const pixel = y * 64 + x;
        const light = luminance(pixel);
        brightness += light;
        const edge = (x ? Math.abs(light - luminance(pixel - 1)) : 0) +
          (y ? Math.abs(light - luminance(pixel - 64)) : 0);
        if (x >= 8 && x < 56 && y >= 5 && y < 35) centerEdges += edge;
        else borderEdges += edge;
      }
    }
    const aspect = width / height;
    const score = (aspect >= 1.15 && aspect <= 2.4 ? 4 : aspect >= 1 ? 2 : 0)
      + Math.min(width * height / 1_000_000, 1)
      + (1 - Math.abs(brightness / 2560 - 135) / 135)
      + Math.min(centerEdges / 1440 / 30, 1)
      - Math.min(borderEdges / 1120 / 45, 1)
      + (/\b(exterior|front|prednja|vanjski)\b/i.test(file.name.replace(/[_-]/g, " ")) ? 2 : 0)
      - (/\b(interior|interijer|cockpit|headlight|far|detalj)\b/i.test(file.name.replace(/[_-]/g, " ")) ? 4 : 0);
    const encode = (size: number, quality: number) => {
      const ratio = Math.min(1, size / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/webp", quality);
    };
    let src = encode(1600, .8);
    for (const [size, quality] of [[1600, .67], [1600, .54], [1280, .56], [960, .5]]) {
      if (src.length <= 240000) break;
      src = encode(size, quality);
    }
    const photo: Photo = { src };
    return { photo, name: file.name, thumbnail: encode(640, .68), score };
  } finally {
    bitmap.close();
  }
}

export async function analyzeListingPhotos(photos: { src: string; name?: string }[], description: string, signal: AbortSignal): Promise<ListingAnalysis> {
  const names = photos.map(photo => (photo.name ?? "").replace(/\.[^.]+$/, ""))
    .filter(name => !/^(?:img|dsc|pxl|photo|slika|screenshot|whatsapp)[\d_\s-]*$/i.test(name));
  const fromNames = parseListingText(names.join("\n"));
  const fromText = parseListingText(description);
  let vision: ListingAnalysis = {};
  if (photos.length) {
    try {
      const response = await fetch("/api/analyze-listing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photos, description }),
        signal,
      });
      if (response.ok) vision = await response.json();
    } catch {
      // The form can use explicit details in the filenames and description offline.
    }
  }
  const definedText = Object.fromEntries(Object.entries(fromText).filter(([, value]) => value !== undefined));
  return { ...fromNames, ...vision, ...definedText,
    equipment: [...new Set([...(vision.equipment ?? []), ...fromNames.equipment, ...fromText.equipment])] };
}

