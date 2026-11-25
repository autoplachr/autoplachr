import { normalizePhone, profileErrors } from "../src/data/profile-validation";
import { formatHours, presetHours, validHours } from "../src/data/working-hours";
import type { Account, OwnedListing, Profile } from "./account-api";
import type { Vehicle } from "./catalog";

type LocalAccount = Account & { salt:string; password:string; used:Record<string,string[]>; otpUntil?:number };
type LocalStore = { accounts:LocalAccount[]; active?:string; reports?:string[] };
const key = "autoplac.local-demo.v1";
export const localDemo = () => typeof window !== "undefined" && ["localhost","127.0.0.1","[::1]"].includes(window.location.hostname);
export function demoCredentials(type:Profile["type"], unique = false) {
  const suffix = unique ? "-" + crypto.randomUUID().slice(0,8) : "";
  return { type, name:type === "dealer" ? "Test Autokuća B2B" : "Test Privatni prodavač",
    email:"test-" + type + suffix + "@example.test", password:"Autoplac-Test-12345", city:"Zagreb", postalCode:"10000",
    county:"Grad Zagreb", phone:type === "dealer" ? "099 000 0001" : "099 000 0002", oib:"12345678900", address:"Testna 42",
    workingHours:presetHours(1), terms:true, declaration:true };
}

async function derive(password:string,salt:string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",iterations:600000,salt:enc.encode(salt)},key,256);
  return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,"0")).join("");
}
function makeProfile(data:Record<string,unknown>, type:Profile["type"]):Profile {
  const errors = profileErrors(data,type === "dealer");
  if (Object.keys(errors).length) throw Object.assign(new Error("Provjerite označena polja."),{fields:errors});
  const workingHours = typeof data.workingHours === "string" ? JSON.parse(data.workingHours) : data.workingHours;
  if (type === "dealer" && !validHours(workingHours)) throw new Error("Provjerite radno vrijeme.");
  const text = (name:string) => String(data[name] ?? "").trim();
  return { type,name:text("name"),city:text("city"),postalCode:text("postalCode"),county:text("county"),phone:normalizePhone(text("phone")),
    alerts:data.alerts === true,analytics:data.analytics === true,
    ...(type === "dealer" && validHours(workingHours) ? { workingHours,hours:formatHours(workingHours),oib:text("oib"),address:text("address"),importUrl:text("importUrl") } : {}) };
}
const address = (profile:Profile) => profile.address && [profile.address,profile.postalCode+" "+profile.city].join(", ");
const publicListing = (item:OwnedListing, account:LocalAccount) => ({...item,phone:"",contactAvailable:true,dealershipId:item.dealer ? account.id : undefined});

export async function localApi(endpoint:string,input:object = {}):Promise<unknown> {
  const data = input as Record<string,unknown>;
  const state:LocalStore = JSON.parse(localStorage.getItem(key) || '{"accounts":[]}');
  const save = () => localStorage.setItem(key,JSON.stringify(state));
  const account = state.accounts.find(item=>item.id===state.active);
  const owners = () => state.accounts.flatMap(owner=>owner.listings.filter(item=>item.status==="active").map(item=>({item,owner})));
  if (endpoint === "config") return { demoOtp:true };
  if (endpoint === "account") {
    if (!account) return null;
    const {salt,password,used,otpUntil,...visible} = account;
    return visible;
  }
  if (endpoint === "inventory") return owners().sort((a,b)=>Number((b.item.boostedUntil ?? 0)>Date.now()/1000)-Number((a.item.boostedUntil ?? 0)>Date.now()/1000)).map(({item,owner})=>publicListing(item,owner));
  if (endpoint === "view" || endpoint === "phone") {
    const found = owners().find(({item})=>item.id===data.id);
    if (!found) throw new Error("Oglas nije dostupan.");
    if (endpoint === "view") found.item.views++; else found.item.reveals++;
    save();return {phone:found.item.phone};
  }
  if (endpoint === "auth/demo" || endpoint === "auth/register" || endpoint === "auth/login") {
    const demo = endpoint === "auth/demo";
    const type = data.type === "dealer" ? "dealer" : "private";
    const supplied = demo ? demoCredentials(type) : data;
    const email = String(supplied.email ?? "").trim().toLowerCase(), password = String(supplied.password ?? "");
    let user = state.accounts.find(item=>item.email===email);
    if (endpoint === "auth/register" || (demo && !user)) {
      if (user) throw Object.assign(new Error("Račun s tom e-poštom već postoji."),{fields:{email:"Račun s tom e-poštom već postoji."}});
      if (!supplied.terms || !supplied.declaration || password.length<12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Provjerite podatke za registraciju.");
      const profile = makeProfile(supplied,type), salt = crypto.randomUUID();
      user = {id:crypto.randomUUID(),email,profile,salt,password:await derive(password,salt),verified:demo,moderator:false,listings:[],favorites:[],used:{}};
      state.accounts.push(user);
    } else if (!user || (!demo && await derive(password,user.salt)!==user.password)) throw new Error("E-pošta ili lozinka nije ispravna.");
    state.active=user.id;save();return {ok:true};
  }
  if (endpoint === "report") {const id = crypto.randomUUID(); (state.reports ??= []).push(id);save();return {id};}
  if (endpoint.startsWith("report/status?id=")) {
    if (state.reports?.includes(endpoint.split("=")[1])) return {status:"pending"};
    throw new Error("Prijava nije pronađena.");
  }
  if (!account) throw new Error("Prijavite se kako biste nastavili.");
  const listing = account.listings.find(item=>item.id===data.id);
  switch(endpoint) {
    case "auth/logout": delete state.active;break;
    case "otp/start": account.otpUntil=Date.now()+300000;save();return {demoCode:"123456"};
    case "otp/verify":
      if (!account.otpUntil || account.otpUntil<Date.now() || data.code!=="123456") throw new Error("Kod nije ispravan ili je istekao.");
      account.verified=true;delete account.otpUntil;break;
    case "profile": {
      const next = makeProfile({...account.profile,...data},account.profile.type);
      if (next.phone!==account.profile.phone) {
        account.verified=false;delete account.otpUntil;
        if(next.type==="private") for(const item of account.listings) if(item.status==="active") item.status="draft";
      }
      account.profile=next;
      for(const item of account.listings) Object.assign(item,{seller:next.name,phone:next.phone,sellerAddress:address(next),sellerHours:next.hours,sellerWorkingHours:next.workingHours});
      break;
    }
    case "favorite":
      if (data.saved && !account.favorites.some(item=>item.id===data.id)) account.favorites.push({id:String(data.id),price:Number(data.price)});
      if (!data.saved) account.favorites=account.favorites.filter(item=>item.id!==data.id);
      break;
    case "listing/save": {
      const vehicle = data.vehicle as Vehicle, status = data.status as OwnedListing["status"];
      const old = account.listings.find(item=>item.id===vehicle.id);
      if (status==="active" && account.profile.type==="private") {
        if (!account.verified) throw new Error("Potvrdite telefon prije objave.");
        const year = new Intl.DateTimeFormat("en",{year:"numeric",timeZone:"Europe/Zagreb"}).format(new Date());
        const used = account.used[year] ??= [];
        if (!Object.values(account.used).some(ids=>ids.includes(vehicle.id))) {
          if (used.length>=2) throw new Error("Iskoristili ste dva besplatna oglasa za ovu kalendarsku godinu.");
          used.push(vehicle.id);
        }
      }
      const result = {...vehicle, status, seller:account.profile.name, phone:account.profile.phone,email:account.email,verified:false,dealer:account.profile.type==="dealer",
        views:old?.views ?? 0,reveals:old?.reveals ?? 0,boostedUntil:old?.boostedUntil,sellerAddress:address(account.profile),sellerHours:account.profile.hours,sellerWorkingHours:account.profile.workingHours};
      account.listings = old ? account.listings.map(item=>item.id===vehicle.id ? result : item) : [result,...account.listings];
      break;
    }
    case "listing/delete": account.listings=account.listings.filter(item=>item.id!==data.id);break;
    case "listing/boost":
      if(listing?.status!=="active") throw new Error("Samo aktivni oglasi mogu se istaknuti.");
      listing.boostedUntil=Date.now()/1000+604800;break;
    case "password":
    case "account/delete":
      if(await derive(String(endpoint==="password" ? data.current : data.password),account.salt)!==account.password) throw new Error("Lozinka nije ispravna.");
      if(endpoint==="account/delete") {state.accounts=state.accounts.filter(item=>item.id!==account.id);delete state.active;}
      else {if(String(data.password).length<12) throw new Error("Lozinka mora imati najmanje 12 znakova.");account.password=await derive(String(data.password),account.salt);}
      break;
    default: throw new Error("Usluga nije dostupna u lokalnoj demonstraciji.");
  }
  save();return {ok:true};
}
