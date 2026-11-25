export type GenerationFamily = Readonly<{ codes: readonly string[]; description: string }>;
export type CarModel = Readonly<{ generations: readonly GenerationFamily[]; variants: readonly string[] }>;

// Each pipe-delimited entry is a generation family. Slashes separate selectable chassis
// in the same family. Descriptions provide model names or production years where useful.
function model(generations: string, variants = ""): CarModel {
  return {
    generations: generations.split("|").map(entry => {
      const [codes, description = ""] = entry.split(":");
      return { codes: codes.split("/"), description };
    }),
    variants: variants.split("|").filter(Boolean),
  };
}

export const CAR_CATALOG = {
  BMW: {
    "Serija 1": model("E81/E82/E87/E88:2004–2013|F20/F21:2011–2019|F40:2019–2024|F70:2024+", "116d|118d|118d M Sport|118i|120d|120d xDrive|M135i xDrive"),
    "Serija 2": model("F22/F23:Coupé / Cabrio|F45/F46:Active / Gran Tourer|F44:Gran Coupé|G42:Coupé, 2021+|U06:Active Tourer, 2021+|F74:Gran Coupé, 2025+", "218d|218i|220d|220i|M240i xDrive"),
    "Serija 3": model("E46:1998–2006|E90/E91/E92/E93:2005–2013|F30/F31/F34:2011–2020, uključuje GT|G20/G21:2018+, uključuje Touring", "318d|320d|320d xDrive|320i|330d|330i|330e|M340i xDrive"),
    "Serija 4": model("F32/F33/F36:2013–2020, uključuje Gran Coupé|G22/G23/G26:2020+", "420d|420i|430d|430i|M440i xDrive"),
    "Serija 5": model("E60/E61:2003–2010|F10/F11/F07:2009–2017, uključuje GT|G30/G31:2016–2024|G60/G61:2023+", "518d|520d|520d xDrive|520i|530d|530i|530e|540d xDrive"),
    "Serija 7": model("E65/E66:2001–2008|F01/F02:2008–2015|G11/G12:2015–2022|G70:2022+", "730d|740d|740i|750e xDrive|i7 xDrive60"),
    X1: model("E84:2009–2015|F48:2015–2022|U11:2022+", "sDrive18d|sDrive18i|xDrive20d|xDrive25e|iX1 xDrive30"),
    X2: model("F39:2017–2023|U10:2023+", "sDrive18d|sDrive20i|xDrive20d|iX2 xDrive30"),
    X3: model("E83:2003–2010|F25:2010–2017|G01:2017–2024|G45:2024+", "xDrive20d|xDrive30d|xDrive30e|M40i|M50 xDrive"),
    X4: model("F26:2014–2018|G02:2018+", "xDrive20d|xDrive30d|M40i"),
    X5: model("E53:1999–2006|E70:2006–2013|F15:2013–2018|G05:2018+", "xDrive25d|xDrive30d|xDrive40d|xDrive45e|xDrive50e"),
    X6: model("E71:2008–2014|F16:2014–2019|G06:2019+", "xDrive30d|xDrive40d|M50d|M60i xDrive"),
  },
  Audi: {
    A1: model("8X:2010–2018|GB:2018+", "1.0 TFSI|1.6 TDI|25 TFSI|30 TFSI"),
    A3: model("8L:1996–2003|8P:2003–2013|8V:2012–2020|8Y:2020+", "1.6 TDI|2.0 TDI|30 TDI|35 TDI|35 TFSI|40 TFSI e|S line"),
    A4: model("B5:1994–2001|B6:2000–2005|B7:2004–2008|B8:2007–2015|B9:2015–2024", "1.9 TDI|2.0 TDI|30 TDI|35 TDI|35 TDI S line|40 TDI|40 TDI S line|35 TFSI|40 TFSI|S line"),
    A5: model("8T/8F:2007–2016|F5:2016–2024|B10:2024+", "2.0 TDI|35 TDI|40 TDI|40 TFSI|45 TFSI|S line"),
    A6: model("C5:1997–2005|C6:2004–2011|C7:2011–2018|C8:2018–2025|C9:2025+", "2.0 TDI|3.0 TDI|40 TDI|45 TDI|50 TDI|50 TDI quattro|45 TFSI|55 TFSI e|S line"),
    A7: model("4G:2010–2018|4K:2018+", "45 TDI|50 TDI|55 TFSI|S line"),
    Q2: model("GA:2016+", "30 TFSI|35 TFSI|35 TDI|S line"),
    Q3: model("8U:2011–2018|F3:2018–2025|FJ:2025+", "35 TDI|35 TFSI|40 TDI quattro|45 TFSI e|S line"),
    Q5: model("8R:2008–2017|FY:2017–2024|GU:2024+", "2.0 TDI|40 TDI|45 TFSI|50 TFSI e|S line"),
    Q7: model("4L:2005–2015|4M:2015+", "3.0 TDI|45 TDI|50 TDI|55 TFSI e|S line"),
    "Q4 e-tron": model("F4:2021+", "35 e-tron|40 e-tron|45 e-tron|50 quattro"),
  },
  Volkswagen: {
    Golf: model("1K:Golf 5, 2003–2009|5K:Golf 6, 2008–2013|5G:Golf 7, 2012–2017|5G facelift:Golf 7.5, 2017–2020|CD:Golf 8, 2019+|CD facelift:Golf 8.5, 2024+", "1.0 TSI|1.4 TSI|1.5 TSI|1.6 TDI|1.9 TDI|2.0 TDI|GTI|GTD|GTE|R-Line|R"),
    Passat: model("B5:1996–2005|B6:2005–2010|B7:2010–2014|B8:2014–2023|B9:2024+", "1.5 TSI|1.6 TDI|1.9 TDI|2.0 TDI|2.0 TDI R-Line|GTE|eHybrid"),
    Tiguan: model("5N:2007–2016|AD/BW:2016–2023, uključuje Allspace|CT:2024+", "1.4 TSI|1.5 TSI|2.0 TDI|2.0 TDI 4Motion|eHybrid|R-Line"),
    Polo: model("9N:2001–2009|6R/6C:2009–2017|AW:2017+", "1.0 MPI|1.0 TSI|1.2 TSI|1.4 TDI|1.6 TDI|GTI"),
    "T-Roc": model("A1:2017–2025|II:2025+", "1.0 TSI|1.5 TSI|2.0 TDI|R-Line|R"),
    "T-Cross": model("C1:2019+", "1.0 TSI|1.5 TSI|R-Line"),
    Arteon: model("3H:2017–2024", "2.0 TDI|2.0 TSI|eHybrid|R-Line"),
    Touran: model("1T:2003–2015|5T:2015+", "1.2 TSI|1.5 TSI|1.6 TDI|2.0 TDI"),
    Touareg: model("7L:2002–2010|7P:2010–2018|CR:2018+", "3.0 V6 TDI|V6 eHybrid|R eHybrid"),
    "ID.3": model("E1:2019+", "Pure|Pro|Pro S|GTX"),
    "ID.4": model("E2:2020+", "Pure|Pro|GTX"),
    Caddy: model("2K:2003–2020|SB:2020+", "1.6 TDI|2.0 TDI|1.5 TSI"),
  },
  "Mercedes-Benz": {
    "A-klasa": model("W168:1997–2004|W169:2004–2012|W176:2012–2018|W177/V177:2018+, uključuje limuzinu", "180 d|180|200 d|200|250 e|AMG Line"),
    "B-klasa": model("W245:2005–2011|W246:2011–2018|W247:2018+", "180 d|200 d|200|250 e"),
    "C-klasa": model("W203/S203:2000–2007|W204/S204/C204:2007–2015|W205/S205/C205/A205:2014–2023|W206/S206:2021+", "180 d|200 d|220 d|220 d AMG Line|300 d|300 e|AMG Line"),
    "E-klasa": model("W211/S211:2002–2009|W212/S212:2009–2016|W213/S213:2016–2023|W214/S214:2023+", "200 d|220 d|220 d Avantgarde|300 d|300 de|450 4MATIC|AMG Line"),
    "S-klasa": model("W220:1998–2005|W221:2005–2013|W222/V222:2013–2020|W223/V223:2020+", "350 d|400 d|450 d|500|580 e"),
    CLA: model("C117/X117:2013–2019|C118/X118:2019–2025|C174:2025+", "180 d|200 d|220 d|250 e|AMG Line"),
    GLA: model("X156:2013–2020|H247:2020+", "180 d|200 d|220 d|250 e|AMG Line"),
    GLB: model("X247:2019+", "180 d|200 d|220 d|250 4MATIC"),
    GLC: model("X253/C253:2015–2022, uključuje Coupé|X254/C254:2022+, uključuje Coupé", "220 d|300 d|300 e|300 de|AMG Line"),
    GLE: model("W166/C292:2015–2019, uključuje Coupé|V167/C167:2018+, uključuje Coupé", "300 d|350 d|400 d|450 d|350 de|AMG Line"),
    "V-klasa": model("W638:1996–2003|W447:2014+", "220 d|250 d|300 d|Marco Polo"),
  },
  Škoda: {
    Fabia: model("6Y:I, 1999–2007|5J:II, 2007–2014|NJ:III, 2014–2021|PJ:IV, 2021+", "1.0 MPI|1.0 TSI|1.2 TSI|1.4 TDI|Monte Carlo"),
    Octavia: model("1U:I, 1996–2010|1Z:II, 2004–2013|5E:III, 2012–2020|NX:IV, 2019+", "1.0 TSI|1.5 TSI|1.6 TDI|1.9 TDI|2.0 TDI|RS 2.0 TSI|RS 2.0 TDI|Scout|iV"),
    Superb: model("3U:I, 2001–2008|3T:II, 2008–2015|3V:III, 2015–2023|3Y:IV, 2023+", "1.5 TSI|1.6 TDI|2.0 TDI|2.0 TSI|iV|Sportline"),
    Karoq: model("NU:2017+", "1.0 TSI|1.5 TSI|2.0 TDI|Sportline"),
    Kodiaq: model("NS:I, 2016–2024|PS:II, 2024+", "1.5 TSI|2.0 TDI|2.0 TSI|RS|iV"),
    Scala: model("NW1:2019+", "1.0 TSI|1.5 TSI|1.6 TDI|Monte Carlo"),
    Kamiq: model("NW4:2019+", "1.0 TSI|1.5 TSI|Monte Carlo"),
    Enyaq: model("NY:2020+", "50|60|80|85|85x|RS"),
    Rapid: model("NH:2012–2019", "1.0 TSI|1.2 TSI|1.6 TDI"),
  },
  Opel: {
    Astra: model("G|H|J|K|L", "1.4 Turbo|1.6 CDTI|1.5 Diesel|1.2 Turbo|Plug-in Hybrid"),
    Corsa: model("C|D|E|F", "1.2|1.2 Turbo|1.3 CDTI|1.5 Diesel|Electric"),
    Insignia: model("A|B", "1.6 CDTI|2.0 CDTI|2.0 Turbo|GSi"),
    Mokka: model("A:Mokka / Mokka X|B", "1.4 Turbo|1.2 Turbo|1.6 CDTI|Electric"),
    Crossland: model("I:Crossland X / Crossland", "1.2 Turbo|1.5 Diesel"),
    Grandland: model("I:Grandland X / Grandland|II", "1.2 Turbo|1.5 Diesel|Hybrid|Electric"),
    Zafira: model("A|B|C:Tourer|K0:Zafira Life", "1.6 CDTI|2.0 CDTI|2.0 Diesel"),
    Combo: model("C|D|E", "1.3 CDTI|1.5 Diesel|Electric"),
  },
  Renault: {
    Clio: model("II|III|IV:2012–2019|V:2019–2025|VI:2025+", "0.9 TCe|1.0 TCe|1.2 16V|1.5 dCi|E-Tech full hybrid"),
    Mégane: model("II|III:2008–2016|IV:2016–2024", "1.2 TCe|1.3 TCe|1.5 dCi|1.6 dCi|GT|R.S."),
    "Mégane E-Tech": model("I:2022+", "EV40|EV60"),
    Captur: model("I:2013–2019|II:2019+", "0.9 TCe|1.0 TCe|1.3 TCe|1.5 dCi|E-Tech"),
    Scénic: model("II|III|IV|V:E-Tech Electric", "1.3 TCe|1.5 dCi|1.6 dCi|EV87"),
    Kadjar: model("I:2015–2022", "1.3 TCe|1.5 dCi|1.6 dCi"),
    Austral: model("I:2022+", "Mild Hybrid 160|E-Tech full hybrid 200"),
    Talisman: model("I:2015–2022", "1.5 dCi|1.6 dCi|2.0 Blue dCi|TCe 160"),
  },
  Peugeot: {
    "208": model("A9:I, 2012–2019|P21:II, 2019+", "1.2 PureTech|1.5 BlueHDi|Hybrid|e-208"),
    "2008": model("A94:I, 2013–2019|P24:II, 2019+", "1.2 PureTech|1.5 BlueHDi|Hybrid|e-2008"),
    "308": model("T7:I, 2007–2013|T9:II, 2013–2021|P5:III, 2021+", "1.2 PureTech|1.5 BlueHDi|1.6 HDi|2.0 BlueHDi|Hybrid|GT"),
    "3008": model("T84:I, 2009–2016|P84:II, 2016–2024|P64:III, 2024+", "1.2 PureTech|1.5 BlueHDi|2.0 BlueHDi|Hybrid|e-3008"),
    "5008": model("T87:I, 2009–2017|P87:II, 2017–2024|P74:III, 2024+", "1.5 BlueHDi|1.6 HDi|2.0 BlueHDi|Hybrid|e-5008"),
    "508": model("W2:I, 2010–2018|R8:II, 2018–2025", "1.5 BlueHDi|2.0 BlueHDi|PureTech 180|Plug-in Hybrid"),
    Rifter: model("K9:2018+", "1.2 PureTech|1.5 BlueHDi|e-Rifter"),
  },
  "Citroën": {
    C1: model("I:2005–2014|II:2014–2022", "1.0 VTi|1.2 PureTech"),
    C3: model("FC/FN:I, 2002–2009|SC:II, 2009–2016|SX:III, 2016–2024|IV:2024+", "1.2 PureTech|1.5 BlueHDi|Hybrid|ë-C3"),
    "C3 Aircross": model("I:2017–2024|II:2024+", "PureTech 110|BlueHDi 110|Hybrid|ë-C3 Aircross"),
    C4: model("I:2004–2010|II:2010–2018|C41:III, 2020+", "1.2 PureTech|1.5 BlueHDi|1.6 HDi|ë-C4"),
    "C4 Picasso": model("I:2006–2013|II:2013–2018, kasnije SpaceTourer", "1.6 HDi|1.5 BlueHDi|2.0 BlueHDi"),
    C5: model("I:2001–2008|X7:2008–2017", "1.6 HDi|2.0 HDi|2.2 HDi"),
    "C5 Aircross": model("C84:I, 2018–2025|II:2025+", "1.2 PureTech|1.5 BlueHDi|Plug-in Hybrid|Electric"),
    Berlingo: model("M49/M59:I|B9:II|K9:III", "1.6 HDi|1.5 BlueHDi|ë-Berlingo"),
  },
  "DS Automobiles": {
    "DS 3": model("I:2009–2019|D34:Crossback / DS 3, 2018+", "PureTech 130|BlueHDi 130|E-Tense"),
    "DS 4": model("I:2011–2018|II:2021+", "PureTech 130|BlueHDi 130|E-Tense 225"),
    "DS 5": model("I:2011–2018", "BlueHDi 180|Hybrid4"),
    "DS 7": model("X74:Crossback / DS 7, 2017+", "BlueHDi 130|E-Tense 225|E-Tense 4x4 300"),
    "DS 9": model("I:2020+", "PureTech 225|E-Tense 225|E-Tense 360"),
  },
  Dacia: {
    Sandero: model("I:2008–2012|II:2012–2020|III:2020+", "SCe 65|TCe 90|ECO-G 100|Stepway"),
    Duster: model("HS:I, 2010–2017|HM:II, 2017–2024|P1310:III, 2024+", "1.5 dCi|TCe 130|ECO-G 100|Hybrid 140"),
    Logan: model("I:2004–2012|II:2012–2020|III:2020+", "1.0 SCe|0.9 TCe|1.5 dCi|ECO-G 100"),
    Jogger: model("I:2021+", "TCe 110|ECO-G 100|Hybrid 140"),
    Spring: model("I:2021+|I facelift:2024+", "Electric 45|Electric 65"),
    Bigster: model("I:2025+", "Mild Hybrid 140|Hybrid 155|Mild Hybrid-G 140"),
  },
  Ford: {
    Fiesta: model("Mk6:2002–2008|Mk7:2008–2017|Mk8:2017–2023", "1.0 EcoBoost|1.25|1.4 TDCi|1.5 TDCi|ST"),
    Focus: model("Mk1|Mk2|Mk3:C346, 2010–2018|Mk4:C519, 2018–2025", "1.0 EcoBoost|1.5 EcoBoost|1.5 EcoBlue|1.6 TDCi|2.0 TDCi|ST"),
    Mondeo: model("Mk3|Mk4|Mk5:2014–2022", "1.5 EcoBoost|2.0 TDCi|2.0 EcoBlue|Hybrid"),
    Puma: model("I:1997–2002, Coupé|II:2019+, crossover", "1.0 EcoBoost mHEV|ST|Gen-E"),
    Kuga: model("I:2008–2012|II:2012–2019|III:2019+", "1.5 EcoBoost|2.0 TDCi|2.5 FHEV|2.5 PHEV"),
    EcoSport: model("II:2012–2022", "1.0 EcoBoost|1.5 TDCi"),
    "S-Max": model("I:2006–2014|II:2015–2023", "2.0 TDCi|2.0 EcoBlue|2.5 Hybrid"),
    "Tourneo Connect": model("I|II|III:2022+", "1.5 TDCi|1.5 EcoBoost|2.0 EcoBlue"),
  },
  Toyota: {
    Yaris: model("XP10|XP90|XP130:2010–2020|XP210:2020+", "1.0 VVT-i|1.33 Dual VVT-i|1.5 Hybrid|GR"),
    "Yaris Cross": model("XP210:2021+", "Hybrid 116|Hybrid 130|AWD-i"),
    Corolla: model("E12/E13|E14/E15|E17/E18|E210:2018+", "1.2 Turbo|1.6 Valvematic|1.8 Hybrid|2.0 Hybrid"),
    Auris: model("E15:2006–2012|E18:2012–2018", "1.33 Dual VVT-i|1.6 Valvematic|1.4 D-4D|1.8 Hybrid"),
    "C-HR": model("AX10:I, 2016–2023|AX20:II, 2023+", "1.2 Turbo|1.8 Hybrid|2.0 Hybrid|2.0 Plug-in Hybrid"),
    RAV4: model("XA30|XA40:2012–2019|XA50:2018–2025|XA60:2025+", "2.0 D-4D|2.0 Valvematic|2.5 Hybrid|Plug-in Hybrid|AWD-i"),
    Aygo: model("AB10:I|AB40:II", "1.0 VVT-i"),
    "Aygo X": model("AB70:2022+", "1.0 VVT-i|1.5 Hybrid"),
  },
  Hyundai: {
    i10: model("PA|IA/BA|AC3", "1.0 MPI|1.2 MPI|N Line"),
    i20: model("PB|GB/IB|BC3", "1.2 MPI|1.0 T-GDi|1.4 CRDi|N Line"),
    i30: model("FD|GD|PD", "1.0 T-GDi|1.4 T-GDi|1.5 T-GDi|1.6 CRDi|N"),
    Tucson: model("JM|LM:ix35 u Europi|TL:2015–2020|NX4:2020+", "1.6 GDi|1.6 T-GDi|1.6 CRDi|2.0 CRDi|Hybrid|Plug-in Hybrid"),
    Kona: model("OS:2017–2023|SX2:2023+", "1.0 T-GDi|1.6 T-GDi|Hybrid|Electric"),
    "Santa Fe": model("CM|DM|TM|MX5", "2.2 CRDi|Hybrid|Plug-in Hybrid"),
    "IONIQ 5": model("NE:2021+", "58 kWh|72,6 kWh|77,4 kWh|84 kWh|N"),
    Bayon: model("BC3:2021+", "1.2 MPI|1.0 T-GDi"),
  },
  Kia: {
    Picanto: model("SA|TA|JA", "1.0 MPI|1.2 MPI|GT-Line"),
    Rio: model("JB|UB|YB", "1.2 MPI|1.0 T-GDi|1.4 CRDi"),
    Ceed: model("ED:cee'd|JD:cee'd|CD:Ceed", "1.0 T-GDi|1.4 T-GDi|1.5 T-GDi|1.6 CRDi|Plug-in Hybrid"),
    Sportage: model("KM|SL|QL:2015–2021|NQ5:2021+", "1.6 GDi|1.6 T-GDi|1.6 CRDi|2.0 CRDi|Hybrid|Plug-in Hybrid"),
    Stonic: model("YB CUV:2017+", "1.2 MPI|1.0 T-GDi|1.6 CRDi"),
    Niro: model("DE:2016–2022|SG2:2022+", "Hybrid|Plug-in Hybrid|EV"),
    Sorento: model("BL|XM|UM|MQ4", "2.2 CRDi|Hybrid|Plug-in Hybrid"),
    EV6: model("CV:2021+", "Standard Range|Long Range|GT"),
  },
  Mazda: {
    "Mazda2": model("DY|DE|DJ/DL", "1.3 MZR|1.5 Skyactiv-G|Hybrid"),
    "Mazda3": model("BK|BL|BM/BN|BP", "1.6 MZR|2.0 Skyactiv-G|e-Skyactiv X|2.2 Skyactiv-D"),
    "Mazda6": model("GG/GY|GH|GJ/GL", "2.0 Skyactiv-G|2.5 Skyactiv-G|2.2 Skyactiv-D"),
    "CX-3": model("DK:2015–2021", "2.0 Skyactiv-G|1.5 Skyactiv-D"),
    "CX-30": model("DM:2019+", "e-Skyactiv G|e-Skyactiv X|1.8 Skyactiv-D"),
    "CX-5": model("KE:2012–2017|KF:2017–2025|III:2025+", "2.0 Skyactiv-G|2.5 Skyactiv-G|2.2 Skyactiv-D"),
    "CX-60": model("KH:2022+", "3.3 e-Skyactiv D|2.5 e-Skyactiv PHEV"),
    "MX-5": model("NA|NB|NC|ND", "1.5 Skyactiv-G|2.0 Skyactiv-G|RF"),
  },
  Volvo: {
    V40: model("I:1995–2004|II:2012–2019", "D2|D3|D4|T2|T3"),
    S60: model("P2:I|P3:II|SPA:III", "D3|D4|B4|T5|T8 Recharge"),
    V60: model("P3:I|SPA:II, 2018+", "D3|D4|B4|T6 Recharge|T8 Recharge"),
    XC40: model("CMA:2017+", "D3|D4|B3|B4|T4 Recharge"),
    XC60: model("P3:I, 2008–2017|SPA:II, 2017+", "D4|D5|B4|B5|T6 Recharge|T8 Recharge"),
    XC90: model("P2:I, 2002–2014|SPA:II, 2015+", "D5|B5|T6|T8 Recharge"),
    EX30: model("SEA2:2023+", "Single Motor|Single Motor Extended Range|Twin Motor Performance"),
    V90: model("SPA:2016+", "D4|D5|B4|B5|T8 Recharge"),
  },
  Nissan: {
    Micra: model("K11|K12|K13|K14|VI:Electric", "1.0 IG-T|1.2|52 kWh"),
    Juke: model("F15:2010–2019|F16:2019+", "1.0 DIG-T|1.5 dCi|1.6 Hybrid"),
    Qashqai: model("J10:2006–2013|J11:2013–2021|J12:2021+", "1.2 DIG-T|1.3 DIG-T|1.5 dCi|1.6 dCi|e-POWER"),
    "X-Trail": model("T30|T31|T32|T33", "1.6 dCi|2.0 dCi|e-POWER|e-4ORCE"),
    Leaf: model("ZE0:2010–2017|ZE1:2017–2025|III:2025+", "24 kWh|30 kWh|40 kWh|62 kWh"),
    Ariya: model("FE0:2022+", "63 kWh|87 kWh|e-4ORCE"),
  },
  Suzuki: {
    Swift: model("MZ/EZ|FZ/NZ|AZ|AOL", "1.2 Dualjet|1.2 Hybrid|1.4 Boosterjet Sport"),
    Vitara: model("LY:2015+", "1.6 VVT|1.6 DDiS|1.4 Boosterjet|1.5 Hybrid|AllGrip"),
    "S-Cross": model("JY:2013–2021|II:2021+", "1.6 DDiS|1.4 Boosterjet Hybrid|AllGrip"),
    Ignis: model("FH|MF", "1.2 Dualjet|1.2 Hybrid|AllGrip"),
    Jimny: model("JB23/JB33/JB43:III|JB64/JB74:IV", "1.3 VVT|1.5 VVT"),
    Swace: model("E210:2020+", "1.8 Hybrid"),
  },
  Seat: {
    Ibiza: model("6L|6J/6P|KJ", "1.0 MPI|1.0 TSI|1.2 TSI|1.6 TDI|FR"),
    Leon: model("1M|1P|5F:2012–2020|KL:2020+", "1.0 TSI|1.5 TSI|1.6 TDI|2.0 TDI|FR"),
    Arona: model("KJ7:2017+", "1.0 TSI|1.5 TSI|FR"),
    Ateca: model("KH7:2016+", "1.0 TSI|1.5 TSI|2.0 TDI|FR"),
    Tarraco: model("KN2:2018–2024", "1.5 TSI|2.0 TDI|e-Hybrid"),
    Alhambra: model("7M|7N", "1.4 TSI|2.0 TDI"),
  },
  Cupra: {
    Formentor: model("KM:2020+|KM facelift:2024+", "1.5 TSI|2.0 TSI VZ|2.5 TSI VZ5|e-Hybrid"),
    Leon: model("KL:2020+|KL facelift:2024+", "1.5 TSI|2.0 TSI VZ|e-Hybrid"),
    Ateca: model("KH7:2018+", "1.5 TSI|2.0 TSI VZ"),
    Born: model("K11:2021+", "58 kWh|77 kWh|VZ"),
    Tavascan: model("KR:2024+", "Endurance|VZ"),
    Terramar: model("KP:2024+", "1.5 eTSI|2.0 TSI|e-Hybrid VZ"),
  },
  Fiat: {
    Panda: model("141|169|319", "1.2 FIRE|0.9 TwinAir|1.0 Hybrid|4x4"),
    "Grande Panda": model("I:2025+", "Hybrid|Electric"),
    "500": model("312:2007–2024|332:2020+, Nova 500", "1.2 FIRE|0.9 TwinAir|1.0 Hybrid|Electric"),
    "500X": model("334:2014–2024", "1.0 FireFly|1.3 FireFly|1.6 MultiJet|Hybrid"),
    "500L": model("330:2012–2022", "1.4 FIRE|1.3 MultiJet|1.6 MultiJet"),
    Punto: model("176|188|199", "1.2 FIRE|1.4 FIRE|1.3 MultiJet"),
    Tipo: model("160:I|356:II", "1.4 FIRE|1.0 T3|1.3 MultiJet|1.6 MultiJet"),
    "600": model("364:2023+", "Hybrid|Electric"),
  },
  "Alfa Romeo": {
    "147": model("937:2000–2010", "1.6 Twin Spark|1.9 JTD|GTA"),
    "159": model("939:2005–2011", "1.9 JTDM|2.0 JTDM|1750 TBi"),
    MiTo: model("955:2008–2018", "1.4 MultiAir|1.3 JTDM"),
    Giulietta: model("940:2010–2020", "1.4 MultiAir|1.6 JTDM|2.0 JTDM|Veloce"),
    Giulia: model("952:2016+", "2.0 Turbo|2.2 Diesel|Veloce|Quadrifoglio"),
    Stelvio: model("949:2016+", "2.0 Turbo Q4|2.2 Diesel|Veloce|Quadrifoglio"),
    Tonale: model("965:2022+", "1.5 Hybrid|1.6 Diesel|Plug-in Hybrid Q4"),
    Junior: model("966:2024+", "Ibrida|Elettrica|Veloce"),
  },
  Porsche: {
    Macan: model("95B:2014–2024|XAB:Electric, 2024+", "2.0 T|S|S Diesel|GTS|Turbo|4 Electric"),
    Cayenne: model("9PA:I|92A:II|E3:III, 2017+", "Diesel|S|E-Hybrid|GTS|Turbo"),
    "911": model("996|997|991|992", "Carrera|Carrera S|Targa 4|GT3|Turbo S"),
    "718 Boxster": model("982:2016+", "2.0|S|GTS 4.0|Spyder"),
    "718 Cayman": model("982:2016+", "2.0|S|GTS 4.0|GT4 RS"),
    Panamera: model("970|971|976", "4|4S|GTS|4 E-Hybrid|Turbo S"),
    Taycan: model("Y1A:Limuzina|Y1B:Cross Turismo|Y1C:Sport Turismo", "4S|GTS|Turbo|Turbo S"),
  },
  Honda: {
    Civic: model("EP/EU:VII|FN/FK (VIII):VIII|FK (IX):IX|FC/FK (X):X|FE/FL:XI", "1.4 i-VTEC|1.8 i-VTEC|1.5 VTEC Turbo|2.0 e:HEV|Type R"),
    Jazz: model("GD|GE/GG|GK|GR", "1.2 i-VTEC|1.3 i-VTEC|e:HEV"),
    "HR-V": model("GH|RU|RV", "1.5 i-VTEC|1.6 i-DTEC|e:HEV"),
    "CR-V": model("RD|RE|RM|RW/RT|RS", "2.0 i-VTEC|1.6 i-DTEC|e:HEV|e:PHEV"),
    "ZR-V": model("RZ:2023+", "2.0 e:HEV"),
    Accord: model("CL/CM:VII|CU/CW:VIII", "2.0 i-VTEC|2.2 i-CTDi|2.2 i-DTEC"),
  },
  Mitsubishi: {
    Colt: model("Z30:2004–2012|VII:2023+", "1.1 MPI|1.3 MPI|1.0 Turbo|Hybrid"),
    ASX: model("GA0:I, 2010–2022|II:2023+", "1.6 MIVEC|1.8 DI-D|1.3 Turbo|Hybrid"),
    Outlander: model("CU|CW|GF/GG|GN", "2.0 MIVEC|2.2 DI-D|PHEV"),
    "Eclipse Cross": model("GK:2017+", "1.5 Turbo|PHEV"),
    "Space Star": model("DG:1998–2005|A00:2012–2024", "1.0 MIVEC|1.2 MIVEC"),
    "L200": model("KA/KB|KJ/KK/KL|LC", "2.4 DI-D|2.5 DI-D"),
  },
  Subaru: {
    Impreza: model("GD/GG|GE/GH|GP/GJ|GK/GT|GU", "1.6 Boxer|2.0 Boxer|e-Boxer"),
    Forester: model("SG|SH|SJ|SK|SL", "2.0 Boxer|2.0D|e-Boxer"),
    Outback: model("BP|BR|BS|BT", "2.0D|2.5 Boxer|3.6R"),
    XV: model("GP|GT", "1.6 Boxer|2.0 Boxer|e-Boxer"),
    Crosstrek: model("GU:2023+", "2.0 e-Boxer"),
    Solterra: model("XEAM10/YEAM15:2022+", "FWD|AWD"),
  },
  Lexus: {
    CT: model("ZWA10:2011–2022", "200h"),
    IS: model("XE10|XE20|XE30", "200|220d|250|300h"),
    ES: model("XZ10:2018+", "300h"),
    UX: model("ZA10:2018+", "250h|300h|300e"),
    NX: model("AZ10|AZ20", "300h|350h|450h+"),
    RX: model("XU30|AL10|AL20|ALA10", "400h|450h|350h|450h+|500h"),
    LBX: model("AY10:2023+", "1.5 Hybrid|AWD"),
  },
  Mini: {
    "Hatch": model("R50/R53|R56|F55/F56|F65/F66|J01:Electric", "One|Cooper|Cooper D|Cooper S|John Cooper Works"),
    Cabrio: model("R52|R57|F57|F67", "Cooper|Cooper S|John Cooper Works"),
    Clubman: model("R55|F54", "Cooper|Cooper D|Cooper S|All4"),
    Countryman: model("R60|F60|U25", "Cooper D|Cooper S|Cooper SE|Countryman E|All4"),
    Aceman: model("J05:2024+", "E|SE|John Cooper Works"),
  },
  Smart: {
    Fortwo: model("450|451|453", "0.7 Turbo|1.0|Electric Drive|EQ"),
    Forfour: model("454|453", "1.0|1.1|1.3|EQ"),
    Roadster: model("452:2003–2006", "0.7 Turbo|Brabus"),
    "#1": model("I:2022+", "Pro|Premium|Brabus"),
    "#3": model("I:2023+", "Pro|Premium|Brabus"),
    "#5": model("I:2024+", "Pro|Premium|Brabus"),
  },
  Jeep: {
    Renegade: model("BU:2014+", "1.0 Turbo|1.6 MultiJet|2.0 MultiJet|4xe"),
    Compass: model("MK49:I|MP:II|III:2025+", "1.3 Turbo|1.6 MultiJet|2.0 MultiJet|4xe"),
    Avenger: model("JJ:2022+", "1.2 Turbo|e-Hybrid|Electric|4xe"),
    Cherokee: model("XJ|KJ|KK|KL", "2.0 MultiJet|2.8 CRD|3.2 V6"),
    "Grand Cherokee": model("WJ|WK|WK2|WL", "3.0 CRD|3.6 V6|4xe"),
    Wrangler: model("TJ|JK|JL", "2.0 Turbo|2.2 MultiJet|2.8 CRD|4xe"),
  },
  "Land Rover": {
    Defender: model("L316:1983–2016, izvorna serija|L663:2020+", "90|110|130|D250|D300|P400"),
    Discovery: model("L318:II|L319:III / IV|L462:V", "TDV6|SDV6|D250|D300"),
    "Discovery Sport": model("L550:2014+", "D150|D180|D200|P300e"),
    "Range Rover": model("L322|L405|L460", "TDV6|SDV8|D350|P460e|P530"),
    "Range Rover Sport": model("L320|L494|L461", "SDV6|D300|D350|P460e"),
    "Range Rover Evoque": model("L538|L551", "TD4|D150|D200|P300e"),
    "Range Rover Velar": model("L560:2017+", "D180|D200|D300|P400e"),
  },
  Jaguar: {
    XE: model("X760:2015–2024", "D180|D200|P250"),
    XF: model("X250|X260", "2.0d|3.0d|P250"),
    "E-Pace": model("X540:2017–2024", "D150|D180|P250|P300e"),
    "F-Pace": model("X761:2016+", "D180|D200|D300|P400e|SVR"),
    "I-Pace": model("X590:2018–2024", "EV320|EV400"),
    "F-Type": model("X152:2013–2024", "P300|P450|R"),
  },
  Tesla: {
    "Model 3": model("I:2017–2023|Highland:2023+", "RWD|Long Range|Performance"),
    "Model Y": model("I:2020–2025|Juniper:2025+", "RWD|Long Range|Performance"),
    "Model S": model("I:2012–2021|I facelift:2021+", "75D|100D|Long Range|Plaid"),
    "Model X": model("I:2015–2021|I facelift:2021+", "75D|100D|Long Range|Plaid"),
    Roadster: model("I:2008–2012", "2.0|2.5|Sport"),
  },
  MG: {
    MG3: model("II|III:2024+", "1.5|Hybrid+"),
    MG4: model("EH32:2022+", "Standard|Comfort|Luxury|XPower"),
    MG5: model("EP22:Electric", "Standard Range|Long Range"),
    ZS: model("ZS11:I|II:2024+, Hybrid+", "1.0 T-GDi|1.5 VTi|EV|Hybrid+"),
    HS: model("AS23:I|II:2024+", "1.5 T-GDi|Plug-in Hybrid|Hybrid+"),
    "Marvel R": model("I:2021–2024", "Comfort|Luxury|Performance"),
    Cyberster: model("I:2024+", "Trophy|GT"),
  },
  Geely: {
    Coolray: model("SX11:I|SX11 facelift:2022+", "1.5 TD"),
    Cityray: model("G426:2024+", "1.5 TD"),
    Starray: model("FX11:2023+", "1.5 TD|2.0 TD"),
    "Starray EM-i": model("I:2025+", "EM-i"),
    EX5: model("E245:2024+", "Pro|Max"),
  },
  BYD: {
    "Atto 2": model("I:2025+", "Active|Boost|Comfort|DM-i"),
    "Atto 3": model("I:2022+|EVO:2026+", "Comfort|Design|EVO"),
    Dolphin: model("EA1:2021+", "Active|Boost|Comfort|Design"),
    "Dolphin Surf": model("I:2025+", "Active|Boost|Comfort"),
    Seal: model("I:2022+", "Design|Excellence AWD"),
    "Seal U": model("I:2023+", "Comfort|Design|DM-i Boost|DM-i Design"),
    "Sealion 7": model("I:2024+", "Comfort|Design AWD|Excellence AWD"),
    "Seal 6": model("I:2025+", "DM-i|DM-i Touring"),
  },
  Omoda: {
    "5": model("I:2022+", "1.6 TGDI|SHS-H"),
    E5: model("I:2024+", "Comfort|Premium"),
    "9": model("I:2025+", "SHS"),
  },
  Jaecoo: {
    "5": model("I:2025+", "1.6 TGDI"),
    "7": model("I:2023+", "1.6 TGDI|SHS"),
    "8": model("I:2023+", "2.0 TGDI|SHS"),
  },
  Dongfeng: {
    Box: model("I:2024+", "31 kWh|42 kWh"),
    Shine: model("I:2021+", "1.5 Turbo"),
    "Mage": model("I:2023+", "1.5 Turbo|Hybrid"),
  },
  Forthing: {
    "T5 EVO": model("I:2020+", "1.5 Turbo|HEV"),
    Friday: model("I:2023+", "Electric"),
    "U-Tour": model("I:2022+", "1.5 Turbo"),
  },
  Chevrolet: {
    Spark: model("M200|M300|M400", "1.0|1.2"),
    Aveo: model("T200/T250|T300", "1.2|1.4|1.3 Diesel"),
    Cruze: model("J300|D2LC", "1.6|1.8|2.0 VCDi"),
    Orlando: model("J309:2011–2018", "1.8|2.0 VCDi"),
    Captiva: model("C100/C140", "2.0 VCDi|2.2 VCDi"),
  },
  KGM: {
    Tivoli: model("X100:2015+", "1.2 Turbo|1.5 Turbo|1.6 Diesel"),
    Korando: model("C200:2010–2019|C300:2019+", "1.5 Turbo|1.6 Diesel|e-Motion"),
    Torres: model("J100:2022+", "1.5 Turbo|EVX|Hybrid"),
    Rexton: model("Y200/Y250|Y400/Y450", "2.2 Diesel|4WD"),
    Musso: model("Q200/Q250", "2.2 Diesel|Grand"),
  },
  Leapmotor: {
    T03: model("I:2020+", "37,3 kWh"),
    C10: model("I:2024+", "Electric|REEV"),
    B10: model("I:2025+", "Electric"),
  },
  Maxus: {
    "Euniq 5": model("I:2019+", "Electric"),
    "MIFA 9": model("I:2022+", "Electric"),
    "T90 EV": model("I:2022+", "Electric"),
  },
  Ineos: {
    Grenadier: model("I:2022+", "3.0 Benzin|3.0 Dizel"),
    Quartermaster: model("I:2023+", "3.0 Benzin|3.0 Dizel"),
  },
  Abarth: {
    "500": model("312:2008–2016", "1.4 T-Jet|Esseesse"),
    "595": model("312:2012–2024", "Turismo|Competizione|Esseesse"),
    "695": model("312:2009–2024", "1.4 T-Jet|Competizione"),
    "500e": model("332:2023+", "Turismo|Scorpionissima"),
    "124 Spider": model("348:2016–2019", "1.4 MultiAir"),
  },
  Alpine: { A110: model("II:2017+", "Pure|GT|S|R"), A290: model("I:2024+", "GT|GT Performance|GTS") },
  "Aston Martin": {
    Vantage: model("I:2005–2018|II:2018+", "V8|V12|F1 Edition"),
    DB11: model("I:2016–2023", "V8|V12|AMR"),
    DB12: model("I:2023+", "V8"),
    DBX: model("I:2020+", "V8|707"),
  },
  Bentley: {
    "Continental GT": model("3W:I / II|3S:III|IV:2024+", "V8|W12|Speed|Hybrid"),
    "Flying Spur": model("4W:II|ZG:III|IV:2024+", "V8|W12|Hybrid"),
    Bentayga: model("4V:2015+", "V8|W12|Hybrid|EWB"),
  },
  Ferrari: {
    "458": model("F142:2009–2015", "Italia|Spider|Speciale"),
    "488": model("F142M:2015–2020", "GTB|Spider|Pista"),
    "296": model("F171:2021+", "GTB|GTS"),
    Roma: model("F169:2019+", "Coupé|Spider"),
    Purosangue: model("F175:2022+", "V12"),
  },
  Lamborghini: {
    Huracán: model("LB724:2014–2024", "EVO|STO|Tecnica"),
    Urus: model("I:2018+", "S|Performante|SE"),
    Revuelto: model("LB744:2023+", "V12 HPEV"),
  },
  Maserati: {
    Ghibli: model("M157:2013–2023", "Diesel|S Q4|Trofeo"),
    Levante: model("M161:2016–2024", "Diesel|S|Trofeo"),
    Grecale: model("M182:2022+", "GT|Modena|Trofeo|Folgore"),
    GranTurismo: model("M145|M189", "Sport|Modena|Trofeo|Folgore"),
  },
  "Rolls-Royce": {
    Ghost: model("RR4:I|RR21:II", "V12|Extended|Black Badge"),
    Phantom: model("RR01:VII|RR11:VIII", "V12|Extended"),
    Cullinan: model("RR31:2018+", "V12|Black Badge"),
    Spectre: model("RR25:2023+", "Electric|Black Badge"),
  },
  Lotus: {
    Elise: model("S1|S2|S3", "1.6|1.8|Cup"),
    Emira: model("Type 131:2022+", "2.0 Turbo|V6"),
    Eletre: model("Type 132:2023+", "S|R"),
    Emeya: model("Type 133:2024+", "S|R"),
  },
  Dodge: {
    Challenger: model("LC/LA:2008–2023", "3.6 V6|5.7 HEMI|SRT Hellcat"),
    Charger: model("LX|LD|LB", "3.6 V6|5.7 HEMI|Daytona"),
    Durango: model("WD:2011+", "3.6 V6|5.7 HEMI|SRT"),
  },
  Ram: {
    "1500": model("DS:IV|DT:V", "3.0 EcoDiesel|5.7 HEMI|3.0 Hurricane|TRX"),
    "2500": model("DJ:IV|DJ facelift:2019+", "6.4 HEMI|6.7 Cummins"),
  },
  Polestar: {
    "1": model("SPA:2019–2021", "Hybrid AWD"),
    "2": model("CMA:2020+", "Standard Range|Long Range|Dual Motor"),
    "3": model("SPA2:2024+", "Long Range Dual Motor|Performance"),
    "4": model("SEA:2024+", "Long Range Single Motor|Long Range Dual Motor"),
  },
  Daewoo: {
    Matiz: model("M100/M150:1998–2005", "0.8|1.0"),
    Lanos: model("T100/T150:1997–2008", "1.4|1.5|1.6"),
    Nubira: model("J100/J150|J200", "1.6|1.8|2.0"),
  },
  DFSK: {
    "Glory 500": model("I:2020+", "1.5"),
    "Glory 580": model("I:2016+", "1.5 Turbo"),
    "Fengon 5": model("I:2019+", "1.5 Turbo"),
  },
  Seres: {
    "3": model("I:2020+", "52 kWh"),
    "5": model("I:2023+", "RWD|AWD"),
  },
  Lancia: {
    Ypsilon: model("840|843|846|L21:2024+", "1.2 FIRE|0.9 TwinAir|Hybrid|Electric"),
    Delta: model("831|836|844", "1.4 T-Jet|1.6 MultiJet|Integrale"),
    Musa: model("350:2004–2012", "1.4|1.3 MultiJet"),
  },
  "Lynk & Co": {
    "01": model("I:2017+", "Hybrid|Plug-in Hybrid"),
    "02": model("E335:Electric, 2024+", "Core|More"),
    "08": model("I:2023+", "Plug-in Hybrid"),
  },
  Mahindra: {
    "XUV500": model("W201:2011–2021", "2.2 mHawk"),
    "KUV100": model("I:2016+", "1.2 mFalcon"),
    Goa: model("I:2002+", "2.2 mHawk|Pik-Up"),
  },
  Maybach: {
    "57": model("W240:2002–2012", "57|57 S"),
    "62": model("V240:2002–2012", "62|62 S|Landaulet"),
  },
  Rimac: {
    Concept_One: model("I:2016–2017", "Electric"),
    Nevera: model("I:2021+", "Nevera|Nevera R"),
  },
  Vauxhall: {
    Corsa: model("C|D|E|F", "1.2|1.2 Turbo|Electric"),
    Astra: model("G|H|J|K|L", "1.2 Turbo|1.6 CDTI|Plug-in Hybrid"),
    Insignia: model("A|B", "1.6 CDTI|2.0 CDTI|GSi"),
  },
  Zeekr: {
    "001": model("I:2021+", "Long Range RWD|Performance AWD|Privilege AWD"),
    X: model("I:2023+", "Long Range RWD|Privilege AWD"),
    "7X": model("I:2024+", "Core RWD|Long Range RWD|Privilege AWD"),
  },
} satisfies Record<string, Record<string, CarModel>>;

export const CAR_MAKES = Object.keys(CAR_CATALOG).sort((a, b) => a.localeCompare(b, "hr"));
const catalog: Readonly<Record<string, Readonly<Record<string, CarModel>>>> = CAR_CATALOG;

export function modelsFor(make: string) {
  return Object.hasOwn(catalog, make) ? Object.keys(catalog[make]) : [];
}

export function modelFor(make: string, modelName: string) {
  if (!Object.hasOwn(catalog, make) || !Object.hasOwn(catalog[make], modelName)) return undefined;
  return catalog[make][modelName];
}

export function describeFamily(family: GenerationFamily) {
  return family.codes.join("/") + (family.description ? " (" + family.description + ")" : "");
}

export function validGeneration(make: string, modelName: string, selection: string) {
  return modelFor(make, modelName)?.generations.some(family =>
    family.codes.includes(selection) || family.codes.join("/") === selection,
  ) ?? false;
}

export function matchesGeneration(make: string, modelName: string, selection: string, chassis?: string) {
  if (!selection || chassis === selection) return true;
  return modelFor(make, modelName)?.generations.some(family =>
    family.codes.join("/") === selection && chassis !== undefined && family.codes.includes(chassis),
  ) ?? false;
}

export function titleContainsChassis(title: string, code: string) {
  const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?<![\\p{L}\\p{N}])" + escaped + "(?![\\p{L}\\p{N}])", "iu").test(title);
}

export function chassisFromTitle(make: string, modelName: string, title: string) {
  const codes = modelFor(make, modelName)?.generations.flatMap(family => family.codes) ?? [];
  const matches = codes.filter(code => code.length >= 2 && /\d/.test(code) && titleContainsChassis(title, code));
  const longest = matches.filter(code => !matches.some(other => other !== code && other.startsWith(code + " ")));
  return longest.length === 1 ? longest[0] : undefined;
}
