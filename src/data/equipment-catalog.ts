import { CAR_CATALOG } from "./car-catalog";

export const equipmentCategories = [
  "Paketi i eksterijer",
  "Svjetla i vidljivost",
  "Interijer i udobnost",
  "Multimedija, sigurnost i pogon",
] as const;

type Category = 0 | 1 | 2 | 3;
type Selection = {
  make: string;
  model: string;
  generation?: string;
  fuel?: string;
  variant?: string;
  date?: string;
  bodyType?: string;
};
type Rule = {
  label: string;
  category: Category;
  models?: RegExp;
  generations?: RegExp;
  from?: number;
  until?: number;
  fuel?: RegExp;
  trim?: RegExp;
  body?: RegExp;
};

const rules = (category: Category, labels: string, scope: Omit<Rule, "label" | "category"> = {}): Rule[] =>
  labels.split("|").map(label => ({ label, category, ...scope }));

const BODY_PATTERNS = {
  suv: /suv|teren|crossover|x[1-7]\b|ix\d|q[2-8]\b|gla|glb|glc|glk|gle|gls|ml|g-klasa|tiguan|t-roc|t-cross|taigo|tayron|touareg|karoq|kodiaq|kamiq|enyaq|elroq|duster|bigster|captur|kadjar|austral|arkana|koleos|2008|3008|5008|aircross|mokka|crossland|grandland|frontera|antara|kuga|puma|ecosport|explorer|rav4|c-hr|highlander|land cruiser|cx-3|cx-30|cx-5|cx-60|cx-80|hr-v|cr-v|zr-v|juke|qashqai|x-trail|vitara|s-cross|jimny|ignis|outlander|asx|eclipse|pajero|forester|xv|crosstrek|tucson|kona|santa fe|bayon|stonic|niro|sportage|sorento|torres|korando|tivoli|rexton|xc40|xc60|xc90|ex30|ex90|range rover|discovery|defender|freelander|e-pace|f-pace|i-pace|wrangler|cherokee|renegade|compass|avenger|macan|cayenne|urus|dbx|bentayga|cullinan|levante|grecale|model y|model x|atto|seal u|sealion|coolray|cityray|starray|omoda|jaecoo|t5 evo|glory|fengon|niva|grenadier|tiggo/i,
  pickup: /pick-up|pickup|hilux|ranger|amarok|navara|l200|d-max|musso|ram|1500|2500|3500|gladiator|cybertruck|quartermaster|t90|goa|xenon|sierra/i,
  wagonMpvVan: /karavan|touring|avant|variant|estate|sw\b|combi|kombi|dostav|mpv|monovolumen|touran|sharan|caddy|transporter|multivan|crafter|v-klasa|vito|sprinter|citan|b-klasa|zafira|combo|vivaro|movano|scénic|scenic|espace|kangoo|trafic|master|berlingo|partner|rifter|traveller|boxer|jumpy|jumper|doblo|doblò|ducato|scudo|fiorino|s-max|galaxy|c-max|b-max|tourneo|transit|jogger|lodgy|dokker|carens|carnival|venga|meriva|verso|proace|daily|voyager|pacifica|euniq|mifa|edeliver|staria/i,
  cabrio: /cabrio|roadster|spider|spyder|boxster|mx-5|z3|z4|slk|slc|sl\b|124 spider|dawn|cyberster|copen|s2000/i,
};

function inferBodyKind(selection: Selection): string {
  if (selection.bodyType) return selection.bodyType.toLowerCase();
  const text = `${selection.make} ${selection.model} ${selection.generation ?? ""} ${selection.variant ?? ""}`;
  if (BODY_PATTERNS.pickup.test(text)) return "pick-up";
  if (BODY_PATTERNS.cabrio.test(text)) return "cabrio";
  if (BODY_PATTERNS.wagonMpvVan.test(text)) return "kombi / karavan / mpv";
  if (BODY_PATTERNS.suv.test(text)) return "suv / terenac";
  return "limuzina / kompakt";
}

const shared: Rule[] = [
  // Eksterijer i paketi
  ...rules(0, "Aluminijski naplatci|Metalik boja|Sportski izgled|Kuka za vuču|Set zimskih kotača"),
  ...rules(0, "Tvornički krovni nosači|Krovni spojler|Zaštita podvozja", { body: /suv|karavan|kombi|mpv|pick-up/i }),
  ...rules(0, "Spušteni sportski ovjes", { from: 1995 }),
  ...rules(0, "Šiber / Krovni otvor", { until: 2016 }),
  ...rules(0, "Električni sklopivi krov|Vjetrobran (Windschott)", { body: /cabrio|roadster/i }),
  ...rules(0, "Pokrov tovarnog prostora|Zaštitna obloga sanduka", { body: /pick-up/i }),
  ...rules(0, "Klizna vrata|Pregrada prtljažnog prostora", { body: /kombi|dostav|mpv/i }),
  ...rules(0, "Električna kuka|Adaptivni ovjes|Panoramski krov|Električna vrata prtljažnika", { from: 2006 }),
  ...rules(0, "Električna klizna vrata", { from: 2006, body: /kombi|mpv/i }),
  ...rules(0, "Sedam sjedala", {
    models: /SUV|Tiguan|Touran|Sharan|Tayron|Kodiaq|Q7|X5|X7|GLE|GLS|RAV4|Highlander|Sorento|Santa Fe|5008|Espace|Scenic|XC90|EX90|Galaxy|S-Max|Zafira|Jogger|Kangoo|Berlingo|Rifter|Combo|Proace|Multivan|Transporter|Land Cruiser|Defender|Discovery|Model X|Model Y|GLB|Tarraco|Alhambra|Rexton|Torres|Outlander|Pajero|Tahoe|Escalade|Durango|Voyager|Euniq|MIFA|Tiggo 8/i,
  }),

  // Svjetla i vidljivost
  ...rules(1, "Prednje maglenke|Grijani retrovizori|Zatamnjena stakla|Pranje prednjih svjetala"),
  ...rules(1, "Senzor kiše|Automatsko uključivanje svjetala|Električno sklopivi retrovizori|Automatsko zatamnjenje retrovizora|Grijano vjetrobransko staklo", { from: 1998 }),
  ...rules(1, "Ksenonska svjetla / Bi-Xenon", { from: 1995, until: 2020 }),
  ...rules(1, "LED svjetla|LED stražnja svjetla|Automatska duga svjetla|Svjetla za zavoj", { from: 2007 }),
  ...rules(1, "Matrix LED|Dinamički žmigavci|Projekcijski zaslon (HUD)|Akustična stakla", { from: 2014 }),

  // Interijer i udobnost
  ...rules(2, "Servo upravljač", { until: 2010 }),
  ...rules(2, "Klima-uređaj|Središnji naslon za ruke|Podešavanje visine sjedala|Kožna sjedala|Sportska sjedala|Grijana sjedala|Preklopiva stražnja klupa|Kožni upravljač|Električni podizači stakala|Daljinsko centralno zaključavanje"),
  ...rules(2, "Automatska klima|Lumbalna potpora|Električna sjedala|Memorija sjedala|Višenamjenski upravljač", { from: 1994 }),
  ...rules(2, "Dvozonska klima|Webasto nezavisno grijanje", { from: 2000 }),
  ...rules(2, "Trozonska klima|Četverozonska klima|Grijanje volana|Ambijentalno osvjetljenje|Pristup bez ključa|Masaža sjedala|Ventilacija sjedala|Rolo zastori|Grijanje stražnjih sjedala", { from: 2006 }),
  ...rules(2, "Grijanje vrata (Airscarf)", { from: 2005, body: /cabrio|roadster/i }),
  ...rules(2, "Toplinska pumpa", { fuel: /Struja|Električni|Plug-in/i, from: 2013 }),

  // Multimedija, sigurnost i pogon
  ...rules(3, "Radio / CD / Kasetofon", { until: 2013 }),
  ...rules(3, "ABS|Zračni jastuci|Putno računalo|Tempomat|Alarm|Pogon 4×4 / AWD"),
  ...rules(3, "ESP / Kontrola stabilnosti|ASR kontrola proklizavanja|Stražnji parkirni senzori", { from: 1998 }),
  ...rules(3, "ISOFIX|Ograničivač brzine|Prednji parkirni senzori|Navigacija", { from: 2001 }),
  ...rules(3, "Bluetooth|USB priključak|Senzor tlaka u gumama|Pomoć pri kretanju uzbrdo", { from: 2006 }),
  ...rules(3, "Pomoć pri spuštanju nizbrdo|Blokada diferencijala", { body: /suv|pick-up/i }),
  ...rules(3, "Adaptivni tempomat|Asistent trake|Nadzor mrtvog kuta|Kamera za vožnju unatrag|Automatsko parkiranje|Kočenje u nuždi|Prepoznavanje znakova|Odabir načina vožnje|Polugice za promjenu stupnja", { from: 2009 }),
  ...rules(3, "Apple CarPlay|Android Auto|Digitalni kokpit|Kamera 360°|Bežično punjenje telefona|DAB+ radio|Upozorenje na poprečni promet|Upozorenje na umor|eCall", { from: 2014 }),
  ...rules(3, "Kabel za punjenje Type 2|Programirano punjenje|Predgrijavanje kabine|Rekuperacija energije", { fuel: /Struja|Električni|Hibrid|Plug-in/i }),
  ...rules(3, "DC brzo punjenje CCS|Predkondicioniranje baterije|Jednopedalna vožnja", { fuel: /Struja|Električni/i, from: 2014 }),
  ...rules(3, "V2L vanjsko napajanje", { fuel: /Struja|Električni|Plug-in/i, from: 2021 }),
];

export const brandEquipment: Readonly<Record<string, readonly Rule[]>> = {
  BMW: [
    ...rules(0, "M Sport paket|M Sport ovjes|M Aerodynamics paket|Shadow Line visoki sjaj", { from: 1992, trim: /M.?Sport|^M\d/iu }),
    ...rules(0, "M Sport kočnice", { from: 2011 }),
    ...rules(1, "BMW Laserlight", { generations: /^(G0[12567]|G1[124-6]|G2[012368])/ }),
    ...rules(1, "Adaptivna LED svjetla", { from: 2010 }),
    ...rules(1, "Head-Up Display", { from: 2003 }),
    ...rules(2, "M Sport sjedala (Koža / Alcantara)", { from: 1995, trim: /M.?Sport|^M\d/iu }),
    ...rules(2, "Soft-Close zatvaranje vrata", { models: /Serija [5678]|X[567]/, from: 2002 }),
    ...rules(2, "Ventilacija sjedala", { models: /Serija [5678]|X[567]/, from: 2004 }),
    ...rules(2, "Webasto grijanje", { fuel: /Dizel|Benzin/ }),
    ...rules(2, "Panorama stakleni krov", { models: /X[1-7]|Serija [235]/, from: 2004 }),
    ...rules(3, "BMW Live Cockpit Professional|Driving Assistant Professional|Parking Assistant Plus (360° kamera)", { generations: /^G|^U|^I/ }),
    ...rules(3, "Harman Kardon Surround|xDrive pogon|Steptronic Sport (F1 polugice)", { from: 2004 }),
    ...rules(3, "Bowers & Wilkins Diamond", { models: /Serija [578]|X[567]|iX|XM/, from: 2015 }),
  ],
  Audi: [
    ...rules(0, "S-Line eksterijer|S-Line interijer", { from: 2001, trim: /S.?line/iu }),
    ...rules(0, "Black Optic paket", { from: 2010 }),
    ...rules(0, "Adaptive Air Suspension (zračni ovjes)", { models: /A6|A7|A8|Q5|Q7|Q8|e-tron/, from: 2004 }),
    ...rules(1, "HD Matrix LED svjetla|Audi Laser svjetla", { generations: /^(C8|C9|D5|4M|4N|F1)/ }),
    ...rules(1, "Audi Matrix LED|Dinamički žmigavci", { generations: /^(B9|B10|C7|C8|C9|8Y|F3|FJ|FY|GU|4M|D5|F1)/ }),
    ...rules(2, "Ambijentalno osvjetljenje Plus|Grijanje i ventilacija sjedala|Crno nebo|Panorama krov", { from: 2012 }),
    ...rules(3, "Audi Virtual Cockpit Plus|360° kamere", { generations: /^(B9|B10|C8|C9|8Y|F3|FJ|FY|GU|4M|D5|F1|F4|GF)/ }),
    ...rules(3, "Bang & Olufsen 3D Sound", { from: 2015 }),
    ...rules(3, "quattro pogon|MMI Navigation Plus|ACC adaptivni tempomat", { from: 1995 }),
  ],
  Volkswagen: [
    ...rules(0, "R-Line paket", { from: 2006, trim: /R.?Line/iu }),
    ...rules(0, "GTI / GTD / R oprema", { models: /^Golf|Polo|Scirocco$/, trim: /^(GTI|GTD|R$)/ }),
    ...rules(0, "DCC adaptivna regulacija ovjesa|Tvornička kuka na izvlačenje", { from: 2008 }),
    ...rules(1, "IQ.Light LED Matrix", { generations: /^(CD|CB|CT|AD|AX|CR|B9|AC|D2|E1|E2|E39|ED|EB)/, from: 2018 }),
    ...rules(2, "ErgoActive masažna sjedala|Keyless Access|Panorama krov", { from: 2012 }),
    ...rules(2, "Webasto nezavisno grijanje", { fuel: /Dizel|Benzin/ }),
    ...rules(3, "Harman Kardon", { from: 2019 }),
    ...rules(3, "Dynaudio", { from: 2005, until: 2020 }),
    ...rules(3, "Digital Cockpit Pro|Travel Assist|Area View 360°", { from: 2017 }),
    ...rules(3, "4Motion pogon", { from: 1998 }),
  ],
  "Mercedes-Benz": [
    ...rules(0, "AMG Line eksterijer|AMG Line interijer", { from: 2012, trim: /AMG.?Line/iu }),
    ...rules(0, "Avantgarde paket|Elegance paket", { until: 2020 }),
    ...rules(0, "Night paket", { from: 2012 }),
    ...rules(0, "AIRMATIC zračni ovjes", { models: /C-klasa|E-klasa|S-klasa|GLC|GLE|GLS|EQS|EQE/, from: 2002 }),
    ...rules(1, "MULTIBEAM LED", { from: 2015 }),
    ...rules(1, "DIGITAL LIGHT", { generations: /^(W206|S206|W214|S214|W223|V223|X254|C254|V297|V295|C236)/ }),
    ...rules(2, "Ambijentalno osvjetljenje (64 boje)|Keyless-Go|Panorama klizni krov|Grijanje i hlađenje sjedala", { from: 2016 }),
    ...rules(3, "MBUX Widescreen Cockpit", { from: 2018 }),
    ...rules(3, "Burmester Surround Sound|4MATIC pogon|DISTRONIC Plus|Parking paket s 360° kamerom", { from: 2013 }),
  ],
  "Škoda": [
    ...rules(0, "Sportline", { from: 2015, trim: /Sport.?line/iu }),
    ...rules(0, "RS paket", { models: /Octavia|Fabia|Kodiaq|Enyaq/, trim: /^RS/ }),
    ...rules(0, "Laurin & Klement", { models: /Octavia|Superb|Kodiaq|Karoq|Enyaq/, trim: /Laurin|L&K/iu }),
    ...rules(0, "Monte Carlo paket", { models: /Fabia|Scala|Kamiq/, trim: /Monte Carlo/iu }),
    ...rules(0, "DCC adaptivni ovjes", { models: /Octavia|Superb|Kodiaq|Karoq|Enyaq/, from: 2015 }),
    ...rules(1, "Matrix LED prednja svjetla", { generations: /^(NX|3V|3Y|NZ|NS|PS|NW|PJ|5L|NY|NE)/, from: 2019 }),
    ...rules(2, "Webasto", { fuel: /Dizel|Benzin/ }),
    ...rules(2, "Kessy Full|Panorama krov", { from: 2014 }),
    ...rules(3, "Virtual Cockpit|Travel Assist", { from: 2018 }),
    ...rules(3, "Canton Sound System", { models: /Octavia|Superb|Kodiaq|Karoq|Enyaq/, from: 2013 }),
  ],
  Opel: [
    ...rules(0, "GS Line|OPC Line|GSi paket"),
    ...rules(1, "IntelliLux LED Pixel", { from: 2016 }),
    ...rules(2, "AGR ergonomska sjedala", { from: 2009 }),
    ...rules(3, "Multimedia Navi Pro", { from: 2016 }),
  ],
  Porsche: [
    ...rules(0, "Sport Chrono paket|PASM", { from: 2004 }),
    ...rules(0, "PASM zračni ovjes", { models: /Macan|Cayenne|Panamera|Taycan/ }),
    ...rules(1, "Porsche Dynamic Light System (PDLS)|HD Matrix LED", { from: 2010 }),
    ...rules(3, "PDK", { models: /911|718|Boxster|Cayman|Macan|Panamera/, fuel: /Benzin|Hibrid|Dizel/, from: 2008 }),
    ...rules(3, "Bose Surround|Burmester High-End", { from: 2004 }),
  ],
  Seat: [...rules(0, "FR paket"), ...rules(3, "SEAT Digital Cockpit|BeatsAudio|Drive Profile", { from: 2017 })],
  Cupra: [...rules(0, "VZ paket"), ...rules(3, "DCC|CUPRA Drive Profile|Sennheiser Sound")],
  Smart: [...rules(0, "BRABUS paket"), ...rules(3, "Beats Premium Audio", { from: 2015 })],
  Mini: [...rules(0, "John Cooper Works paket"), ...rules(3, "MINI Connected|Harman Kardon|ALL4 pogon")],
  Maybach: [...rules(2, "Executive sjedala|First-Class stražnji odjeljak"), ...rules(3, "Burmester High-End 4D")],
  Renault: [
    ...rules(0, "GT-Line / R.S. Line|Esprit Alpine", { from: 2012 }),
    ...rules(3, "4Control", { models: /Laguna|Mégane|Talisman|Espace|Austral|Rafale/, from: 2008 }),
    ...rules(3, "Bose|OpenR Link", { from: 2012 }),
  ],
  Peugeot: [...rules(0, "GT Line|GT Pack", { from: 2013 }), ...rules(3, "i-Cockpit 3D|Focal Premium Hi-Fi", { from: 2016 })],
  "Citroën": [...rules(2, "Advanced Comfort sjedala", { from: 2018 }), ...rules(0, "Progressive Hydraulic Cushions", { from: 2018 }), ...rules(3, "Drive Assist", { from: 2017 })],
  "DS Automobiles": [...rules(2, "Nappa koža|DS Active Scan Suspension"), ...rules(3, "Focal Electra|DS Drive Assist")],
  Dacia: [...rules(0, "Extreme paket|Stepway paket|Modularni krovni nosači"), ...rules(3, "Media Nav|Extended Grip")],
  Alpine: [...rules(0, "Aero Kit|Sabelt školjkasta sjedala", { models: /A110/ }), ...rules(3, "Alpine Telemetrics")],
  Fiat: [...rules(0, "Sport paket|Cross paket"), ...rules(3, "Uconnect|City upravljanje")],
  "Alfa Romeo": [...rules(0, "Veloce paket|Ti paket|Quadrifoglio paket"), ...rules(3, "DNA selektor|Q4 pogon|Harman Kardon", { from: 2008 })],
  Lancia: [...rules(0, "HF Line|Executive paket"), ...rules(3, "S.A.L.A. infotainment", { from: 2024 })],
  Maserati: [...rules(0, "Trofeo paket|Fuoriserie"), ...rules(3, "Q4 pogon|Sonus faber zvučni sustav")],
  Ferrari: [...rules(0, "Assetto Fiorano", { models: /SF90|296/ }), ...rules(3, "Manettino|Podizanje prednje osovine")],
  Lamborghini: [...rules(0, "Ad Personam|Carbon Skin"), ...rules(3, "ANIMA selektor|Podizanje prednje osovine")],
  Abarth: [...rules(0, "Competizione paket|Record Monza ispušni sustav", { fuel: /Benzin/ }), ...rules(3, "Abarth Sound Generator", { fuel: /Struja|Električni/ })],
  Iveco: [...rules(0, "Pojačani ovjes|Kuka 3.5t"), ...rules(3, "Hi-Matic automatik|Zračno sjedalo vozača")],
  Toyota: [...rules(0, "GR Sport|Executive", { from: 2015 }), ...rules(3, "Toyota Safety Sense|JBL Premium Audio|AWD-i", { from: 2015 })],
  Mazda: [...rules(3, "i-Activsense|Bose Premium Sound|i-Activ AWD", { from: 2012 }), ...rules(2, "Takumi Nappa koža", { from: 2017 })],
  Honda: [...rules(3, "Honda SENSING|Honda CONNECT|Real Time AWD", { from: 2014 })],
  Nissan: [...rules(3, "ProPILOT Assist|Around View Monitor|Bose Personal", { from: 2014 })],
  Suzuki: [...rules(3, "ALLGRIP|Suzuki Safety Support", { from: 2013 })],
  Mitsubishi: [...rules(3, "Super All Wheel Control|MI-PILOT", { from: 2012 })],
  Subaru: [...rules(3, "EyeSight|Symmetrical AWD|X-Mode", { from: 2014 })],
  Lexus: [...rules(0, "F Sport|Luxury"), ...rules(3, "Lexus Safety System+|Mark Levinson Premium Sound", { from: 2012 })],
  Infiniti: [...rules(0, "S Design|Black Edition"), ...rules(3, "Bose Studio|Direct Adaptive Steering")],
  Daihatsu: [...rules(0, "Terenski paket 4WD"), ...rules(3, "Blokada središnjeg diferencijala", { models: /Terios|Feroza/ })],
  Isuzu: [...rules(0, "Zaštita podvozja|Bullbar"), ...rules(3, "Reduktor 4WD Low|Blokada stražnjeg diferencijala")],
  Hyundai: [...rules(0, "N Line|N Performance", { from: 2017 }), ...rules(3, "Hyundai SmartSense|Bose Premium Sound|Highway Driving Assist", { from: 2015 })],
  Kia: [...rules(0, "GT-Line", { from: 2015 }), ...rules(3, "Meridian Premium Sound|Harman Kardon|Highway Driving Assist", { from: 2017 })],
  "SsangYong / KGM": [...rules(0, "Black Edition"), ...rules(3, "Selektivni 4WD s reduktorom", { models: /Rexton|Musso|Kyron|Actyon/ })],
  Daewoo: [...rules(0, "SX / CDX paket")],
  Genesis: [...rules(0, "Sport Line|Luxury paket"), ...rules(3, "Lexicon Premium Audio|Highway Driving Assist II")],
  Volvo: [...rules(0, "R-Design|Inscription|Polestar Engineered", { from: 2010 }), ...rules(3, "Pilot Assist|Bowers & Wilkins|Harman Kardon|City Safety", { from: 2014 })],
  Saab: [...rules(0, "Aero paket|Vector paket"), ...rules(2, "Night Panel kokpit|Ventilirana kožna sjedala"), ...rules(3, "Harman Kardon|XWD pogon")],
  "Land Rover": [...rules(0, "Autobiography|R-Dynamic|HSE"), ...rules(3, "Terrain Response|Meridian Surround|ClearSight", { from: 2010 })],
  Jaguar: [...rules(0, "R-Dynamic|Portfolio"), ...rules(3, "Meridian Surround|Adaptive Dynamics", { from: 2012 })],
  "Aston Martin": [...rules(0, "Q by Aston Martin|Carbon Fibre paket"), ...rules(3, "Bowers & Wilkins|Bang & Olufsen")],
  Bentley: [...rules(0, "Mulliner Driving Specification|Blackline Specification"), ...rules(3, "Naim for Bentley|Bentley Dynamic Ride")],
  "Rolls-Royce": [...rules(2, "Starlight Headliner|Coach Doors"), ...rules(3, "Bespoke Audio")],
  Rover: [...rules(0, "Connoisseur|MG Sport ovjes"), ...rules(2, "Drveni umeci interijera|Koža / Alcantara")],
  MG: [...rules(0, "Trophy paket|Luxury paket"), ...rules(3, "MG Pilot|360° kamera", { from: 2019 })],
  Lotus: [...rules(0, "Touring paket|Track paket"), ...rules(3, "KEF Premium Audio", { models: /Emira|Eletre|Emeya/ })],
  Vauxhall: [...rules(0, "GS Line|VXR paket"), ...rules(1, "IntelliLux LED Pixel", { from: 2016 })],
  Ineos: [...rules(0, "Fieldmaster|Trialmaster|Safari prozori"), ...rules(3, "Blokade prednjeg i stražnjeg diferencijala")],
  McLaren: [...rules(0, "Carbon Fibre Exterior Pack|MSO paket"), ...rules(3, "Bowers & Wilkins|Podizanje nosa vozila")],
  Ford: [...rules(0, "ST-Line|Vignale|Titanium|Active", { from: 2010 }), ...rules(3, "SYNC|B&O Sound System|Ford Co-Pilot360", { from: 2014 }), ...rules(1, "Quickclear grijano vjetrobransko staklo", { from: 2005 })],
  Jeep: [...rules(0, "Overland|Trailhawk|Rubicon|Limited"), ...rules(3, "Selec-Terrain|Rock-Trac|Alpine Premium Audio", { from: 2011 })],
  Tesla: [...rules(3, "Autopilot|Enhanced Autopilot|Full Self-Driving|Premium Audio|Sentry Mode"), ...rules(2, "Stakleni krov"), ...rules(1, "Matrix LED svjetla", { from: 2021 })],
  Chevrolet: [...rules(3, "Chevrolet MyLink|Bose Premium Audio", { from: 2012 }), ...rules(0, "RS paket|Z71 Off-Road", { models: /Camaro|Colorado|Silverado|Tahoe/ })],
  Chrysler: [...rules(0, "Limited|Platinum|SRT Design"), ...rules(3, "Boston Acoustics|Uconnect")],
  Dodge: [...rules(0, "Blacktop paket|SRT paket"), ...rules(3, "Uconnect|Harman Kardon")],
  Cadillac: [...rules(0, "Platinum|V-Series"), ...rules(3, "Bose Centerpoint|Super Cruise|Magnetic Ride Control")],
  Corvette: [...rules(0, "Z51 Performance|Z06 paket"), ...rules(3, "Performance Data Recorder|Magnetic Ride Control")],
  RAM: [...rules(0, "Laramie|Limited|RamBox Cargo Management|Off-Road Group"), ...rules(3, "Uconnect|Active-Level zračni ovjes|Harman Kardon")],
  Hummer: [...rules(0, "Adventure paket|Extreme Off-Road"), ...rules(3, "Blokade diferencijala|CrabWalk", { models: /EV/ })],
  GMC: [...rules(0, "Denali|AT4 Off-Road"), ...rules(3, "Bose Premium|MultiPro vrata")],
  BYD: [...rules(0, "Rotirajući 15.6\" zaslon|Panoramski krov"), ...rules(3, "DiLink|Dynaudio / Dirac Audio|V2L napajanje")],
  Geely: [...rules(3, "Geely Galaxy OS|Adaptivni tempomat s centriranjem trake|360° kamera")],
  Omoda: [...rules(3, "Sony audio|Omoda ADAS|360° kamera")],
  Jaecoo: [...rules(3, "All Road Drive Intelligent System|Sony audio|540° kamera")],
  Forthing: [...rules(2, "Ventilirana prednja sjedala|Kapetanska sjedala", { models: /U-Tour|Yacht/ }), ...rules(3, "ADAS paket|360° kamera")],
  DFSK: [...rules(3, "360° panoramska kamera|Sedam sjedala", { models: /Glory|Fengon/ })],
  Dongfeng: [...rules(3, "Dongfeng ADAS|Kamera s prikazom podvozja")],
  "Lynk & Co": [...rules(3, "Infinity Premium Audio|Lynk & Co Connected Services")],
  Polestar: [...rules(0, "Performance paket|Pilot paket|Plus paket"), ...rules(3, "Harman Kardon|Bowers & Wilkins|Google Automotive")],
  Nio: [...rules(0, "Nio Aquila senzori|Zračni ovjes"), ...rules(3, "NOMI AI asistent|Dolby Atmos 7.1.4")],
  Xpeng: [...rules(0, "Vrata bez okvira"), ...rules(3, "XPILOT ADAS|Xopera audio")],
  Leapmotor: [...rules(3, "Leapmotor Pilot|V2L napajanje", { models: /C10|B10/ })],
  Chery: [...rules(0, "Luxury paket"), ...rules(3, "Sony Audio|Chery ADAS|540° kamera")],
  Voyah: [...rules(0, "Trostruki panoramski zaslon|Zračni ovjes"), ...rules(3, "Dynaudio|Noćna kamera")],
  Seres: [...rules(3, "V2L napajanje|360° kamera", { fuel: /Struja|Električni/ })],
  Zeekr: [...rules(3, "Yamaha Premium Audio|Zeekr AD|Zračni ovjes")],
  Maxus: [...rules(3, "360° panoramski prikaz", { models: /MIFA|T90|eTerron/ })],
  Lada: [...rules(0, "Zaštita kartera|Terenske gume"), ...rules(3, "Reduktor i blokada središnjeg diferencijala", { models: /Niva/ })],
  "Zastava / Yugo": [...rules(0, "Sportski volan|Aluminijski naplatci"), ...rules(2, "Grijano stražnje staklo|Radio / Kasetofon")],
  Tata: [...rules(0, "Krovni nosači"), ...rules(3, "4x4 reduktor", { models: /Safari|Xenon/ })],
  Mahindra: [...rules(3, "4XPLOR terenski pogon", { models: /Scorpio|Thar|Goa/ })],
  Rimac: [...rules(3, "Rimac All-Wheel Torque Vectoring|Rimac Driver Coach|Karbonska monokok šasija")],
};

export const equipmentId = (label: string) => "eq:" + label.toLocaleLowerCase("hr-HR").normalize("NFKC");
const standardModern = new Set(["ABS", "Zračni jastuci", "ESP / Kontrola stabilnosti", "ISOFIX", "Senzor tlaka u gumama", "eCall"]);
const standardClassic = new Set(["Servo upravljač", "Daljinsko centralno zaključavanje", "Električni podizači stakala"]);

export function equipmentFor(vehicle: Selection, filter = false) {
  const { make, model, generation, fuel, variant, date } = vehicle;
  const catalog = (Object.hasOwn(CAR_CATALOG, make)
    ? CAR_CATALOG[make as keyof typeof CAR_CATALOG]
    : undefined) as Record<string, { generations: readonly { codes: readonly string[]; description: string }[] }> | undefined;
  const modelGeneration = catalog?.[model]?.generations.find(item => item.codes.includes(generation ?? ""));
  const year = Number(date?.slice(0, 4)) || (filter ? 0 : Number(modelGeneration?.description.match(/\b(?:19|20)\d{2}\b/)?.[0])) || 0;
  const bodyKind = inferBodyKind(vehicle);
  const options = new Map<string, { id: string; label: string; category: Category; recommended: boolean }>();

  for (const option of [...(Object.hasOwn(brandEquipment, make) ? brandEquipment[make] : []), ...shared]) {
    if (model && option.models && !option.models.test(model)) continue;
    if (generation && option.generations && !option.generations.test(generation)) continue;
    if (year && ((option.from && year < option.from) || (option.until && year > option.until))) continue;
    if (option.fuel && (fuel ? !option.fuel.test(fuel) : !filter)) continue;
    if (option.body && !filter && !option.body.test(bodyKind)) continue;
    if (!filter && option.generations && !generation) continue;
    const id = equipmentId(option.label);
    if (!options.has(id)) {
      const explicitYear = Number(date?.slice(0, 4)) || year;
      const isRecModern = explicitYear >= 2016 && standardModern.has(option.label);
      const isRecClassic = explicitYear > 0 && explicitYear <= 2008 && standardClassic.has(option.label);
      options.set(id, {
        id,
        label: option.label,
        category: option.category,
        recommended: Boolean(option.trim?.test(variant ?? "")) || isRecModern || isRecClassic,
      });
    }
  }
  return [...options.values()];
}
