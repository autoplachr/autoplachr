"use client";
import Image from "next/image";
import { CarFront } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Photo } from "../../app/catalog";

type Props = {
  photo?: Photo;
  alt: string;
  eager?: boolean;
  sizes?: string;
  className?: string;
  layer?: boolean;
  dim?: boolean;
  onUnavailable?: () => void;
  onReady?: () => void;
};

export function CarImage(props: Props) {
  return <CarImageSource key={JSON.stringify([props.photo?.backup, props.photo?.src])} {...props} />;
}

function CarImageSource({
  photo,
  alt,
  eager = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 420px",
  className = "",
  layer = false,
  dim = false,
  onUnavailable,
  onReady,
}: Props) {
  const sources = [photo?.backup, photo?.src].filter((src): src is string => Boolean(src));
  const options = [...new Set(sources)];
  const image = useRef<HTMLImageElement>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function recover() {
    const element = image.current;
    if (!element || !element.complete || element.naturalWidth) return;
    if (sourceIndex + 1 < options.length) {
      setLoaded(false);
      setSourceIndex(sourceIndex + 1);
    } else {
      setFailed(true);
      onUnavailable?.();
    }
  }

  function ready() {
    setLoaded(true);
    onReady?.();
  }

  useEffect(() => {
    if (!options.length) onUnavailable?.();
    recover();
    // Cached images may finish before React attaches onLoad; cover that case.
    const element = image.current;
    if (element?.complete && element.naturalWidth > 0) ready();
  }, [sourceIndex]);

  const src = options[sourceIndex];
  const optimizable = !!src && (/^\/(?!\/)/.test(src)
    || /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(src));

  return (
    <div className={`vehicle-photo ${className}`.trim()} style={dim ? { opacity: 0 } : undefined}>
      {!failed && src ? (
        <>
          <Image
            key={src}
            fill
            unoptimized={!optimizable}
            priority={eager}
            ref={image}
            alt={alt}
            src={src}
            sizes={sizes}
            className="w-full h-full object-cover object-center block"
            style={{
              imageRendering: "auto",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",

            }}
            loading={eager ? undefined : "lazy"}
            decoding="async"
            draggable={false}
            onLoad={ready}
            onError={recover}
          />
          {!layer && !eager && !loaded && (
            <span className="car-image-shimmer animate-pulse" role="status" aria-label="Učitavanje fotografije" />
          )}
        </>
      ) : !layer && (
        <span
          className="car-image-placeholder"
          role={alt ? "img" : undefined}
          aria-label={alt ? "Fotografija nije dostupna" : undefined}
        >
          <CarFront size={42} strokeWidth={1.3} />
        </span>
      )}
    </div>
  );
}
