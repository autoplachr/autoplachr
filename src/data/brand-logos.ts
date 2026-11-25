import files from "./brand-logo-files.json";

const logos: Record<string,{file:string;isMonochromeDark:boolean}> = files;
const abbreviations: Record<string,string> = {
  "Volkswagen":"VW", "Mercedes-Benz":"MB", "BMW":"BMW", "BYD":"BYD", "MINI":"MINI",
  "SsangYong / KGM":"KGM", "DS Automobiles":"DS", "MG":"MG", "Land Rover":"LR", "Alfa Romeo":"AR",
};

export function getBrandLogo(make: string) {
  const name=make.trim();
  const entry=Object.hasOwn(logos,name) ? logos[name] : undefined;
  const words=name.split(/[\s-]+/).filter(Boolean);
  const initials=abbreviations[name] ?? (words.length>1 ? words.slice(0,3).map(word=>word[0]).join("") : name.slice(0,2)).toUpperCase();
  return {src:entry ? "/brands/"+entry.file : "",isMonochromeDark:entry?.isMonochromeDark ?? false,initials:initials || "?"};
}
