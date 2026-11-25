export type CroatiaLocation = { city: string; postalCode: string; county: string };

// Administrative cities with their central postal office, followed by Zagreb locality aliases.
const groups: Record<string, string> = {
  "Grad Zagreb": "Zagreb:10000",
  "Zagrebačka": "Dugo Selo:10370|Ivanić-Grad:10310|Jastrebarsko:10450|Samobor:10430|Sveta Nedelja:10431|Sveti Ivan Zelina:10380|Velika Gorica:10410|Vrbovec:10340|Zaprešić:10290",
  "Krapinsko-zagorska": "Donja Stubica:49240|Klanjec:49290|Krapina:49000|Oroslavje:49243|Pregrada:49218|Zabok:49210|Zlatar:49250",
  "Sisačko-moslavačka": "Glina:44400|Hrvatska Kostajnica:44430|Kutina:44320|Novska:44330|Petrinja:44250|Popovača:44317|Sisak:44000",
  "Karlovačka": "Duga Resa:47250|Karlovac:47000|Ogulin:47300|Ozalj:47280|Slunj:47240",
  "Varaždinska": "Ivanec:42240|Lepoglava:42250|Ludbreg:42230|Novi Marof:42220|Varaždin:42000|Varaždinske Toplice:42223",
  "Koprivničko-križevačka": "Đurđevac:48350|Koprivnica:48000|Križevci:48260",
  "Bjelovarsko-bilogorska": "Bjelovar:43000|Čazma:43240|Daruvar:43500|Garešnica:43280|Grubišno Polje:43290",
  "Primorsko-goranska": "Bakar:51222|Cres:51557|Crikvenica:51260|Čabar:51306|Delnice:51300|Kastav:51215|Kraljevica:51262|Krk:51500|Mali Lošinj:51550|Novi Vinodolski:51250|Opatija:51410|Rab:51280|Rijeka:51000|Vrbovsko:51326",
  "Ličko-senjska": "Gospić:53000|Novalja:53291|Otočac:53220|Senj:53270",
  "Virovitičko-podravska": "Orahovica:33515|Slatina:33520|Virovitica:33000",
  "Požeško-slavonska": "Kutjevo:34340|Lipik:34551|Pakrac:34550|Pleternica:34310|Požega:34000",
  "Brodsko-posavska": "Nova Gradiška:35400|Slavonski Brod:35000",
  "Zadarska": "Benkovac:23420|Biograd na Moru:23210|Nin:23232|Obrovac:23450|Pag:23250|Zadar:23000",
  "Osječko-baranjska": "Beli Manastir:31300|Belišće:31551|Donji Miholjac:31540|Đakovo:31400|Našice:31500|Osijek:31000|Valpovo:31550",
  "Šibensko-kninska": "Drniš:22320|Knin:22300|Skradin:22222|Šibenik:22000|Vodice:22211",
  "Vukovarsko-srijemska": "Ilok:32236|Otok:32252|Vinkovci:32100|Vukovar:32000|Županja:32270",
  "Splitsko-dalmatinska": "Hvar:21450|Imotski:21260|Kaštela:21212|Komiža:21485|Makarska:21300|Omiš:21310|Sinj:21230|Solin:21210|Split:21000|Stari Grad:21460|Supetar:21400|Trilj:21240|Trogir:21220|Vis:21480|Vrgorac:21276|Vrlika:21236",
  "Istarska": "Buje:52460|Buzet:52420|Labin:52220|Novigrad:52466|Pazin:52000|Poreč:52440|Pula:52100|Rovinj:52210|Umag:52470|Vodnjan:52215",
  "Dubrovačko-neretvanska": "Dubrovnik:20000|Korčula:20260|Metković:20350|Opuzen:20355|Ploče:20340",
  "Međimurska": "Čakovec:40000|Mursko Središće:40315|Prelog:40323",
};
const locations = (county: string, entries: string): CroatiaLocation[] => entries.split("|").map(entry => {
  const [city, postalCode] = entry.split(":");
  return { city, postalCode, county };
});
export const croatianCities = Object.entries(groups).flatMap(([county, entries]) => locations(county, entries));
export const croatianLocations = [...croatianCities, ...locations("Grad Zagreb", "Sesvete:10360|Zagreb – Donji grad:10000|Zagreb – Novi Zagreb:10020|Zagreb – Dubrava:10040|Zagreb – Podsused:10090|Zagreb – Stenjevec:10147|Zagreb – Brezovica:10257")];
export const croatianCounties = Object.keys(groups).sort((a,b) => a.localeCompare(b,"hr"));
export const normalizeLocation = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{M}/gu,"").replace(/đ/g,"d").replace(/[–—-]/g," ").trim().replace(/\s+/g," ");
