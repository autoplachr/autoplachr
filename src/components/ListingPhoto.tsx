"use client";
import { Camera, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useState } from "react";
import type { Vehicle } from "../../app/catalog";
import { CarImage } from "./CarImage";

export function ListingPhoto({vehicle, saved, onSave, eager, status, className}: {
  vehicle:Vehicle; saved:boolean; onSave:()=>void; eager?:boolean; status?:string | null; className:string;
}) {
  const [index,setIndex] = useState(0);
  const total = vehicle.photos.length;
  const active = total ? index % total : 0;
  const move = (offset:number) => setIndex(current => (current + offset + total) % total);

  return <div className={className+" listing-photo"}>
    <CarImage photo={vehicle.photos[active]} alt={vehicle.title} eager={eager || active > 0} thumbnail/>
    {status && <span className="listing-photo-status">{status}</span>}
    <button className={"icon-btn heart-button"+(saved?" saved":"")} type="button" aria-pressed={saved}
      aria-label={(saved?"Ukloni spremljeno vozilo ":"Spremi ")+vehicle.title} onClick={onSave}>
      <Heart size={14} fill={saved?"currentColor":"none"}/>
    </button>
    {total > 1 && <>
      <button className="listing-photo-arrow previous" type="button" onClick={()=>move(-1)} aria-label={"Prethodna fotografija: "+vehicle.title}><ChevronLeft size={16}/></button>
      <button className="listing-photo-arrow next" type="button" onClick={()=>move(1)} aria-label={"Sljedeća fotografija: "+vehicle.title}><ChevronRight size={16}/></button>
    </>}
    {total > 0 && <span className="listing-photo-count tabular" aria-live="polite" aria-label={`Fotografija ${active+1} od ${total}`}>
      <Camera size={13} aria-hidden="true"/>{active+1}/{total}
    </span>}
  </div>;
}
