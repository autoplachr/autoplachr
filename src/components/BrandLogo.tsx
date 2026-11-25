"use client";
import { useEffect, useRef, useState } from "react";
import { getBrandLogo } from "../data/brand-logos";

const dimensions={xs:18,sm:24,md:36,lg:48};
export function BrandLogo({make,size="sm",className=""}: {make:string;size?:keyof typeof dimensions;className?:string}) {
  const logo=getBrandLogo(make);
  const [failed,setFailed]=useState("");
  const image=useRef<HTMLImageElement>(null);
  useEffect(()=>{
    if (image.current?.complete && !image.current.naturalWidth) setFailed(logo.src);
  },[logo.src]);
  const dim=dimensions[size];
  const showImage=logo.src && failed!==logo.src;
  return <span aria-hidden="true" className={`brand-logo brand-logo-${size} ${logo.isMonochromeDark ? "brand-logo-mono" : ""} ${className}`} style={{width:dim,height:dim}}>
    {showImage ? <img ref={image} key={logo.src} src={logo.src} alt="" width={dim} height={dim} loading="lazy" decoding="async" onError={()=>setFailed(logo.src)}/> :
      <span className="brand-logo-fallback">{logo.initials}</span>}
  </span>;
}
