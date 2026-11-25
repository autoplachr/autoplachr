import { useId } from "react";
import emblems from "../data/inline-brand-emblems.json";

const dimensions = { xs:18, sm:24, md:36, lg:44 };
const silverMakes = new Set(["Mercedes-Benz", "Audi", "Peugeot", "Renault", "Mazda", "Hyundai", "Toyota", "Volvo", "Cupra"]);
const colorMakes = new Set(["BMW","Porsche","Škoda","Tesla","Ferrari","Alfa Romeo"]);
const marks: Record<string,{svg:string}> = emblems;
const initialsByMake: Record<string,string> = {
  "Aston Martin":"AM", "DS Automobiles":"DS", "Ineos":"INEOS", "Land Rover":"LR",
  "Lynk & Co":"L&C", "McLaren":"MC", "MG":"MG", "RAM":"RAM", "Rolls-Royce":"RR",
  "SsangYong / KGM":"KGM", "Zastava / Yugo":"Z",
};

function scopeReferences(svg:string, prefix:string) {
  return svg.replace(/\bid="([^"]+)"/g, (_,id) => 'id="'+prefix+id+'"')
    .replace(/url\(#([^\)]+)\)/g, (_,id) => 'url(#'+prefix+id+')')
    .replace(/\bhref="#([^"]+)"/g, (_,id) => 'href="#'+prefix+id+'"');
}
function initials(make:string) {
  return Object.hasOwn(initialsByMake,make) ? initialsByMake[make] : (make.includes(" ") ? make.split(/\s+/).map(word=>word[0]).join("").slice(0,3) : make.slice(0,3)).toUpperCase();
}

export function BrandLogo({make,size="sm",className=""}: {make:string;size?:keyof typeof dimensions;className?:string}) {
  const instance = useId().replace(/[^a-zA-Z0-9]/g, "") + "-";
  const name = make.trim();
  const emblem = Object.hasOwn(marks,name) ? marks[name] : undefined;
  const dim = dimensions[size];
  const attributes = { "aria-hidden":true as const, className:`brand-logo brand-logo-${size} ${className}`, style:{width:dim,height:dim} };
  if (emblem) {
    // These checked-in SVGs contain only local vector markup, with IDs scoped to each instance.
    const contrast = name === "Volkswagen" ? "vw" : silverMakes.has(name) ? "silver" : colorMakes.has(name) ? "color" : "original";
    return <span {...attributes} className={attributes.className+" brand-logo-emblem"} data-contrast={contrast}
      dangerouslySetInnerHTML={{__html:scopeReferences(emblem.svg,instance)}}/>;
  }
  return <span {...attributes}><span className="brand-logo-fallback">{initials(name) || "?"}</span></span>;
}
