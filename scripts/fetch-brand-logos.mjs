import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { CAR_MAKES } from "../src/data/car-catalog.ts";

const output = new URL("../public/brands/", import.meta.url);
const registry = new URL("../src/data/brand-logo-files.json", import.meta.url);
const raw = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master";
const aliases = {
  "Corvette": ["corvette", "chevrolet-corvette"], "DS Automobiles": ["ds", "ds-automobiles"], "Lynk & Co": ["lynk-and-co", "lynk-co", "lynkco"],
  "SsangYong / KGM": ["ssangyong", "kgm"], "Zastava / Yugo": ["zastava", "yugo"],
  "RAM": ["ram", "ram-trucks"], "Ineos": ["ineos", "ineos-automotive"], "Mini": ["mini", "mini-cooper"],
  "Nio": ["nio", "next-e-v"], "Xpeng": ["xpeng", "xiaopeng"], "DFSK": ["dfsk", "dongfeng-sokon"],
};
const simple = { "DS Automobiles":"dsautomobiles","Lynk & Co":"lynkco","SsangYong / KGM":"ssangyong" };
const manufacturer = {
  Forthing: "https://cdn.globalso.com/forthingmotor/new-logo-proportionss1.png",
  Voyah: "https://www.voyah-auto.com/img/common/footer-logo.png",
};
const supplemental = new Set(["DFSK","Genesis","Ineos","Jaecoo","Maybach","Omoda","Seres"]);
const monochromeOverride = new Set(["DS Automobiles","Maxus"]);
const slugify = make => make.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const pngSignature = Buffer.from([137,80,78,71,13,10,26,10]);

async function fetchLogo(url, ext) {
  try {
    const response = await fetch(url,{signal:AbortSignal.timeout(9000)});
    if (!response.ok) return;
    const bytes=Buffer.from(await response.arrayBuffer());
    if (ext==="png" && bytes.subarray(0,8).equals(pngSignature) && bytes.length>=33) {
      const image=sharp(bytes), metadata=await image.metadata();
      if (Math.max(metadata.width,metadata.height)<128) return;
      if (metadata.hasAlpha) return bytes;
      if (!/\/(?:maybach|zastava|omoda)(?:-logo)?\.png$/.test(url)) return;
      const {data,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true});
      const corner=[data[0],data[1],data[2]];
      if (Math.min(...corner)<235 && Math.max(...corner)>18) return;
      // Remove only the flat backdrop connected to the outside edge.
      const stack=[], seen=new Uint8Array(info.width*info.height);
      function add(index) {
        if (seen[index]) return;
        seen[index]=1;
        const i=index*4;
        if (corner.every((channel,j)=>Math.abs(data[i+j]-channel)<=20)) {data[i+3]=0;stack.push(index);}
      }
      for(let x=0;x<info.width;x++) {add(x);add((info.height-1)*info.width+x);}
      for(let y=0;y<info.height;y++) {add(y*info.width);add(y*info.width+info.width-1);}
      while(stack.length) {
        const pos=stack.pop(), x=pos%info.width, y=Math.floor(pos/info.width);
        if(x>0) add(pos-1);if(x+1<info.width) add(pos+1);
        if(y>0) add(pos-info.width);if(y+1<info.height) add(pos+info.width);
      }
      return sharp(data,{raw:info}).trim().resize({width:900,height:900,fit:"inside",withoutEnlargement:true}).png().toBuffer();
    }
    const svg=bytes.toString("utf8");
    if (ext==="svg" && /<svg[\s>]/i.test(svg) && !/<(?:script|foreignObject)|\bon\w+\s*=|\b(?:href|src)\s*=/i.test(svg)) {
      return url.includes("dfsk-logo.svg") ? Buffer.from(svg.replace('<path fill="#fff" d="M0 0h2048v2048H0z"/>',"")) : bytes;
    }
  } catch { /* Continue to the next asset source. */ }
}

await mkdir(output,{recursive:true});
const downloaded = new Map(), missing=[];
const makeQueue=[...CAR_MAKES];
async function download(make) {
  const sources=aliases[make] ?? [slugify(make)];
  const slug=make==="Ineos" ? "ineos" : sources[0];
  const options = [
    ...(make==="BYD" ? [["https://cdn.jsdelivr.net/npm/car-brand-logos@1.0.0/byd-logo.svg","svg"]] : []),
    ...(manufacturer[make] ? [[manufacturer[make],"png"]] : []),
    ...["optimized","thumb"].flatMap(directory=>sources.map(name=>[raw+"/logos/"+directory+"/"+name+".png","png"])),
    ...sources.map(name=>[raw+"/local-logos/"+name+".png","png"]),
    ["https://cdn.simpleicons.org/"+(simple[make] ?? slug.replaceAll("-","")),"svg"], 
    ...(supplemental.has(make) ? ["svg","png"].map(ext=>["https://cdn.jsdelivr.net/npm/car-brand-logos@1.0.0/"+slug+"-logo."+ext,ext]) : []),
  ];
  for (const [url,ext] of options) {
    const bytes=await fetchLogo(url,ext);
    if (!bytes) continue;
    const file=slug+"."+ext;
    await writeFile(new URL(file,output),bytes);
    const pixels=await sharp(bytes).resize({width:96,height:96,fit:"inside"}).ensureAlpha().raw().toBuffer();
    let visible=0, dark=0, colored=0;
    for(let i=0;i<pixels.length;i+=4) {
      if(pixels[i+3]<128) continue;
      const lo=Math.min(pixels[i],pixels[i+1],pixels[i+2]), hi=Math.max(pixels[i],pixels[i+1],pixels[i+2]);
      visible++; if(hi<125) dark++; if(hi-lo>28) colored++;
    }
    const grayscale=visible>0 && colored/visible<.02;
    downloaded.set(make,{file,isMonochromeDark:grayscale && (dark/visible>.8 || monochromeOverride.has(make)),source:url});
    return;
  }
  missing.push(make);
}
await Promise.all(Array.from({length:10},async()=>{
  for (let make=makeQueue.shift();make;make=makeQueue.shift()) await download(make);
}));
const entries=Object.fromEntries([...downloaded].sort(([first],[second])=>first.localeCompare(second,"hr")));
await writeFile(registry,JSON.stringify(entries,null,2)+"\n");
console.log("Downloaded "+downloaded.size+"/"+CAR_MAKES.length+" brand logos into public/brands/.");
console.log(Object.values(entries).map(entry=>entry.file).join(", "));
if(missing.length) {console.error("Missing: "+missing.join(", "));process.exitCode=1;}
