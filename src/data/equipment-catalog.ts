import { CAR_CATALOG } from "./car-catalog";

export const equipmentCategories = ["Paketi i eksterijer", "Svjetla i vidljivost", "Interijer i udobnost", "Multimedija, sigurnost i pogon"] as const;
type Category = 0 | 1 | 2 | 3;
type Selection = { make: string; model: string; generation?: string; fuel?: string; variant?: string; date?: string };
type Rule = { label: string; category: Category; models?: RegExp; generations?: RegExp; from?: number; until?: number; fuel?: RegExp; trim?: RegExp };
const rules = (category: Category, labels: string, scope: Omit<Rule,"label"|"category"> = {}): Rule[] =>
  labels.split("|").map(label => ({ label, category, ...scope }));

const shared = [
  ...rules(0,"Aluminijski naplatci|Metalik boja|Sportski izgled|Tvornički krovni nosači|Kuka za vuču|Spušteni sportski ovjes|Zaštita podvozja|Krovni spojler|Set zimskih kotača"),
  ...rules(0,"Električna kuka|Adaptivni ovjes|Panoramski krov|Električna vrata prtljažnika|Električna klizna vrata", { from:2006 }),
  ...rules(0,"Sedam sjedala", { models:/SUV|Tiguan|Touran|Sharan|Tayron|Kodiaq|Q7|X5|GLE|GLS|RAV4|Highlander|Sorento|Santa Fe|5008|Espace|Scenic|XC90|Galaxy|S-Max|Zafira|Jogger|Kangoo|Berlingo|Rifter|Combo|Proace|Multivan|Land Cruiser|Defender|Discovery|Model X/i }),
  ...rules(1,"Prednje maglenke|Senzor kiše|Automatsko uključivanje svjetala|Grijani retrovizori|Električno sklopivi retrovizori|Zatamnjena stakla|Pranje prednjih svjetala|Automatsko zatamnjenje retrovizora|Grijano vjetrobransko staklo"),
  ...rules(1,"Ksenonska svjetla", { from:1995, until:2022 }),
  ...rules(1,"LED svjetla|LED stražnja svjetla|Automatska duga svjetla|Svjetla za zavoj", { from:2007 }),
  ...rules(1,"Matrix LED|Dinamički žmigavci|Projekcijski zaslon (HUD)|Akustična stakla", { from:2014 }),
  ...rules(2,"Klima-uređaj|Automatska klima|Dvozonska klima|Središnji naslon za ruke|Podešavanje visine sjedala|Lumbalna potpora|Kožna sjedala|Sportska sjedala|Grijana sjedala|Električna sjedala|Memorija sjedala|Preklopiva stražnja klupa|Kožni upravljač|Višenamjenski upravljač|Električni podizači stakala|Daljinsko centralno zaključavanje"),
  ...rules(2,"Trozonska klima|Četverozonska klima|Grijanje volana|Ambijentalno osvjetljenje|Pristup bez ključa|Masaža sjedala|Ventilacija sjedala|Neovisno grijanje|Rolo zastori|Grijanje stražnjih sjedala", { from:2005 }),
  ...rules(3,"ABS / ESP|ISOFIX|Tempomat|Ograničivač brzine|Putno računalo|Radio|CD / AUX|Prednji parkirni senzori|Stražnji parkirni senzori|Senzor tlaka u gumama|Alarm|Pogon 4×4 / AWD|ASR kontrola proklizavanja|Navigacija|Pomoć pri kretanju uzbrdo|Bluetooth|USB priključak"),
  ...rules(3,"Adaptivni tempomat|Asistent trake|Nadzor mrtvog kuta|Kamera za vožnju unatrag|Pomoć pri spuštanju|Automatsko parkiranje|Kočenje u nuždi|Prepoznavanje znakova|Odabir načina vožnje|Polugice za promjenu stupnja", { from:2005 }),
  ...rules(3,"Apple CarPlay|Android Auto|Digitalni kokpit|Kamera 360°|Bežično punjenje telefona|DAB+ radio|Upozorenje na poprečni promet|Upozorenje na umor|eCall", { from:2014 }),
  ...rules(3,"AC punjenje Type 2|Programirano punjenje|Predgrijavanje kabine|Rekuperacija energije", { fuel:/Struja|Hibrid/ }),
  ...rules(3,"DC brzo punjenje CCS|Predkondicioniranje baterije|Jednopedalna vožnja", { fuel:/Struja/, from:2015 }),
  ...rules(2,"Toplinska pumpa", { fuel:/Struja/, from:2013 }),
];

export const brandEquipment: Readonly<Record<string, readonly Rule[]>> = {
  BMW: [
    ...rules(0,"M Sport paket|M Sport ovjes|M Aerodynamics paket|Shadow Line visoki sjaj", { trim:/M.?Sport|^M\d/iu }),
    ...rules(0,"M Sport kočnice", { from:2011 }), ...rules(1,"BMW Laserlight", { generations:/^(G0[12567]|G1[124-6]|G2[012368])/ }),
    ...rules(1,"Adaptivna LED svjetla", { from:2010 }), ...rules(1,"Head-Up Display", { from:2003 }),
    ...rules(2,"M Sport sjedala (Koža / Alcantara)", { from:2004, trim:/M.?Sport|^M\d/iu }),
    ...rules(2,"Soft-Close zatvaranje vrata", { models:/Serija [5678]|X[567]/ }),
    ...rules(2,"Ventilacija sjedala", { models:/Serija [5678]|X[567]/ }),
    ...rules(2,"Webasto grijanje", { fuel:/Dizel|Benzin/ }), ...rules(2,"Panorama stakleni krov", { models:/X[1-7]|Serija [235]/ }),
    ...rules(3,"BMW Live Cockpit Professional|Driving Assistant Professional|Parking Assistant Plus (360° kamera)", { generations:/^G|^U|^I/ }),
    ...rules(3,"Harman Kardon Surround|xDrive pogon|Steptronic Sport (F1 polugice)", { from:2004 }),
    ...rules(3,"Bowers & Wilkins Diamond", { models:/Serija [578]|X[567]|iX/, from:2015 }),
  ],
  Audi: [
    ...rules(0,"S-Line eksterijer|S-Line interijer", { trim:/S.?line/iu }), ...rules(0,"Black Optic paket", { from:2010 }),
    ...rules(0,"Adaptive Air Suspension (zračni ovjes)", { models:/A6|A7|A8|Q5|Q7|Q8|e-tron/ }),
    ...rules(1,"HD Matrix LED svjetla|Audi Laser svjetla", { generations:/^(C8|D5|4M|4N|F1)/ }),
    ...rules(1,"Audi Matrix LED|Dinamički žmigavci", { generations:/^(B9|B10|C7|C8|8Y|F3|FY|4M|D5|F1)/ }),
    ...rules(2,"Ambijentalno osvjetljenje Plus|Grijanje i ventilacija sjedala|Crno nebo|Panorama krov", { from:2013 }),
    ...rules(3,"Audi Virtual Cockpit Plus|360° kamere", { generations:/^(B9|B10|C8|8Y|F3|FY|4M|D5|F1)/ }),
    ...rules(3,"Bang & Olufsen 3D Sound", { from:2015 }),
    ...rules(3,"quattro pogon|MMI Navigation Plus|ACC adaptivni tempomat", { from:2003 }),
  ],
  Volkswagen: [
    ...rules(0,"R-Line paket", { from:2006, trim:/R.?Line/iu }), ...rules(0,"GTI / GTD / R oprema", { models:/^Golf$/, trim:/^(GTI|GTD|R$)/ }),
    ...rules(0,"DCC adaptivna regulacija ovjesa|Tvornička kuka na izvlačenje", { from:2008 }),
    ...rules(1,"IQ.Light LED Matrix", { generations:/^(CD|CB|CT|AD|AX|CR|B9|AC|D2)/, from:2018 }),
    ...rules(2,"ErgoActive masažna sjedala|Keyless Access|Panorama krov", { from:2012 }),
    ...rules(2,"Webasto nezavisno grijanje", { fuel:/Dizel|Benzin/ }), ...rules(3,"Harman Kardon", { from:2019 }),
    ...rules(3,"Dynaudio", { from:2005, until:2020 }), ...rules(3,"Digital Cockpit Pro|Travel Assist|Area View 360°", { from:2018 }),
  ],
  "Mercedes-Benz": [
    ...rules(0,"AMG Line eksterijer|AMG Line interijer", { from:2012, trim:/AMG.?Line/iu }),
    ...rules(0,"Night paket", { from:2012 }), ...rules(0,"AIRMATIC zračni ovjes", { models:/C-klasa|E-klasa|S-klasa|GLC|GLE|GLS|EQS|EQE/ }),
    ...rules(1,"MULTIBEAM LED", { from:2015 }), ...rules(1,"DIGITAL LIGHT", { generations:/^(W206|S206|W214|S214|W223|X254|C254|V297|V295)/ }),
    ...rules(2,"Ambijentalno osvjetljenje (64 boje)|Keyless-Go|Panorama klizni krov|Grijanje i hlađenje sjedala", { from:2016 }),
    ...rules(3,"MBUX Widescreen Cockpit", { from:2018 }), ...rules(3,"Burmester Surround Sound|4MATIC pogon|DISTRONIC Plus|Parking paket s 360° kamerom", { from:2013 }),
  ],
  "Škoda": [
    ...rules(0,"Sportline", { from:2015, trim:/Sport.?line/iu }), ...rules(0,"RS paket", { models:/Octavia|Fabia|Kodiaq|Enyaq/, trim:/^RS/ }),
    ...rules(0,"Laurin & Klement", { models:/Octavia|Superb|Kodiaq|Karoq|Enyaq/, trim:/Laurin|L&K/iu }),
    ...rules(0,"DCC adaptivni ovjes", { models:/Octavia|Superb|Kodiaq|Karoq|Enyaq/, from:2015 }),
    ...rules(1,"Matrix LED prednja svjetla", { generations:/^(NX|3V|3Y|NZ|NS|PS|NW|PJ|5L|NY|NE)/, from:2019 }),
    ...rules(2,"Webasto", { fuel:/Dizel|Benzin/ }), ...rules(2,"Kessy Full|Panorama krov", { from:2014 }),
    ...rules(3,"Virtual Cockpit|Travel Assist", { from:2018 }),
    ...rules(3,"Canton Sound System", { models:/Octavia|Superb|Kodiaq|Karoq|Enyaq/, from:2013 }),
  ],
  Porsche: [...rules(0,"Sport Chrono paket|PASM", { from:2004 }), ...rules(0,"PASM zračni ovjes", { models:/Macan|Cayenne|Panamera|Taycan/ }),
    ...rules(1,"Porsche Dynamic Light System (PDLS)|HD Matrix LED"), ...rules(3,"PDK", { models:/911|718|Boxster|Cayman|Macan|Panamera/, fuel:/Benzin|Hibrid|Dizel/, from:2008 }), ...rules(3,"Bose Surround|Burmester High-End")],
  Tesla: [...rules(3,"Autopilot|Enhanced Autopilot|Premium Audio|Sentry Mode"), ...rules(2,"Stakleni krov"), ...rules(1,"Matrix LED svjetla", { from:2021 })],
  Volvo: [...rules(0,"R-Design|Polestar Engineered"), ...rules(3,"Pilot Assist|Bowers & Wilkins|Harman Kardon|City Safety", { from:2015 })],
  Renault: [...rules(0,"GT-Line / R.S. Line|Esprit Alpine"), ...rules(3,"4Control", { models:/Laguna|Mégane|Talisman|Espace|Austral|Rafale/ }), ...rules(3,"Bose|OpenR Link")],
  Peugeot: [...rules(0,"GT Line|GT Pack"), ...rules(3,"i-Cockpit 3D|Focal Premium Hi-Fi", { from:2016 })],
  Opel: [...rules(0,"GS Line|OPC Line"), ...rules(1,"IntelliLux LED Pixel", { from:2016 }), ...rules(2,"AGR ergonomska sjedala")],
  Ford: [...rules(0,"ST-Line|Vignale|Active"), ...rules(3,"SYNC|B&O Sound System|Ford Co-Pilot360"), ...rules(1,"Quickclear grijano vjetrobransko staklo")],
  Toyota: [...rules(0,"GR Sport"), ...rules(3,"Toyota Safety Sense|JBL Premium Audio|AWD-i", { from:2015 })],
  Hyundai: [...rules(0,"N Line"), ...rules(3,"Hyundai SmartSense|Bose Premium Sound|Highway Driving Assist", { from:2015 })],
  Kia: [...rules(0,"GT-Line"), ...rules(3,"Meridian Premium Sound|Harman Kardon|Highway Driving Assist", { from:2017 })],
  Mazda: [...rules(3,"i-Activsense|Bose Premium Sound|i-Activ AWD"), ...rules(2,"Nappa koža")],
  "Land Rover": [...rules(0,"Dynamic paket"), ...rules(3,"Terrain Response|Meridian Surround|ClearSight")],
  Jaguar: [...rules(0,"R-Dynamic"), ...rules(3,"Meridian Surround|Adaptive Dynamics")],
  Honda: [...rules(3,"Honda SENSING|Honda CONNECT|Real Time AWD")],
  Nissan: [...rules(3,"ProPILOT Assist|Around View Monitor|Bose Personal")],
  Suzuki: [...rules(3,"ALLGRIP|Suzuki Safety Support")],
  Seat: [...rules(0,"FR paket"), ...rules(3,"SEAT Digital Cockpit|BeatsAudio|Drive Profile")],
  Cupra: [...rules(0,"VZ paket"), ...rules(3,"DCC|CUPRA Drive Profile|Sennheiser Sound")],
  Dacia: [...rules(0,"Extreme paket|Modularni krovni nosači"), ...rules(3,"Media Nav|Extended Grip")],
  "Citroën": [...rules(2,"Advanced Comfort sjedala"), ...rules(0,"Progressive Hydraulic Cushions"), ...rules(3,"Drive Assist")],
  "Alfa Romeo": [...rules(0,"Veloce paket"), ...rules(3,"DNA selektor|Q4 pogon|Harman Kardon")],
  Fiat: [...rules(0,"Sport paket"), ...rules(3,"Uconnect|City upravljanje")],
  Jeep: [...rules(0,"Trailhawk paket"), ...rules(3,"Selec-Terrain|Rock-Trac|Alpine Premium Audio")],
  Mini: [...rules(0,"John Cooper Works paket"), ...rules(3,"MINI Connected|Harman Kardon|ALL4 pogon")],
  Lexus: [...rules(0,"F Sport"), ...rules(3,"Lexus Safety System+|Mark Levinson Premium Sound")],
  Mitsubishi: [...rules(3,"Super All Wheel Control|MI-PILOT")],
  Subaru: [...rules(3,"EyeSight|Symmetrical AWD|X-Mode")],
  "DS Automobiles": [...rules(2,"Nappa koža|DS Active Scan Suspension"), ...rules(3,"Focal Electra|DS Drive Assist")],
  MG: [...rules(3,"MG Pilot|360° kamera")],
  BYD: [...rules(3,"DiLink|V2L napajanje", { fuel:/Struja|Hibrid/ })],
  Smart: [...rules(0,"BRABUS paket"), ...rules(3,"Beats Premium Audio")],
  Geely: [...rules(3,"Geely Galaxy OS|Adaptivni tempomat s centriranjem trake")],
  Omoda: [...rules(3,"Sony audio|Omoda ADAS")],
  Jaecoo: [...rules(3,"All Road Drive Intelligent System|Sony audio")],
  Dongfeng: [...rules(3,"Dongfeng ADAS|Kamera s prikazom podvozja")],
  Forthing: [...rules(2,"Ventilirana prednja sjedala|Kapetanska sjedala", {models:/U-Tour|Yacht/})],
  Chevrolet: [...rules(3,"Chevrolet MyLink|Bose Premium Audio"), ...rules(0,"RS paket|Z71 Off-Road", {models:/Camaro|Colorado|Silverado|Tahoe/})],
  KGM: [...rules(3,"Selektivni 4WD s reduktorom", {models:/Rexton|Musso/}), ...rules(0,"Black Edition")],
  Leapmotor: [...rules(3,"Leapmotor Pilot|V2L napajanje", {models:/C10|B10/})],
  Maxus: [...rules(3,"360° panoramski prikaz", {models:/MIFA|T90|eTerron/})],
  Ineos: [...rules(0,"Fieldmaster|Trialmaster|Safari prozori"), ...rules(3,"Blokade prednjeg i stražnjeg diferencijala")],
  Abarth: [...rules(0,"Competizione paket|Record Monza ispušni sustav", {fuel:/Benzin/}), ...rules(3,"Abarth Sound Generator", {fuel:/Struja/})],
  Alpine: [...rules(0,"Aero Kit|Sabelt školjkasta sjedala", {models:/A110/}), ...rules(3,"Alpine Telemetrics")],
  "Aston Martin": [...rules(0,"Q by Aston Martin|Carbon Fibre paket"), ...rules(3,"Bowers & Wilkins")],
  Bentley: [...rules(0,"Mulliner Driving Specification|Blackline Specification"), ...rules(3,"Naim for Bentley|Bentley Dynamic Ride")],
  Ferrari: [...rules(0,"Assetto Fiorano", {models:/SF90|296/}), ...rules(3,"Manettino|Podizanje prednje osovine")],
  Lamborghini: [...rules(0,"Ad Personam|Carbon Skin"), ...rules(3,"ANIMA selektor|Podizanje prednje osovine")],
  Maserati: [...rules(0,"Trofeo paket|Fuoriserie"), ...rules(3,"Q4 pogon|Sonus faber zvučni sustav")],
  "Rolls-Royce": [...rules(2,"Starlight Headliner|Coach Doors"), ...rules(3,"Bespoke Audio")],
  Lotus: [...rules(0,"Touring paket|Track paket"), ...rules(3,"KEF Premium Audio", {models:/Emira|Eletre|Emeya/})],
  Dodge: [...rules(0,"Blacktop paket|SRT paket"), ...rules(3,"Uconnect|Harman Kardon")],
  Ram: [...rules(0,"RamBox Cargo Management|Off-Road Group"), ...rules(3,"Uconnect|Active-Level zračni ovjes")],
  Polestar: [...rules(0,"Performance paket|Pilot paket|Plus paket"), ...rules(3,"Harman Kardon|Bowers & Wilkins")],
  Daewoo: [...rules(0,"SX / CDX paket")],
  DFSK: [...rules(3,"360° panoramska kamera", {models:/Glory|Fengon/})],
  Seres: [...rules(3,"V2L napajanje", {models:/5|7/,fuel:/Struja/})],
  Lancia: [...rules(0,"HF Line"), ...rules(3,"S.A.L.A. infotainment", {from:2024})],
  "Lynk & Co": [...rules(3,"Infinity Premium Audio|Lynk & Co Connected Services")],
  Mahindra: [...rules(3,"4XPLOR terenski pogon", {models:/Scorpio|Thar/})],
  Maybach: [...rules(2,"Executive sjedala|First-Class stražnji odjeljak"), ...rules(3,"Burmester High-End 4D")],
  Rimac: [...rules(3,"Rimac All-Wheel Torque Vectoring|Rimac Driver Coach")],
  Vauxhall: [...rules(0,"GS Line|VXR paket"), ...rules(1,"IntelliLux LED Pixel", {from:2016})],
  Zeekr: [...rules(3,"Yamaha Premium Audio|Zeekr AD")],
};

export const equipmentId = (label: string) => "eq:" + label.toLocaleLowerCase("hr-HR").normalize("NFKC");
const standardModern = new Set(["ABS / ESP","ISOFIX","Senzor tlaka u gumama","eCall"]);
export function equipmentFor(vehicle: Selection, filter = false) {
  const { make, model, generation, fuel, variant, date } = vehicle;
  const catalog = (Object.hasOwn(CAR_CATALOG,make) ? CAR_CATALOG[make as keyof typeof CAR_CATALOG] : undefined) as Record<string, { generations: readonly { codes: readonly string[]; description: string }[] }> | undefined;
  const modelGeneration = catalog?.[model]?.generations.find(item => item.codes.includes(generation ?? ""));
  const year = Number(date?.slice(0,4)) || (filter ? 0 : Number(modelGeneration?.description.match(/\b(?:19|20)\d{2}\b/)?.[0])) || 0;
  const options = new Map<string, { id:string; label:string; category:Category; recommended:boolean }>();
  for (const option of [...(Object.hasOwn(brandEquipment, make) ? brandEquipment[make] : []), ...shared]) {
    if (model && option.models && !option.models.test(model)) continue;
    if (generation && option.generations && !option.generations.test(generation)) continue;
    if (year && ((option.from && year < option.from) || (option.until && year > option.until))) continue;
    if (option.fuel && (fuel ? !option.fuel.test(fuel) : !filter)) continue;
    if (!filter && option.generations && !generation) continue;
    const id = equipmentId(option.label);
    if (!options.has(id)) options.set(id, { id, label: option.label, category: option.category,
      recommended: Boolean(option.trim?.test(variant ?? "")) || (year >= 2018 && Number(date?.slice(0,4)) >= 2018 && standardModern.has(option.label)) });
  }
  return [...options.values()];
}
