"use client";
import { CarFront } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Photo } from "../../app/catalog";

type Props = {
  photo?: Photo;
  alt: string;
  eager?: boolean;
  sizes?: string;
  className?: string;
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
}: Props) {
  const sources = [photo?.backup, photo?.src].filter((src): src is string => Boolean(src));
  const options = [...new Set(sources)];
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function recover() {
    const element = image.current;
    if (!element || !element.complete || element.naturalWidth) return;
    const next = options[options.indexOf(element.getAttribute("src") ?? "") + 1];
    if (next) {
      setLoaded(false);
      element.src = next;
    } else setFailed(true);
  }

  useEffect(() => {
    recover();
    // Cached images may finish before React attaches onLoad; cover that case.
    const element = image.current;
    if (element?.complete && element.naturalWidth > 0) setLoaded(true);
  }, [photo?.src, photo?.backup]);

  const src = options[0];

  return (
    <div className={`vehicle-photo ${className}`.trim()}>
      {!failed && src ? (
        <>
          <img
            ref={image}
            alt={alt}
            src={src}
            sizes={sizes}
            className="w-full h-full object-cover object-center block"
            style={{
              imageRendering: "auto",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              opacity: loaded ? 1 : 0,
            }}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={recover}
          />
          {!loaded && (
            <span className="car-image-shimmer animate-pulse" role="status" aria-label="Učitavanje fotografije" />
          )}
        </>
      ) : (
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
