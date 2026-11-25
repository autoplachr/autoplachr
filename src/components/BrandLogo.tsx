import { useId } from "react";
import emblems from "../data/inline-brand-emblems.json";

const dimensions = { xs:18, sm:24, md:36, lg:44 };
const silverMakes = new Set(["Mercedes-Benz", "Audi", "Peugeot", "Renault", "Mazda", "Hyundai", "Toyota", "Volvo", "Cupra", "Lexus", "Honda", "Nissan", "Suzuki", "Kia", "Polestar", "DS Automobiles"]);
const colorMakes = new Set(["BMW","Porsche","Škoda","Tesla","Ferrari","Alfa Romeo","Ford","Fiat","Land Rover","Mini"]);
const marks: Record<string,{svg:string;monochrome?:boolean}> = emblems;

function scopeReferences(svg:string, prefix:string) {
  return svg.replace(/\bid="([^"]+)"/g, (_,id) => 'id="'+prefix+id+'"')
    .replace(/url\(#([^\)]+)\)/g, (_,id) => 'url(#'+prefix+id+')')
    .replace(/\bhref="#([^"]+)"/g, (_,id) => 'href="#'+prefix+id+'"');
}
export function BrandLogo({make,size="sm",className=""}: {make:string;size?:keyof typeof dimensions;className?:string}) {
  const instance = useId().replace(/[^a-zA-Z0-9]/g, "") + "-";
  const name = make.trim();
  const emblem = Object.hasOwn(marks,name) ? marks[name] : undefined;
  const dim = dimensions[size];
  const attributes = { "aria-hidden":true as const, className:`brand-logo brand-logo-${size} ${className}`, style:{width:dim,height:dim} };
  if (emblem) {
    // These checked-in SVGs contain only local vector markup, with IDs scoped to each instance.
    const contrast = name === "Volkswagen" ? "vw" : colorMakes.has(name) ? "color" : silverMakes.has(name) || emblem.monochrome ? "silver" : "original";
    return <span {...attributes} className={attributes.className+" brand-logo-emblem"} data-contrast={contrast}
      dangerouslySetInnerHTML={{__html:scopeReferences(emblem.svg,instance)}}/>;
  }
  return <span {...attributes}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 13l2-5h12l2 5v5h-3v-2H7v2H4z"/><path d="M7 13h2m6 0h2"/></svg></span>;
}
