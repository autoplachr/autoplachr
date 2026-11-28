import type { ReactNode } from "react";

/**
 * Crisp monochrome vector brand marks for small sizes (15–24 px): filter-rail badges,
 * card medallions, detail headings (DESIGN.md §4.7).
 *
 * These are simplified, single-colour architectural renditions drawn on a 24-unit grid
 * with ≥1.4-unit strokes, so they stay sharp at small integer sizes where the detailed
 * full-colour emblems (`BrandLogo`) turn soft. They identify the make; they are not
 * official artwork. Unknown makes get a geometric monogram.
 */
const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const marks: Record<string, ReactNode> = {
  BMW: <>
    <circle cx="12" cy="12" r="10.25" fill="currentColor" />
    <circle cx="12" cy="12" r="6.6" fill="#fff" />
    <path d="M12 12V5.4A6.6 6.6 0 0 0 5.4 12Z M12 12v6.6a6.6 6.6 0 0 0 6.6-6.6Z" fill="currentColor" />
    <circle cx="12" cy="12" r="6.6" {...S} strokeWidth={0.9} />
  </>,
  Volkswagen: <>
    <circle cx="12" cy="12" r="10" {...S} />
    <path d="M8.2 4.9 12 12.6l3.8-7.7" {...S} />
    <path d="M4.6 9.2 8.4 18.4 12 12.6l3.6 5.8 3.8-9.2" {...S} />
  </>,
  Audi: <>
    {[4.7, 9.57, 14.43, 19.3].map(cx => <circle key={cx} cx={cx} cy="12" r="3.75" {...S} strokeWidth={1.3} />)}
  </>,
  "Mercedes-Benz": <>
    <circle cx="12" cy="12" r="10" {...S} strokeWidth={1.4} />
    <path d="M12 2.6 13.2 11.3 20.1 16.9 12 13.7 3.9 16.9 10.8 11.3Z" fill="currentColor" />
  </>,
  "Škoda": <>
    <circle cx="12" cy="12" r="10" {...S} strokeWidth={1.4} />
    <path d="M5.6 14.6c2.6-4.4 6.9-6.3 12.6-5.2l-4.4 2.2 1.6 3.4-3.6-2.5c-2 .5-4 1.2-6.2 2.1Z" fill="currentColor" />
    <circle cx="16.6" cy="13.9" r="1.1" fill="currentColor" />
  </>,
  Porsche: <>
    <path d="M5 3.5h14v8.2c0 5-3.3 7.6-7 9-3.7-1.4-7-4-7-9Z" {...S} />
    <path d="M5 8.4h14M12 8.4v11.8" {...S} strokeWidth={1.2} />
    <path d="M7.4 11.2h2.4M7.4 13.6h2.4M14.2 11.2h2.4M14.2 13.6h2.4" {...S} strokeWidth={1.1} />
  </>,
  "Alfa Romeo": <>
    <circle cx="12" cy="12" r="10" {...S} strokeWidth={1.5} />
    <path d="M12 3v18" {...S} strokeWidth={1.3} />
    <path d="M7.4 7.6v8.8M4.4 12h6" {...S} strokeWidth={1.7} />
    <path d="M16.6 6.6c-2.4.8-2.4 3 0 3.8 2.4.9 2.3 3.4-.5 4.4" {...S} strokeWidth={1.6} />
  </>,
  Ford: <>
    <ellipse cx="12" cy="12" rx="10.6" ry="6.6" {...S} strokeWidth={1.4} />
    <text x="12" y="14.3" textAnchor="middle" fontSize="6.6" fontStyle="italic" fontWeight="700"
      fontFamily="Georgia, 'Times New Roman', serif" fill="currentColor">Ford</text>
  </>,
  Volvo: <>
    <circle cx="10.6" cy="13.4" r="6.6" {...S} strokeWidth={1.7} />
    <path d="M15.3 8.7 20 4M15.6 4H20v4.4" {...S} strokeWidth={1.7} />
    {/* The horizontal band across the iron mark is what makes it read as Volvo. */}
    <rect x="2.6" y="12.3" width="16" height="2.3" rx="0.4" fill="currentColor" />
  </>,
  Toyota: <>
    <ellipse cx="12" cy="12" rx="10.4" ry="7" {...S} strokeWidth={1.4} />
    <ellipse cx="12" cy="9.4" rx="6" ry="2.9" {...S} strokeWidth={1.3} />
    <ellipse cx="12" cy="12.6" rx="2.5" ry="5.9" {...S} strokeWidth={1.3} />
  </>,
  Renault: <>
    <path d="M12 2.2 18.6 12 12 21.8 5.4 12Z" {...S} strokeWidth={1.5} />
    <path d="M12 7 15.3 12 12 17 8.7 12Z" {...S} strokeWidth={1.5} />
  </>,
  Peugeot: <>
    <path d="M5 3.5h14v9c0 4.4-3.2 6.8-7 8.4-3.8-1.6-7-4-7-8.4Z" {...S} />
    <path d="M9.2 16.4V7.6h3.3a2.4 2.4 0 0 1 0 4.8H9.2" {...S} strokeWidth={1.6} />
  </>,
  Hyundai: <>
    <ellipse cx="12" cy="12" rx="10.6" ry="6.8" {...S} strokeWidth={1.4} />
    <path d="M8.9 16 10.7 8M13.3 16l1.8-8" {...S} strokeWidth={1.6} />
    <path d="M9.9 12.6c1.7-1 3.2-1.2 4.4-1.3" {...S} strokeWidth={1.5} />
  </>,
  Kia: <>
    <path d="M2.8 15.8 4.6 8.2M4.2 12.3 9.2 8.2M5.2 11.8l3 4" {...S} strokeWidth={1.6} />
    <path d="M10.8 15.8 12.6 8.2" {...S} strokeWidth={1.6} />
    <path d="M14 15.8 18.2 8.2l2.9 7.6" {...S} strokeWidth={1.6} />
  </>,
  Mazda: <>
    <ellipse cx="12" cy="12" rx="10.4" ry="7.6" {...S} strokeWidth={1.4} />
    <path d="M5.2 15.2c2.6-4.4 4.8-5.3 6.8-1.6 2-3.7 4.2-2.8 6.8 1.6" {...S} strokeWidth={1.5} />
  </>,
  Cupra: <>
    <path d="M3 6.2h5.6L12 12.4l3.4-6.2H21L12 21Z" fill="currentColor" />
    <path d="M8.4 9.6 12 15.6l3.6-6" fill="none" stroke="#fff" strokeWidth={1.1} strokeLinejoin="round" />
  </>,
  Tesla: <>
    <path d="M3.2 5.6c5.6-2.6 12-2.6 17.6 0l-1 1.5c-1.9-.8-3.9-1.2-5.6-1.2L12 20.6 9.8 5.9c-1.7 0-3.7.4-5.6 1.2Z" fill="currentColor" />
  </>,
};

/** Canonical names for data variants (aliases and diacritics). */
const aliases: Record<string, string> = {
  VW: "Volkswagen", Mercedes: "Mercedes-Benz", "Mercedes Benz": "Mercedes-Benz", Skoda: "Škoda",
};

function monogram(make: string) {
  const words = make.replace(/[^\p{L}\d\s-]/gu, "").split(/[\s-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : make.slice(0, 2)).toUpperCase();
}

export function BrandMark({ make, size = 20, className = "" }: { make: string; size?: number; className?: string }) {
  const name = aliases[make.trim()] ?? make.trim();
  const mark = marks[name];
  const px = Math.round(size);
  const letters = monogram(name || "?");
  return <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision"
    className={"brand-mark flex-none " + className} data-make={name}>
    {mark ?? <>
      <circle cx="12" cy="12" r="10" {...S} strokeWidth={1.4} />
      <text x="12" y="15.4" textAnchor="middle" fontSize={letters.length > 1 ? 9 : 10.5} fontWeight="700" letterSpacing="-0.3"
        fontFamily="'Inter Variable', Inter, system-ui, sans-serif" fill="currentColor">{letters}</text>
    </>}
  </svg>;
}
