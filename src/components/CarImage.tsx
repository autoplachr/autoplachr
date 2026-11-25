"use client";
import { CarFront } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Photo } from "../../app/catalog";

type Props = {photo?:Photo;alt:string;eager?:boolean;thumbnail?:boolean};
export function CarImage(props:Props) {
  return <CarImageSource key={JSON.stringify([props.photo?.src,props.photo?.backup,props.photo?.preview,props.thumbnail])} {...props}/>;
}
function CarImageSource({photo,alt,eager=false,thumbnail=false}:Props) {
  const sources=[thumbnail && photo?.preview,photo?.backup,photo?.src].filter((src):src is string=>Boolean(src));
  const options=[...new Set(sources)];
  const image=useRef<HTMLImageElement>(null);
  const [failed,setFailed]=useState(false);
  function recover() {
    const element=image.current;
    if(!element || !element.complete || element.naturalWidth) return;
    const next=options[options.indexOf(element.getAttribute("src") ?? "")+1];
    if(next) {
      element.classList.toggle("car-image-framed", next===photo?.preview);
      element.src=next;
    } else setFailed(true);
  }
  useEffect(recover,[photo?.src,photo?.backup,photo?.preview,thumbnail]);
  const src=options[0];
  return <div className={"vehicle-photo"+(thumbnail?" car-image-thumbnail":"")}>
    {!failed && src ? <img ref={image} alt={alt} src={src} className={src===photo?.preview ? "car-image-framed" : undefined}
      loading={eager?"eager":"lazy"} decoding="async" onError={recover}/> :
      <span className="car-image-placeholder" role={alt?"img":undefined} aria-label={alt?"Fotografija nije dostupna":undefined}><CarFront size={42} strokeWidth={1.3}/></span>}
  </div>;
}
