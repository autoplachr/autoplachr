export const CATALOG_MIN_YEAR = 1955;
export const CATALOG_MAX_YEAR = 2026;

export type YearRange = Readonly<{ yearFrom: number; yearTo: number }>;
export type GenerationFamily = Readonly<{
  codes: readonly string[];
  description: string;
  yearFrom: number;
  yearTo: number;
}>;
export type VariantOption = Readonly<{
  name: string;
  yearFrom: number;
  yearTo: number;
}>;
export type CarModel = Readonly<{
  generations: readonly GenerationFamily[];
  variants: readonly string[];
  variantDetails?: readonly VariantOption[];
}>;

export const OTHER_MODEL = "Ostali modeli (ručni unos)";
export const OTHER_GENERATION = "Ostale generacije";

function parseYearRangeText(text: string): YearRange | undefined {
  const span = text.match(/((?:19|20)\d{2})\s*[–-]\s*((?:19|20)\d{2})/);
  if (span) {
    const yearFrom = Number(span[1]);
    const yearTo = Math.min(CATALOG_MAX_YEAR, Math.max(yearFrom, Number(span[2])));
    return { yearFrom, yearTo };
  }
  const open = text.match(/((?:19|20)\d{2})\s*\+/);
  if (open) {
    const yearFrom = Number(open[1]);
    return { yearFrom, yearTo: CATALOG_MAX_YEAR };
  }
  const single = text.match(/\b((?:19|20)\d{2})\b/);
  if (single) {
    const y = Number(single[1]);
    return { yearFrom: y, yearTo: y };
  }
  return undefined;
}

function inferVariantYearRange(name: string, modelSpan: YearRange): YearRange {
  let yearFrom = modelSpan.yearFrom;
  let yearTo = modelSpan.yearTo;
  const n = name.toLowerCase();

  // Era-aware engine & trim heuristics clamped to the model's lifespan
  if (/\b1\.9\s*sdi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 1995);
    yearTo = Math.min(yearTo, 2006);
  } else if (/\b1\.9\s*(tdi|dti|d|td)\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 1991);
    yearTo = Math.min(yearTo, 2010);
  } else if (/\b1\.6\s*tdi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2009);
    yearTo = Math.min(yearTo, 2021);
  } else if (/\b2\.0\s*sdi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2004);
    yearTo = Math.min(yearTo, 2010);
  } else if (/\b2\.0\s*tdi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2003);
  } else if (/\b1\.2\s*tsi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2009);
    yearTo = Math.min(yearTo, 2018);
  } else if (/\b1\.4\s*tsi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2006);
    yearTo = Math.min(yearTo, 2021);
  } else if (/\b1\.0\s*tsi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2015);
  } else if (/\b1\.5\s*e?tsi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2017);
  } else if (/\b1\.8\s*t\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 1995);
    yearTo = Math.min(yearTo, 2010);
  } else if (/\b1\.8\s*tfsi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2007);
    yearTo = Math.min(yearTo, 2018);
  } else if (/\b(25|30|35|40|45|50|55|60)\s*(tfsi|tdi)\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2018);
  } else if (/\b(cdi)\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 1998);
    yearTo = Math.min(yearTo, 2016);
  } else if (/\b(bluehdi|puretech)\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2014);
  } else if (/\bhdi\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 1998);
    yearTo = Math.min(yearTo, 2018);
  } else if (/\bjtdm\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2005);
    yearTo = Math.min(yearTo, 2020);
  } else if (/\bjtd\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 1997);
    yearTo = Math.min(yearTo, 2010);
  } else if (/\bmultijet\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2003);
  } else if (/\bdci\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2000);
  } else if (/\btce\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2007);
  } else if (/\becoboost\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2010);
  } else if (/\becoblue\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2016);
  } else if (/\btdci\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2001);
    yearTo = Math.min(yearTo, 2021);
  } else if (/\bcdti\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2003);
    yearTo = Math.min(yearTo, 2021);
  } else if (/\b(phev|plug-in|gte|e-hybrid|ehybrid|tfsi e|330e|530e|750e|225e|250e|300e|300de|580e|4xe)\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2014);
  } else if (/\b(electric|elektri|kwh|e-\d+|ë-|eq[a-z]?)\b/.test(n)) {
    yearFrom = Math.max(yearFrom, 2011);
  }

  if (yearFrom > yearTo) return modelSpan;
  return { yearFrom, yearTo };
}

// Each pipe-delimited entry is a generation family. Slashes separate selectable chassis
// in the same family. Descriptions provide model names and production years.
function model(generations: string, variants = ""): CarModel {
  const parsedGens: GenerationFamily[] = generations.split("|").map(entry => {
    const [codes, description = ""] = entry.split(":");
    const range = parseYearRangeText(description) ?? parseYearRangeText(codes) ?? { yearFrom: 1990, yearTo: CATALOG_MAX_YEAR };
    return { codes: codes.split("/"), description, yearFrom: range.yearFrom, yearTo: range.yearTo };
  });
  const modelSpan: YearRange = {
    yearFrom: Math.min(...parsedGens.map(g => g.yearFrom)),
    yearTo: Math.max(...parsedGens.map(g => g.yearTo)),
  };
  const variantDetails: VariantOption[] = variants
    .split("|")
    .filter(Boolean)
    .map(raw => {
      const m = raw.match(/^(.*?)\[([^\]]+)\]$/);
      if (m) {
        const name = m[1].trim();
        const explicit = parseYearRangeText(m[2]);
        return { name, ...(explicit ?? inferVariantYearRange(name, modelSpan)) };
      }
      return { name: raw, ...inferVariantYearRange(raw, modelSpan) };
    });
  return {
    generations: parsedGens,
    variants: variantDetails.map(v => v.name),
    variantDetails,
  };
}

export const CAR_CATALOG = {
  // === GERMAN & VAG ===
  Volkswagen: {
    Golf: model("19E:Golf 2, 1983–1992|1H:Golf 3, 1991–1998|1J:Golf 4, 1997–2004|1K:Golf 5, 2003–2009|5K:Golf 6, 2008–2013|5G:Golf 7, 2012–2017|5G facelift:Golf 7.5, 2017–2020|CD:Golf 8, 2019–2024|CD facelift:Golf 8.5, 2024+", "1.4 16V[1997–2009]|1.6[1991–2010]|1.0 TSI[2015+]|1.2 TSI[2009–2017]|1.4 TSI[2006–2017]|1.5 TSI[2017+]|1.6 TDI[2009–2020]|1.9 SDI[1995–2006]|1.9 TDI[1993–2009]|2.0 TDI[2003+]|GTI[1983+]|GTD[1983–2024]|GTE[2014+]|R-Line[2012+]|R[2009+]"),
    Passat: model("35i:B3/B4, 1988–1997|B5:1996–2000|B5.5:2000–2005|B6:2005–2010|B7:2010–2014|B8:2014–2023|B9:2024+", "1.4 TSI[2007–2018]|1.5 TSI[2018+]|1.8 T[1996–2005]|1.6 TDI[2009–2020]|1.9 TDI[1993–2009]|2.0 TDI[2005+]|2.0 TDI R-Line[2014+]|2.0 BiTDI[2014–2020]|GTE[2015–2023]|eHybrid[2024+]|Alltrack[2012–2023]"),
    Polo: model("86C:II, 1981–1994|6N/6N2:III, 1994–2001|9N/9N3:IV, 2001–2009|6R/6C:V, 2009–2017|AW:VI, 2017+", "1.0 MPI|1.0 TSI|1.2|1.2 TSI|1.4|1.4 TDI|1.6 TDI|1.9 TDI|GTI"),
    Tiguan: model("5N:I, 2007–2016|AD/BW:II, 2016–2023, uključuje Allspace|CT:III, 2024+", "1.4 TSI|1.5 TSI|2.0 TSI|2.0 TDI|2.0 TDI 4Motion|eHybrid|R-Line|R"),
    "T-Roc": model("A1:I, 2017–2025|II:2025+", "1.0 TSI|1.5 TSI|2.0 TSI|1.6 TDI|2.0 TDI|R-Line|R"),
    "T-Cross": model("C1:2019+", "1.0 TSI|1.5 TSI|1.6 TDI|R-Line"),
    Taigo: model("CS:2021+", "1.0 TSI|1.5 TSI|R-Line"),
    Tayron: model("I:2024+", "1.5 eTSI|2.0 TDI|2.0 TSI|eHybrid"),
    Arteon: model("3H:2017–2024", "1.5 TSI|2.0 TDI|2.0 TSI|eHybrid|R-Line|R"),
    Touareg: model("7L:I, 2002–2010|7P:II, 2010–2018|CR:III, 2018+", "2.5 R5 TDI|3.0 V6 TDI|4.2 V8 TDI|V6 eHybrid|R eHybrid"),
    Touran: model("1T:I, 2003–2015|5T:II, 2015+", "1.2 TSI|1.4 TSI|1.5 TSI|1.6 TDI|1.9 TDI|2.0 TDI"),
    "Golf Plus / Sportsvan": model("5M:Golf Plus, 2004–2014|AM:Sportsvan, 2014–2020", "1.2 TSI|1.4 TSI|1.5 TSI|1.6 TDI|1.9 TDI|2.0 TDI"),
    Sharan: model("7M:I, 1995–2010|7N:II, 2010–2022", "1.4 TSI|1.8 T|1.9 TDI|2.0 TDI"),
    Bora: model("1J:1998–2005", "1.4 16V|1.6|1.8 T|1.9 SDI|1.9 TDI|2.3 V5"),
    Jetta: model("A2:II, 1984–1992|A5:V, 2005–2010|A6:VI, 2010–2018", "1.2 TSI|1.4 TSI|1.6 TDI|1.9 TDI|2.0 TDI"),
    Vento: model("1H:1992–1998", "1.4|1.6|1.8|1.9 TD|1.9 TDI|VR6"),
    Scirocco: model("53B:II, 1981–1992|137:III, 2008–2017", "1.4 TSI|2.0 TSI|2.0 TDI|R"),
    Eos: model("1F:2006–2015", "1.4 TSI|2.0 FSI|2.0 TSI|2.0 TDI"),
    Beetle: model("9C:New Beetle, 1998–2011|5C:Beetle, 2011–2019", "1.2 TSI|1.4 TSI|1.6|1.9 TDI|2.0 TDI"),
    Corrado: model("53i:1988–1995", "1.8 16V|2.0 16V|G60|VR6"),
    Lupo: model("6X:1998–2005", "1.0|1.2 TDI 3L|1.4|1.4 TDI|1.7 SDI|GTI"),
    Fox: model("5Z:2005–2011", "1.2|1.4|1.4 TDI"),
    "Up!": model("121:2011–2023", "1.0 MPI|1.0 TSI|GTI|e-up!"),
    Phaeton: model("3D:2002–2016", "3.0 V6 TDI|3.2 V6|4.2 V8|6.0 W12"),
    Caddy: model("9K:II, 1995–2003|2K:III/IV, 2003–2020|SB:V, 2020+", "1.2 TSI|1.5 TSI|1.6 TDI|1.9 TDI|2.0 SDI|2.0 TDI"),
    Transporter: model("T4:1990–2003|T5:2003–2015|T6/T6.1:2015–2024|T7:2025+", "1.9 TDI|2.0 TDI|2.0 BiTDI|2.4 D|2.5 TDI"),
    Multivan: model("T4:1990–2003|T5:2003–2015|T6/T6.1:2015–2024|T7:2021+", "2.0 TDI|2.0 BiTDI|2.5 TDI|eHybrid"),
    Caravelle: model("T4:1990–2003|T5:2003–2015|T6/T6.1:2015–2024", "2.0 TDI|2.0 BiTDI|2.5 TDI"),
    California: model("T4:1990–2003|T5:2003–2015|T6/T6.1:2015–2024|T7:2024+", "2.0 TDI|2.0 BiTDI|2.5 TDI|eHybrid"),
    Crafter: model("I:2006–2016|II:2017+", "2.0 TDI|2.5 TDI|e-Crafter"),
    Amarok: model("2H:I, 2010–2022|II:2023+", "2.0 TDI|2.0 BiTDI|3.0 V6 TDI"),
    "ID.3": model("E1:2019+", "Pure|Pro|Pro S|GTX"),
    "ID.4": model("E2:2020+", "Pure|Pro|GTX"),
    "ID.5": model("E39:2021+", "Pro|Pro Performance|GTX"),
    "ID.7": model("ED:2023+", "Pro|Pro S|GTX Tourer"),
    "ID. Buzz": model("EB:2022+", "Pro|GTX|Cargo"),
  },
  BMW: {
    "Serija 1": model("E81/E82/E87/E88:2004–2013|F20/F21:2011–2019|F40:2019–2024|F70:2024+", "114d[2012–2019]|116d[2009–2024]|116i[2004–2019]|118d[2004–2024]|118d M Sport[2011–2024]|118i[2004–2024]|120d[2004+]|120d xDrive[2015–2024]|120i[2004+]|M135i xDrive[2012+]|M140i[2016–2019]"),
    "Serija 2": model("F22/F23:Coupé / Cabrio, 2013–2021|F45/F46:Active / Gran Tourer, 2014–2021|F44:Gran Coupé, 2019–2024|G42:Coupé, 2021+|U06:Active Tourer, 2021+|F74:Gran Coupé, 2025+", "216d[2014–2021]|218d[2014+]|218i[2014+]|220d[2013+]|220i[2013+]|225e[2016+]|M240i xDrive[2016+]"),
    "Serija 3": model("E30:1982–1994|E36:1990–2000|E46:1998–2006|E90/E91/E92/E93:2005–2013|F30/F31/F34:2012–2019, uključuje GT|G20/G21:2019+, uključuje Touring", "316i[1988–2015]|316d[2009–2019]|318i[1982+]|318is[1989–1999]|318d[2001+]|320i[1982+]|320d[1998+]|320d xDrive[2008+]|325i[1985–2013]|325d[2006–2018]|328i[1995–2016]|330i[2000+]|330d[1999+]|330e[2015+]|335i[2006–2015]|335d[2006–2018]|M340i xDrive[2019+]|M340d[2020+]"),
    "Serija 4": model("F32/F33/F36:2013–2020, uključuje Gran Coupé|G22/G23/G26:2020+", "418d|420d|420i|425d|430d|430i|435d|M440i xDrive"),
    "Serija 5": model("E34:1988–1996|E39:1995–2004|E60/E61:2003–2010|F10/F11/F07:2009–2017, uključuje GT|G30/G31:2016–2024|G60/G61:2023+", "518d|520i|520d|520d xDrive|525i|525d|528i|530i|530d|530e|535d|540i|540d xDrive|M550d|M550i"),
    "Serija 6": model("E63/E64:2003–2010|F06/F12/F13:2011–2018|G32:GT, 2017–2023", "630i|630d|640d|640i|650i"),
    "Serija 7": model("E32:1986–1994|E38:1994–2001|E65/E66:2001–2008|F01/F02:2008–2015|G11/G12:2015–2022|G70:2022+", "728i|730d|730i|740d|740i|745e|750i|750e xDrive|760i|M760e"),
    "Serija 8": model("E31:1989–1999|G14/G15/G16:2018+", "840d xDrive|840i|850i|M850i xDrive"),
    X1: model("E84:2009–2015|F48:2015–2022|U11:2022+", "sDrive16d|sDrive18d|sDrive18i|xDrive20d|xDrive25e|xDrive30e"),
    X2: model("F39:2017–2023|U10:2023+", "sDrive18d|sDrive20i|xDrive20d|M35i"),
    X3: model("E83:2003–2010|F25:2010–2017|G01:2017–2024|G45:2024+", "sDrive18d|xDrive20d|xDrive20i|xDrive30d|xDrive30e|M40i|M50 xDrive"),
    X4: model("F26:2014–2018|G02:2018+", "xDrive20d|xDrive30d|M40i|M40d"),
    X5: model("E53:1999–2006|E70:2006–2013|F15:2013–2018|G05:2018+", "3.0d|xDrive25d|xDrive30d|xDrive40d|xDrive45e|xDrive50e|M50d|M60i"),
    X6: model("E71:2008–2014|F16:2014–2019|G06:2019+", "xDrive30d|xDrive40d|M50d|M60i xDrive"),
    X7: model("G07:2019+", "xDrive40d|xDrive40i|M50d|M60i"),
    XM: model("G09:2023+", "50e|XM|Label"),
    Z3: model("E36/7:1995–2002", "1.8|1.9|2.2|2.8|3.0|M Roadster"),
    Z4: model("E85/E86:2002–2008|E89:2009–2016|G29:2018+", "2.0i|sDrive20i|sDrive23i|3.0i|sDrive30i|M40i"),
    M2: model("F87:2015–2021|G87:2023+", "M2|Competition|CS"),
    M3: model("E36:1992–1999|E46:2000–2006|E90/E92/E93:2007–2013|F80:2014–2018|G80/G81:2021+", "M3|Competition|CS|Touring"),
    M4: model("F82/F83:2014–2020|G82/G83:2021+", "M4|Competition|CS|CSL"),
    M5: model("E34:1988–1995|E39:1998–2003|E60:2005–2010|F10:2011–2016|F90:2017–2023|G90/G99:2024+", "M5|Competition|CS|Hybrid"),
    i3: model("I01:2013–2022", "60 Ah|94 Ah|120 Ah|REx|i3s"),
    i4: model("G26:2021+", "eDrive35|eDrive40|xDrive40|M50"),
    i5: model("G60/G61:2023+", "eDrive40|xDrive40|M60 xDrive"),
    i7: model("G70:2022+", "eDrive50|xDrive60|M70 xDrive"),
    iX1: model("U11:2022+", "eDrive20|xDrive30"),
    iX2: model("U10:2023+", "eDrive20|xDrive30"),
    iX3: model("G08:2020–2025|NA5:Neue Klasse, 2025+", "Inspiring|Impressive|M Sport"),
    iX: model("I20:2021+", "xDrive40|xDrive50|M60"),
  },
  Audi: {
    "80": model("B3:1986–1991|B4:1991–1996", "1.6|1.8 S|1.9 TD|1.9 TDI|2.0 E|2.3 E|2.6 V6"),
    "100": model("C3:1982–1991|C4:1991–1994", "2.0 E|2.3 E|2.5 TDI|2.8 V6"),
    A1: model("8X:I, 2010–2018|GB:II, 2018+", "1.0 TFSI|1.2 TFSI|1.4 TFSI|1.6 TDI|25 TFSI|30 TFSI|35 TFSI"),
    A2: model("8Z:1999–2005", "1.2 TDI 3L|1.4|1.4 TDI|1.6 FSI"),
    A3: model("8L:I, 1996–2003|8P:II, 2003–2013|8V:III, 2012–2020|8Y:IV, 2020+", "1.4 TFSI|1.5 TFSI|1.6|1.6 TDI|1.8 T|1.9 TDI|2.0 TDI|30 TDI|35 TDI|30 TFSI|35 TFSI|40 TFSI e|S line|S3|RS3"),
    A4: model("B5:1994–2001|B6:2000–2004|B7:2004–2008|B8:2008–2015|B9:2015–2024|B10:A5, 2024+", "1.6[1994–2008]|1.8 T[1995–2008]|1.8 TFSI[2007–2015]|1.9 TDI[1994–2008]|2.0 TDI[2004–2018]|2.5 TDI[1997–2006]|3.0 TDI[2004–2018]|30 TDI[2018–2024]|35 TDI[2018–2024]|35 TDI S line[2018–2024]|40 TDI[2018+]|40 TDI S line[2018+]|35 TFSI[2018–2024]|40 TFSI[2018+]|S line[2008+]|allroad[2009–2024]"),
    A5: model("8T/8F:I, 2007–2016|F5:II, 2016–2024|B10:III, 2024+", "1.8 TFSI|2.0 TDI|2.7 TDI|3.0 TDI|35 TDI|40 TDI|40 TFSI|45 TFSI|S line|S5|RS5"),
    A6: model("C4:1994–1997|C5:1997–2005|C6:2004–2011|C7:2011–2018|C8:2018–2025|C9:2025+", "1.9 TDI|2.0 TDI|2.5 TDI|2.7 TDI|3.0 TDI|40 TDI|45 TDI|50 TDI|50 TDI quattro|45 TFSI|55 TFSI e|S line|allroad|S6|RS6"),
    A7: model("4G:I, 2010–2018|4K:II, 2018+", "3.0 TDI|45 TDI|50 TDI|55 TFSI|55 TFSI e|S line"),
    A8: model("D2:1994–2002|D3:2002–2010|D4:2010–2017|D5:2017+", "3.0 TDI|4.0 TDI|4.2 TDI|4.2 V8|50 TDI|55 TFSI|60 TFSI e"),
    Q2: model("GA:2016+", "1.0 TFSI|1.6 TDI|30 TDI|30 TFSI|35 TFSI|35 TDI|S line|SQ2"),
    Q3: model("8U:I, 2011–2018|F3:II, 2018–2025|FJ:III, 2025+", "2.0 TDI|35 TDI|35 TFSI|40 TDI quattro|45 TFSI e|S line|RS Q3"),
    "Q4 e-tron": model("F4:2021+", "35 e-tron|40 e-tron|45 e-tron|50 quattro|55 quattro"),
    Q5: model("8R:I, 2008–2017|FY:II, 2017–2024|GU:III, 2024+", "2.0 TDI|3.0 TDI|35 TDI|40 TDI|45 TFSI|50 TFSI e|S line|SQ5"),
    "Q6 e-tron": model("GF:2024+", "Q6 e-tron|quattro|SQ6"),
    Q7: model("4L:I, 2005–2015|4M:II, 2015+", "3.0 TDI|4.2 TDI|45 TDI|50 TDI|55 TFSI e|S line|SQ7"),
    Q8: model("4M:2018+", "45 TDI|50 TDI|55 TFSI|60 TFSI e|SQ8|RS Q8"),
    "Q8 e-tron": model("GE:e-tron / Q8 e-tron, 2018+", "50 quattro|55 quattro|S"),
    TT: model("8N:I, 1998–2006|8J:II, 2006–2014|FV:III, 2014–2023", "1.8 T|1.8 TFSI|2.0 TFSI|2.0 TDI|TTS|TTRS"),
    R8: model("42:I, 2006–2015|4S:II, 2015–2024", "4.2 V8|5.2 V10|V10 Performance"),
    "e-tron GT": model("FW:2021+", "e-tron GT|RS e-tron GT"),
  },
  "Mercedes-Benz": {
    "190": model("W201:1982–1993", "190 D|190 D 2.5|190 E 1.8|190 E 2.0|190 E 2.3"),
    "A-klasa": model("W168:1997–2004|W169:2004–2012|W176:2012–2018|W177/V177:2018+, uključuje limuzinu", "140|160 CDI|170 CDI|180 CDI|180 d|180|200 CDI|200 d|200|220 d|250 e|AMG Line|A 35|A 45"),
    "B-klasa": model("W245:2005–2011|W246:2011–2018|W247:2018+", "180 CDI|180 d|200 CDI|200 d|200|250 e"),
    "C-klasa": model("W202/S202:1993–2001|W203/S203:2000–2007|W204/S204/C204:2007–2015|W205/S205/C205/A205:2014–2023|W206/S206:2021+", "180|180 d|200 CDI|200 d|220 CDI|220 d|220 d AMG Line|250 d|300 d|300 e|300 de|AMG Line|C 43|C 63"),
    "E-klasa": model("W124:1984–1997|W210/S210:1995–2003|W211/S211:2002–2009|W212/S212:2009–2016|W213/S213:2016–2023|W214/S214:2023+", "200 CDI|200 d|220 CDI|220 d|220 d Avantgarde|270 CDI|280 CDI|300 d|300 de|320 CDI|350 d|400 d|450 4MATIC|AMG Line|E 53|E 63"),
    "S-klasa": model("W140:1991–1998|W220:1998–2005|W221:2005–2013|W222/V222:2013–2020|W223/V223:2020+", "320 CDI|350 CDI|350 d|400 d|450 d|500|580 e|S 63"),
    CLA: model("C117/X117:I, 2013–2019|C118/X118:II, 2019–2025|C174:III, 2025+", "180 d|200 d|220 d|200|250 e|AMG Line|CLA 35|CLA 45"),
    CLE: model("C236/A236:2023+", "220 d|200|300|450|AMG 53"),
    CLS: model("C219:I, 2004–2010|C218/X218:II, 2011–2018|C257:III, 2018–2023", "320 CDI|350 CDI|350 d|400 d|450|CLS 53"),
    CLK: model("W208:1997–2003|W209:2002–2010", "200 Kompressor|220 CDI|270 CDI|320"),
    "SLK / SLC": model("R170:1996–2004|R171:2004–2011|R172:2011–2020", "200 Kompressor|200|250 d|350"),
    SL: model("R129:1989–2001|R230:2001–2011|R231:2012–2020|R232:2022+", "350|500|55 AMG|63 AMG"),
    GLA: model("X156:I, 2013–2020|H247:II, 2020+", "180 d|200 CDI|200 d|220 d|200|250 e|AMG Line"),
    GLB: model("X247:2019+", "180 d|200 d|220 d|200|250 4MATIC"),
    GLK: model("X204:2008–2015", "200 CDI|220 CDI|250 CDI|350 CDI"),
    GLC: model("X253/C253:I, 2015–2022, uključuje Coupé|X254/C254:II, 2022+, uključuje Coupé", "220 d|250 d|300 d|300 e|300 de|AMG Line|GLC 43|GLC 63"),
    "ML / GLE": model("W163:ML, 1997–2005|W164:ML, 2005–2011|W166/C292:ML / GLE, 2011–2019|V167/C167:GLE, 2018+, uključuje Coupé", "250 CDI|270 CDI|320 CDI|350 CDI|300 d|350 d|400 d|450 d|350 de|AMG Line"),
    "GL / GLS": model("X164:2006–2012|X166:2012–2019|X167:2019+", "320 CDI|350 CDI|350 d|400 d|450 d|580|600 Maybach"),
    "G-klasa": model("W463:1990–2018|W463A/W465:2018+", "350 d|400 d|450 d|G 500|G 580 EQ|G 63 AMG"),
    Citan: model("W415:I, 2012–2021|W420:II, 2021+", "109 CDI|110 CDI|111 CDI|112 CDI"),
    Vito: model("W638:1996–2003|W639:2003–2014|W447:2014+", "109 CDI|111 CDI|114 CDI|116 CDI|119 CDI|eVito"),
    "V-klasa": model("W638:1996–2003|W639:Viano, 2003–2014|W447:2014+", "200 d|220 d|250 d|300 d|Marco Polo|EQV"),
    Sprinter: model("W901–W905:I, 1995–2006|W906:II, 2006–2018|W907/W910:III, 2018+", "211 CDI|313 CDI|315 CDI|316 CDI|317 CDI|319 CDI"),
    EQA: model("H243:2021+", "250|250+|300 4MATIC|350 4MATIC"),
    EQB: model("X243:2021+", "250|250+|300 4MATIC|350 4MATIC"),
    EQC: model("N293:2019–2023", "400 4MATIC"),
    EQE: model("V295:Limuzina, 2022+|X294:SUV, 2022+", "300|350+|500 4MATIC|AMG 43|AMG 53"),
    EQS: model("V297:Limuzina, 2021+|X296:SUV, 2022+", "450+|450 4MATIC|580 4MATIC|AMG 53"),
  },
  Opel: {
    Corsa: model("B:1993–2000|C:2000–2006|D:2006–2014|E:2014–2019|F:2019+", "1.0|1.2|1.2 Turbo|1.3 CDTI|1.4|1.5 Diesel|1.7 DTI|OPC|Electric"),
    Astra: model("F:1991–1998|G:1998–2009|H:2004–2014|J:2009–2015|K:2015–2021|L:2021+", "1.2 Turbo|1.4|1.4 Turbo|1.5 Diesel|1.6|1.6 CDTI|1.7 CDTI|1.9 CDTI|2.0 CDTI|OPC|GSi|Plug-in Hybrid|Electric"),
    Vectra: model("A:1988–1995|B:1995–2002|C:2002–2008", "1.6|1.8|1.9 CDTI|2.0 DTI|2.2 DTI|OPC"),
    Omega: model("B:1994–2003", "2.0|2.2 DTI|2.5 DTI|3.0 V6"),
    Signum: model("I:2003–2008", "1.9 CDTI|2.2 DTI|3.0 CDTI"),
    Insignia: model("A:2008–2017|B:2017–2022", "1.5 Turbo|1.6 CDTI|2.0 CDTI|2.0 Turbo|GSi|OPC|Country Tourer"),
    Meriva: model("A:2003–2010|B:2010–2017", "1.3 CDTI|1.4|1.4 Turbo|1.6 CDTI|1.7 CDTI"),
    Zafira: model("A:1999–2005|B:2005–2014|C:Tourer, 2011–2019|K0:Zafira Life, 2019+", "1.6|1.6 CDTI|1.7 CDTI|1.9 CDTI|2.0 CDTI|2.0 Diesel"),
    Mokka: model("A:Mokka / Mokka X, 2012–2019|B:2020+", "1.2 Turbo|1.4 Turbo|1.5 Diesel|1.6 CDTI|1.7 CDTI|Electric"),
    Crossland: model("I:Crossland X / Crossland, 2017–2024", "1.2|1.2 Turbo|1.5 Diesel|1.6 Diesel"),
    Grandland: model("I:Grandland X / Grandland, 2017–2024|II:2024+", "1.2 Turbo|1.5 Diesel|1.6 Turbo|2.0 Diesel|Hybrid|Plug-in Hybrid|Electric"),
    Frontera: model("A/B:1991–2004|C:2024+", "2.2 DTI|2.8 TD|Hybrid|Electric"),
    Antara: model("I:2006–2015", "2.0 CDTI|2.2 CDTI"),
    Tigra: model("A:1994–2001|B:TwinTop, 2004–2009", "1.4|1.6|1.8|1.3 CDTI"),
    Adam: model("I:2012–2019", "1.0 Turbo|1.2|1.4"),
    Agila: model("A:2000–2007|B:2008–2014", "1.0|1.2|1.3 CDTI"),
    Karl: model("I:2015–2019", "1.0"),
    Calibra: model("A:1989–1997", "2.0 8V|2.0 16V|2.0 Turbo|2.5 V6"),
    Cascada: model("I:2013–2019", "1.4 Turbo|1.6 Turbo|2.0 CDTI"),
    Combo: model("B:1993–2001|C:2001–2011|D:2011–2018|E:2018+", "1.3 CDTI|1.5 Diesel|1.6 CDTI|1.7 CDTI|Electric"),
    Vivaro: model("A:2001–2014|B:2014–2019|C:2019+", "1.5 Diesel|1.6 CDTI|1.9 DTI|2.0 CDTI|2.0 Diesel|Electric"),
    Movano: model("A:1998–2010|B:2010–2021|C:2021+", "2.2 Diesel|2.3 CDTI|2.5 CDTI"),
  },
  Porsche: {
    "911": model("964:1989–1994|993:1994–1998|996:1997–2006|997:2004–2013|991:2011–2019|992:2019+", "Carrera|Carrera S|Carrera 4S|Targa 4|GT3|GT3 RS|Turbo|Turbo S"),
    "718 Boxster": model("986:1996–2004|987:2004–2012|981:2012–2016|982:2016+", "2.0|2.7|S|GTS|GTS 4.0|Spyder"),
    "718 Cayman": model("987c:2005–2012|981c:2013–2016|982:2016+", "2.0|2.7|S|GTS 4.0|GT4|GT4 RS"),
    Macan: model("95B:2014–2024|XAB:Electric, 2024+", "2.0 T|S|S Diesel|GTS|Turbo|Macan Electric|4 Electric|Turbo Electric"),
    Cayenne: model("9PA:I, 2002–2010|92A:II, 2010–2017|E3:III, 2017+", "3.0 TDI|S Diesel|S|E-Hybrid|GTS|Turbo|Turbo GT"),
    Panamera: model("970:I, 2009–2016|971:II, 2016–2023|976:III, 2023+", "3.0 Diesel|4|4S|GTS|4 E-Hybrid|Turbo S"),
    Taycan: model("Y1A:Limuzina, 2019+|Y1B:Cross Turismo, 2021+|Y1C:Sport Turismo, 2022+", "Taycan|4S|GTS|Turbo|Turbo S"),
    "944 / 968": model("944:1982–1991|968:1991–1995", "2.5|S2|Turbo|3.0"),
  },
  "Škoda": {
    Felicia: model("791:1994–2001", "1.3|1.6|1.9 D"),
    Fabia: model("6Y:I, 1999–2007|5J:II, 2007–2014|NJ:III, 2014–2021|PJ:IV, 2021+", "1.0 MPI|1.0 TSI|1.2 HTP|1.2 TSI|1.4|1.4 TDI|1.6 TDI|1.9 TDI|Monte Carlo|RS"),
    Octavia: model("1U:I, 1996–2010|1Z:II, 2004–2013|5E:III, 2012–2020|NX:IV, 2019+", "1.0 TSI|1.2 TSI|1.4 TSI|1.5 TSI|1.6|1.6 TDI|1.9 TDI|2.0 TDI|RS 2.0 TSI|RS 2.0 TDI|Scout|iV"),
    Superb: model("3U:I, 2001–2008|3T:II, 2008–2015|3V:III, 2015–2023|3Y:IV, 2023+", "1.4 TSI|1.5 TSI|1.6 TDI|1.9 TDI|2.0 TDI|2.0 TSI|iV|Laurin & Klement|Sportline"),
    Scala: model("NW1:2019+", "1.0 TSI|1.5 TSI|1.6 TDI|Monte Carlo"),
    Rapid: model("NH:2012–2019", "1.0 TSI|1.2 TSI|1.4 TSI|1.4 TDI|1.6 TDI"),
    Roomster: model("5J:2006–2015", "1.2 TSI|1.4|1.6 TDI|1.9 TDI"),
    Yeti: model("5L:2009–2017", "1.2 TSI|1.4 TSI|1.6 TDI|2.0 TDI 4x4"),
    Kamiq: model("NW4:2019+", "1.0 TSI|1.5 TSI|1.6 TDI|Monte Carlo"),
    Karoq: model("NU:2017+", "1.0 TSI|1.5 TSI|1.6 TDI|2.0 TDI|2.0 TDI 4x4|Sportline"),
    Kodiaq: model("NS:I, 2016–2024|PS:II, 2024+", "1.5 TSI|2.0 TDI|2.0 TDI 4x4|2.0 TSI|RS|iV|Laurin & Klement|Sportline"),
    Citigo: model("NF:2011–2020", "1.0 MPI|Citigo-e iV"),
    Enyaq: model("NY:2020+", "50|60|80|85|85x|RS"),
    Elroq: model("I:2024+", "50|60|85|85x"),
  },
  Seat: {
    Ibiza: model("6K:II, 1993–2002|6L:III, 2002–2008|6J/6P:IV, 2008–2017|KJ:V, 2017+", "1.0 MPI|1.0 TSI|1.2 TSI|1.4|1.4 TDI|1.5 TSI|1.6 TDI|1.9 TDI|FR|Cupra"),
    Cordoba: model("6K:1993–2002|6L:2002–2009", "1.4|1.4 TDI|1.6|1.9 SDI|1.9 TDI"),
    Leon: model("1M:I, 1999–2006|1P:II, 2005–2012|5F:III, 2012–2020|KL:IV, 2020+", "1.0 TSI|1.2 TSI|1.4 TSI|1.5 TSI|1.6|1.6 TDI|1.9 TDI|2.0 TDI|FR|e-Hybrid|Cupra"),
    Toledo: model("1L:1991–1999|1M:1998–2004|5P:2004–2009|NH:2012–2019", "1.2 TSI|1.4 TSI|1.6 TDI|1.9 TDI|2.0 TDI"),
    Altea: model("5P:2004–2015", "1.2 TSI|1.4 TSI|1.6|1.6 TDI|1.9 TDI|2.0 TDI|XL|Freetrack"),
    Exeo: model("3R:2008–2013", "1.8 T|2.0 TDI"),
    Arona: model("KJ7:2017+", "1.0 TSI|1.5 TSI|1.6 TDI|FR"),
    Ateca: model("KH7:2016+", "1.0 TSI|1.5 TSI|1.6 TDI|2.0 TDI|2.0 TDI 4Drive|FR"),
    Tarraco: model("KN2:2018–2024", "1.5 TSI|2.0 TDI|2.0 TSI|e-Hybrid|FR"),
    Alhambra: model("7M:I, 1996–2010|7N:II, 2010–2020", "1.4 TSI|1.9 TDI|2.0 TDI"),
    Mii: model("KF:2011–2021", "1.0 MPI|Mii electric"),
  },
  Cupra: {
    Formentor: model("KM:2020+|KM facelift:2024+", "1.5 TSI|1.5 eTSI|2.0 TDI|2.0 TSI VZ|2.5 TSI VZ5|e-Hybrid"),
    Leon: model("KL:2020+|KL facelift:2024+", "1.5 TSI|1.5 eTSI|2.0 TSI VZ|e-Hybrid"),
    Ateca: model("KH7:2018+", "1.5 TSI|2.0 TSI VZ"),
    Born: model("K11:2021+", "58 kWh|77 kWh|VZ"),
    Tavascan: model("KR:2024+", "Endurance|VZ"),
    Terramar: model("KP:2024+", "1.5 eTSI|2.0 TSI|e-Hybrid VZ"),
  },
  Smart: {
    Fortwo: model("450:1998–2007|451:2007–2014|453:2014–2024", "0.6 Turbo|0.7 Turbo|0.8 CDI|0.9 Turbo|1.0|Brabus|Electric Drive|EQ"),
    Forfour: model("454:2004–2006|453:2014–2022", "0.9 Turbo|1.0|1.1|1.3|1.5 CDI|EQ"),
    Roadster: model("452:2003–2006", "0.7 Turbo|Brabus"),
    "#1": model("I:2022+", "Pro|Pro+|Premium|Pulse|Brabus"),
    "#3": model("I:2023+", "Pro|Pro+|Premium|Brabus"),
    "#5": model("I:2024+", "Pro|Premium|Summit|Brabus"),
  },
  Mini: {
    Hatch: model("R50/R53:2001–2006|R56:2006–2013|F55/F56:2014–2024|F65/F66:2024+|J01:Electric, 2024+", "One|One D|Cooper|Cooper D|Cooper S|Cooper SE|John Cooper Works"),
    Cabrio: model("R52:2004–2008|R57:2009–2015|F57:2016–2024|F67:2024+", "Cooper|Cooper D|Cooper S|John Cooper Works"),
    Clubman: model("R55:2007–2014|F54:2015–2024", "One|Cooper|Cooper D|Cooper S|John Cooper Works|All4"),
    Countryman: model("R60:2010–2016|F60:2017–2023|U25:2023+", "One D|Cooper|Cooper D|Cooper SD|Cooper S|Cooper SE|Countryman E|All4"),
    Paceman: model("R61:2013–2016", "Cooper|Cooper D|Cooper S|All4"),
    Aceman: model("J05:2024+", "E|SE|John Cooper Works"),
  },
  Maybach: {
    "57": model("W240:2002–2012", "57|57 S"),
    "62": model("V240:2002–2012", "62|62 S|Landaulet"),
    "S-klasa Maybach": model("X222:2015–2020|Z223:2021+", "S 560|S 580|S 650|S 680"),
    "GLS Maybach": model("X167:2020+", "GLS 600"),
    "EQS Maybach": model("Z296:2024+", "EQS 680 SUV"),
  },

  // === FRENCH ===
  Renault: {
    "19": model("I/II:1988–1996", "1.4|1.7|1.8 16V|1.9 D|1.9 dT"),
    "21": model("I/II:1986–1995", "1.7|2.0|2.1 D|2.1 TD"),
    Safrane: model("I:1992–2000", "2.0|2.2 dT|2.5|3.0 V6"),
    "Vel Satis": model("I:2001–2009", "2.0 T|2.2 dCi|3.0 dCi"),
    Twingo: model("I:1993–2007|II:2007–2014|III:2014–2024|E-Tech:2026+", "1.0 SCe|0.9 TCe|1.2|1.2 16V|1.5 dCi|Electric"),
    Clio: model("I:1990–1998|II:1998–2012|III:2005–2014|IV:2012–2019|V:2019–2025|VI:2025+", "0.9 TCe|1.0 TCe|1.2 16V|1.4|1.5 dCi|1.6|E-Tech full hybrid|R.S."),
    Modus: model("I:2004–2012", "1.2 16V|1.4|1.5 dCi"),
    "Mégane": model("I:1995–2003|II:2002–2009|III:2008–2016|IV:2016–2024", "1.2 TCe|1.3 TCe|1.4|1.5 dCi|1.6|1.6 dCi|1.9 dCi|2.0 dCi|GT|R.S."),
    "Mégane E-Tech": model("I:2022+", "EV40|EV60"),
    Fluence: model("L30:2009–2016", "1.5 dCi|1.6 16V"),
    Laguna: model("I:1994–2001|II:2001–2007|III:2007–2015", "1.5 dCi|1.6 16V|1.8|1.9 dCi|2.0 dCi|2.2 dCi|3.0 V6"),
    Talisman: model("I:2015–2022", "1.5 dCi|1.6 dCi|1.7 Blue dCi|2.0 Blue dCi|TCe 160|TCe 225"),
    "Scénic": model("I:1996–2003|II:2003–2009|III:2009–2016|IV:2016–2022|V:E-Tech Electric, 2024+", "1.3 TCe|1.4 TCe|1.5 dCi|1.6 dCi|1.9 dCi|EV60|EV87"),
    Espace: model("III:1996–2002|IV:2002–2014|V:2015–2023|VI:2023+", "1.6 dCi|1.9 dCi|2.0 dCi|2.2 dCi|E-Tech full hybrid 200"),
    Captur: model("I:2013–2019|II:2019+", "0.9 TCe|1.0 TCe|1.2 TCe|1.3 TCe|1.5 dCi|E-Tech"),
    Kadjar: model("I:2015–2022", "1.2 TCe|1.3 TCe|1.5 dCi|1.6 dCi|1.7 Blue dCi"),
    Austral: model("I:2022+", "Mild Hybrid 130|Mild Hybrid 160|E-Tech full hybrid 200"),
    Arkana: model("I:2020+", "TCe 140|TCe 160|E-Tech full hybrid 145"),
    Symbioz: model("I:2024+", "E-Tech full hybrid 145"),
    Rafale: model("I:2024+", "E-Tech full hybrid 200|E-Tech 4x4 300"),
    Koleos: model("I:2008–2016|II:2017–2023", "1.7 Blue dCi|2.0 dCi|2.0 Blue dCi"),
    Zoe: model("I:2012–2024", "22 kWh|41 kWh|52 kWh"),
    "5 E-Tech": model("I:2024+", "40 kWh|52 kWh"),
    Kangoo: model("I:1997–2007|II:2007–2021|III:2021+", "1.2 TCe|1.3 TCe|1.5 dCi|1.9 D|E-Tech"),
    Trafic: model("II:2001–2014|III:2014+", "1.6 dCi|1.9 dCi|2.0 dCi|2.0 Blue dCi|2.5 dCi"),
    Master: model("II:1997–2010|III:2010–2024|IV:2024+", "2.3 dCi|2.5 dCi|2.0 Blue dCi|E-Tech"),
  },
  Peugeot: {
    "106": model("I:1991–1996|II:1996–2003", "1.0|1.1|1.4|1.5 D|Rallye|S16"),
    "107": model("I:2005–2014", "1.0|1.4 HDi"),
    "108": model("I:2014–2022", "1.0 VTi|1.2 PureTech"),
    "206": model("I:1998–2012", "1.1|1.4|1.4 HDi|1.6|1.6 HDi|1.9 D|2.0 HDi|CC|RC"),
    "207": model("I:2006–2014", "1.4|1.4 HDi|1.6 HDi|1.6 VTi|1.6 THP|CC"),
    "208": model("A9:I, 2012–2019|P21:II, 2019+", "1.0 VTi|1.2 PureTech|1.4 HDi|1.5 BlueHDi|1.6 HDi|1.6 BlueHDi|Hybrid|e-208|GTi"),
    "306": model("I:1993–2002", "1.4|1.6|1.9 D|1.9 TD|2.0 HDi"),
    "307": model("I:2001–2008", "1.4|1.6|1.6 HDi|2.0 HDi|SW|CC"),
    "308": model("T7:I, 2007–2013|T9:II, 2013–2021|P5:III, 2021+", "1.2 PureTech|1.5 BlueHDi|1.6 HDi|1.6 BlueHDi|2.0 BlueHDi|Hybrid|Plug-in Hybrid|e-308|GT|GTi"),
    "406": model("I:1995–2004", "1.8|2.0|1.9 TD|2.0 HDi|2.2 HDi|Coupe"),
    "407": model("I:2004–2011", "1.6 HDi|2.0|2.0 HDi|2.2 HDi|2.7 V6 HDi"),
    "408": model("P54:2022+", "1.2 PureTech|Hybrid|Plug-in Hybrid|e-408"),
    "508": model("W2:I, 2010–2018|R8:II, 2018–2025", "1.5 BlueHDi|1.6 HDi|2.0 HDi|2.0 BlueHDi|PureTech 180|Plug-in Hybrid|PSE"),
    "607": model("I:1999–2010", "2.0 HDi|2.2 HDi|2.7 V6 HDi|3.0 V6"),
    "806": model("I:1994–2002", "1.9 TD|2.0|2.0 HDi"),
    "807": model("I:2002–2014", "2.0 HDi|2.2 HDi"),
    "1007": model("I:2004–2009", "1.4|1.4 HDi|1.6 HDi"),
    "4007": model("I:2007–2012", "2.2 HDi|2.4"),
    "4008": model("I:2012–2017", "1.6 HDi|1.8 HDi"),
    "2008": model("A94:I, 2013–2019|P24:II, 2019+", "1.2 PureTech|1.5 BlueHDi|1.6 HDi|1.6 BlueHDi|Hybrid|e-2008"),
    "3008": model("T84:I, 2009–2016|P84:II, 2016–2024|P64:III, 2024+", "1.2 PureTech|1.5 BlueHDi|1.6 HDi|2.0 HDi|2.0 BlueHDi|Hybrid|Plug-in Hybrid|e-3008"),
    "5008": model("T87:I, 2009–2017|P87:II, 2017–2024|P74:III, 2024+", "1.2 PureTech|1.5 BlueHDi|1.6 HDi|2.0 BlueHDi|Hybrid|e-5008"),
    RCZ: model("I:2010–2015", "1.6 THP|2.0 HDi|R"),
    Partner: model("I:1996–2008|II:2008–2018|III:2018+", "1.5 BlueHDi|1.6 HDi|1.9 D|2.0 HDi|e-Partner"),
    Rifter: model("K9:2018+", "1.2 PureTech|1.5 BlueHDi|e-Rifter"),
    "Expert / Traveller": model("I:1995–2006|II:2007–2016|III:2016+", "1.5 BlueHDi|1.6 HDi|2.0 HDi|2.0 BlueHDi|Electric"),
    Boxer: model("I:1994–2006|II:2006–2014|III:2014+", "2.0 BlueHDi|2.2 HDi|2.2 BlueHDi|3.0 HDi"),
  },
  "Citroën": {
    AX: model("I:1986–1998", "1.0|1.1|1.4 D|1.5 D"),
    ZX: model("I:1991–1998", "1.4|1.9 D|1.9 TD"),
    BX: model("I:1982–1994", "1.6|1.9 D|1.9 TD"),
    XM: model("Y3/Y4:1989–2000", "2.0|2.1 TD|2.5 TD|3.0 V6"),
    Saxo: model("I:1996–2003", "1.1|1.4|1.5 D|1.6 VTS"),
    C1: model("I:2005–2014|II:2014–2022", "1.0 VTi|1.2 PureTech|1.4 HDi"),
    C2: model("I:2003–2009", "1.1|1.4|1.4 HDi|1.6 VTS"),
    C3: model("FC/FN:I, 2002–2009|SC:II, 2009–2016|SX:III, 2016–2024|IV:2024+", "1.1|1.2 PureTech|1.4|1.4 HDi|1.5 BlueHDi|1.6 HDi|Hybrid|ë-C3"),
    "C3 Picasso": model("I:2009–2017", "1.4 VTi|1.6 VTi|1.6 HDi"),
    "C3 Aircross": model("I:2017–2024|II:2024+", "PureTech 110|PureTech 130|BlueHDi 110|Hybrid|ë-C3 Aircross"),
    C4: model("I:2004–2010|II:2010–2018|C41:III, 2020+", "1.2 PureTech|1.4|1.5 BlueHDi|1.6|1.6 HDi|2.0 HDi|Hybrid|ë-C4"),
    "C4 Cactus": model("I:2014–2020", "1.2 PureTech|1.5 BlueHDi|1.6 HDi"),
    "C4 Picasso": model("I:2006–2013|II:2013–2022, uključuje SpaceTourer", "1.2 PureTech|1.5 BlueHDi|1.6 HDi|2.0 HDi|2.0 BlueHDi"),
    Xsara: model("I:1997–2006|Picasso:1999–2010", "1.4|1.6|1.6 HDi|1.9 D|2.0 HDi"),
    Xantia: model("X1/X2:1993–2002", "1.8|1.9 TD|2.0 HDi"),
    C5: model("I:2001–2008|X7:2008–2017|C5 X:2021+", "1.6 HDi|2.0 HDi|2.2 HDi|2.7 V6 HDi|Plug-in Hybrid"),
    "C5 Aircross": model("C84:I, 2018–2025|II:2025+", "1.2 PureTech|1.5 BlueHDi|2.0 BlueHDi|Hybrid|Plug-in Hybrid|Electric"),
    C6: model("I:2005–2012", "2.2 HDi|2.7 V6 HDi|3.0 V6 HDi"),
    C8: model("I:2002–2014", "2.0 HDi|2.2 HDi"),
    "C4 Aircross": model("I:2012–2017", "1.6 HDi|1.8 HDi"),
    "C-Crosser": model("I:2007–2012", "2.2 HDi|2.4"),
    "C-Zero": model("I:2010–2020", "Electric"),
    "C-Elysée": model("I:2012–2021", "1.2 PureTech|1.6 VTi|1.5 BlueHDi|1.6 HDi"),
    Berlingo: model("M49/M59:I, 1996–2008|B9:II, 2008–2018|K9:III, 2018+", "1.2 PureTech|1.5 BlueHDi|1.6 HDi|1.9 D|2.0 HDi|ë-Berlingo"),
    "Jumpy / SpaceTourer": model("I:1995–2006|II:2007–2016|III:2016+", "1.5 BlueHDi|1.6 HDi|2.0 HDi|2.0 BlueHDi|Electric"),
    Jumper: model("I:1994–2006|II:2006–2014|III:2014+", "2.0 BlueHDi|2.2 HDi|2.2 BlueHDi|3.0 HDi"),
  },
  "DS Automobiles": {
    "DS 3": model("I:2009–2019|D34:Crossback / DS 3, 2018+", "1.6 HDi|PureTech 130|BlueHDi 130|E-Tense"),
    "DS 4": model("I:2011–2018|II:2021+", "1.6 HDi|2.0 HDi|PureTech 130|BlueHDi 130|E-Tense 225"),
    "DS 5": model("I:2011–2018", "1.6 HDi|2.0 HDi|BlueHDi 180|Hybrid4"),
    "DS 7": model("X74:Crossback / DS 7, 2017+", "BlueHDi 130|2.0 BlueHDi|E-Tense 225|E-Tense 4x4 300"),
    "DS 9": model("I:2020+", "PureTech 225|E-Tense 225|E-Tense 360"),
  },
  Dacia: {
    Sandero: model("I:2008–2012|II:2012–2020|III:2020+", "1.0 SCe|0.9 TCe|1.2 16V|1.4|1.5 dCi|TCe 90|ECO-G 100|Stepway"),
    Logan: model("I:2004–2012|II:2012–2020|III:2020+", "1.0 SCe|0.9 TCe|1.4|1.5 dCi|1.6|ECO-G 100"),
    Duster: model("HS:I, 2010–2017|HM:II, 2017–2024|P1310:III, 2024+", "1.0 TCe|1.2 TCe|1.3 TCe|1.5 dCi|1.6|TCe 130|ECO-G 100|Hybrid 140|4x4"),
    Lodgy: model("I:2012–2022", "1.2 TCe|1.5 dCi|1.6"),
    Dokker: model("I:2012–2021", "1.2 TCe|1.5 dCi|1.6"),
    Jogger: model("I:2021+", "TCe 110|ECO-G 100|Hybrid 140"),
    Spring: model("I:2021+|I facelift:2024+", "Electric 45|Electric 65"),
    Bigster: model("I:2025+", "Mild Hybrid 140|Hybrid 155|Mild Hybrid-G 140|4x4"),
  },
  Alpine: {
    A110: model("II:2017+", "Pure|GT|S|R"),
    A290: model("I:2024+", "GT|GT Performance|GTS"),
  },

  // === ITALIAN ===
  Fiat: {
    Panda: model("141:1980–2003|169:2003–2012|319:2012+", "1.1|1.2 FIRE|0.9 TwinAir|1.3 MultiJet|1.0 Hybrid|4x4"),
    "Grande Panda": model("I:2025+", "Hybrid|Electric"),
    Uno: model("146:1983–1995", "1.0 FIRE|1.1|1.4|1.7 D"),
    Seicento: model("187:1998–2010", "0.9|1.1 FIRE|Sporting"),
    Cinquecento: model("170:1991–1998", "0.9|1.1 Sporting"),
    Punto: model("176:I, 1993–1999|188:II, 1999–2010|199:Grande Punto / Evo, 2005–2018", "1.2 FIRE|1.4 FIRE|1.4 T-Jet|1.3 MultiJet|1.9 JTD|1.9 MultiJet"),
    Marea: model("185:1996–2002", "1.6|1.9 TD|1.9 JTD|2.4 JTD"),
    Multipla: model("186:1998–2010", "1.6|1.9 JTD|1.9 MultiJet"),
    Idea: model("350:2003–2012", "1.3 MultiJet|1.4|1.9 MultiJet"),
    Linea: model("323:2007–2015", "1.3 MultiJet|1.4|1.4 T-Jet|1.6 MultiJet"),
    Ulysse: model("220:1994–2002|179:2002–2010", "2.0 JTD|2.2 JTD"),
    Bravo: model("182:Bravo / Brava, 1995–2001|198:2007–2014", "1.4|1.4 T-Jet|1.6|1.6 MultiJet|1.9 JTD|1.9 MultiJet|2.0 MultiJet"),
    Stilo: model("192:2001–2007", "1.4|1.6|1.9 JTD|1.9 MultiJet"),
    Tipo: model("160:I, 1988–1995|356:II, 2015+", "1.0 T3|1.4 FIRE|1.5 Hybrid|1.3 MultiJet|1.6 MultiJet"),
    Croma: model("154:I, 1985–1996|194:II, 2005–2011", "1.9 MultiJet|2.4 MultiJet"),
    "500": model("312:2007–2024|332:2020+, Nova 500", "1.2 FIRE|0.9 TwinAir|1.0 Hybrid|1.3 MultiJet|Electric"),
    "500L": model("330:2012–2022", "1.4 FIRE|1.4 T-Jet|1.3 MultiJet|1.6 MultiJet"),
    "500X": model("334:2014–2024", "1.0 FireFly|1.3 FireFly|1.4 MultiAir|1.6 MultiJet|2.0 MultiJet|Hybrid"),
    "600": model("364:2023+", "Hybrid|Electric"),
    Freemont: model("345:2011–2016", "2.0 MultiJet|2.0 MultiJet AWD"),
    Sedici: model("189:2006–2014", "1.6|1.9 MultiJet|2.0 MultiJet 4x4"),
    "Qubo / Fiorino": model("225:2007–2024", "1.3 MultiJet|1.4"),
    "Doblò": model("223:I, 2000–2010|263:II, 2010–2022|K9:III, 2022+", "1.3 MultiJet|1.5 BlueHDi|1.6 MultiJet|1.9 JTD|2.0 MultiJet|E-Doblo"),
    Scudo: model("220:1995–2006|270:2007–2016|K0:2022+", "1.6 MultiJet|2.0 MultiJet|Electric"),
    Ducato: model("230:1994–2002|244:2002–2006|250:2006–2014|290:2014+", "2.2 MultiJet|2.3 MultiJet|2.8 JTD|3.0 MultiJet|E-Ducato"),
  },
  "Alfa Romeo": {
    "33": model("907:1983–1995", "1.3|1.4|1.5|1.7 16V"),
    "75": model("162B:1985–1992", "1.6|1.8|2.0 Twin Spark|3.0 V6"),
    "145 / 146": model("930:1994–2001", "1.4 Twin Spark|1.6 Twin Spark|1.9 JTD"),
    "147": model("937:2000–2010", "1.6 Twin Spark|2.0 Twin Spark|1.9 JTD|1.9 JTDM|GTA"),
    "156": model("932:1997–2007", "1.6 Twin Spark|1.8 Twin Spark|2.0 Twin Spark|1.9 JTD|2.4 JTD|GTA"),
    "159": model("939:2005–2011", "1.8|1.9 JTS|1.9 JTDM|2.0 JTDM|2.4 JTDM|1750 TBi"),
    "166": model("936:1998–2007", "2.0 Twin Spark|2.4 JTD|3.0 V6"),
    MiTo: model("955:2008–2018", "0.9 TwinAir|1.4|1.4 MultiAir|1.3 JTDM|1.6 JTDM"),
    Giulietta: model("940:2010–2020", "1.4 T-Jet|1.4 MultiAir|1.6 JTDM|2.0 JTDM|1750 TBi|Veloce"),
    Giulia: model("952:2016+", "2.0 Turbo|2.2 Diesel|2.2 Diesel Q4|Veloce|Quadrifoglio"),
    Stelvio: model("949:2016+", "2.0 Turbo Q4|2.2 Diesel|2.2 Diesel Q4|Veloce|Quadrifoglio"),
    Tonale: model("965:2022+", "1.5 Hybrid|1.6 Diesel|Plug-in Hybrid Q4"),
    Junior: model("966:2024+", "Ibrida|Elettrica|Veloce"),
    GT: model("937:2003–2010", "1.8 Twin Spark|1.9 JTDM|2.0 JTS|3.2 V6"),
    Brera: model("939:2005–2010", "2.0 JTDM|2.2 JTS|2.4 JTDM|3.2 V6"),
    Spider: model("916:1995–2004|939:2006–2010", "2.0 Twin Spark|2.0 JTDM|2.2 JTS|3.2 V6"),
  },
  Lancia: {
    Ypsilon: model("840:1995–2003|843:2003–2011|846:2011–2024|L21:2024+", "1.2 FIRE|0.9 TwinAir|1.3 MultiJet|Hybrid|Electric"),
    Delta: model("831:I, 1979–1994|836:II, 1993–1999|844:III, 2008–2014", "1.4 T-Jet|1.6 MultiJet|1.9 TwinTurbo|2.0 MultiJet|Integrale"),
    Lybra: model("839:1999–2005", "1.6|1.8|1.9 JTD|2.4 JTD"),
    Thesis: model("841:2001–2009", "2.4 JTD|3.0 V6"),
    Musa: model("350:2004–2012", "1.4|1.3 MultiJet|1.6 MultiJet"),
    Phedra: model("179:2002–2010", "2.0 JTD|2.2 JTD"),
    Voyager: model("RT:2011–2015", "2.8 CRD"),
  },
  Maserati: {
    Ghibli: model("M157:2013–2023", "3.0 Diesel|3.0 V6|S Q4|Trofeo"),
    Quattroporte: model("M139:V, 2003–2012|M156:VI, 2013–2023", "3.0 Diesel|4.2 V8|S Q4|GTS|Trofeo"),
    Levante: model("M161:2016–2024", "3.0 Diesel|S|GTS|Trofeo"),
    Grecale: model("M182:2022+", "GT|Modena|Trofeo|Folgore"),
    GranTurismo: model("M145:I, 2007–2019|M189:II, 2023+", "4.2|4.7 Sport|Modena|Trofeo|Folgore"),
    MC20: model("I:2020+", "3.0 V6 Nettuno|Cielo"),
  },
  Ferrari: {
    "360 / F430": model("360:1999–2005|F430:2004–2009", "Modena|Spider|Scuderia"),
    "458": model("F142:2009–2015", "Italia|Spider|Speciale"),
    "488": model("F142M:2015–2020", "GTB|Spider|Pista"),
    "F8": model("F142MFL:2019–2023", "Tributo|Spider"),
    "296": model("F171:2021+", "GTB|GTS"),
    "California / Portofino": model("F149:California, 2008–2017|F164:Portofino, 2017–2023", "V8|T|M"),
    Roma: model("F169:2019+", "Coupé|Spider"),
    SF90: model("F173:2019+", "Stradale|Spider"),
    Purosangue: model("F175:2022+", "6.5 V12"),
  },
  Lamborghini: {
    Gallardo: model("140:2003–2013", "5.0 V10|5.2 V10 LP560-4"),
    "Huracán": model("LB724:2014–2024", "LP610-4|EVO|STO|Tecnica"),
    Aventador: model("LB834:2011–2022", "LP700-4|S|SVJ"),
    Urus: model("I:2018+", "4.0 V8|S|Performante|SE"),
    Revuelto: model("LB744:2023+", "V12 HPEV"),
  },
  Abarth: {
    "500": model("312:2008–2016", "1.4 T-Jet|Esseesse"),
    "595": model("312:2012–2024", "1.4 T-Jet|Turismo|Competizione|Esseesse"),
    "695": model("312:2009–2024", "1.4 T-Jet|Competizione|Tributo"),
    "500e": model("332:2023+", "Turismo|Scorpionissima"),
    "600e": model("364:2024+", "Turismo|Scorpionissima"),
    "124 Spider": model("348:2016–2019", "1.4 MultiAir"),
  },
  Iveco: {
    Daily: model("III:1999–2006|IV:2006–2011|V:2011–2014|VI:2014+", "2.3 HPI|3.0 HPI|3.0 JTD|eDaily"),
    Massif: model("I:2007–2011", "3.0 HPI|3.0 HPT"),
  },

  // === JAPANESE ===
  Toyota: {
    Starlet: model("P8/P9:1989–1999", "1.0|1.3|1.5 D"),
    iQ: model("AJ10:2008–2015", "1.0|1.33|1.4 D-4D"),
    Aygo: model("AB10:I, 2005–2014|AB40:II, 2014–2022", "1.0 VVT-i|1.4 D-4D"),
    "Aygo X": model("AB70:2022+", "1.0 VVT-i|1.5 Hybrid"),
    Yaris: model("XP10:I, 1999–2005|XP90:II, 2005–2011|XP130:III, 2011–2020|XP210:IV, 2020+", "1.0 VVT-i|1.3 VVT-i|1.33 Dual VVT-i|1.4 D-4D|1.5 Hybrid|GR"),
    "Yaris Cross": model("XP210:2021+", "1.5 Hybrid|Hybrid 116|Hybrid 130|AWD-i"),
    "Urban Cruiser": model("XP110:2009–2014|2025+", "1.33|1.4 D-4D|Electric"),
    Corolla: model("E10:1991–1997|E11:1997–2002|E12/E13:2001–2007|E14/E15:2006–2013|E17/E18:2013–2019|E210:2018+", "1.2 Turbo|1.4 D-4D|1.6 VVT-i|1.6 Valvematic|1.8 Hybrid|2.0 D-4D|2.0 Hybrid|GR Sport"),
    "Corolla Verso": model("E12:2001–2004|AR10:2004–2009", "1.6|1.8|2.0 D-4D|2.2 D-4D"),
    Verso: model("AR20:2009–2018", "1.6|1.6 D-4D|1.8|2.0 D-4D|2.2 D-4D"),
    "Corolla Cross": model("XG10:2022+", "1.8 Hybrid|2.0 Hybrid|AWD-i"),
    Celica: model("T18:1989–1993|T20:1993–1999|T23:1999–2006", "1.6|1.8|1.8 TS|2.0 GT"),
    MR2: model("SW20:1989–1999|ZZW30:1999–2007", "1.8|2.0"),
    Previa: model("XR10/XR20:1990–2000|XR30/XR40:2000–2006", "2.0 D-4D|2.4"),
    Auris: model("E15:2006–2012|E18:2012–2018", "1.33 Dual VVT-i|1.4 D-4D|1.6 Valvematic|1.8 Hybrid|2.0 D-4D"),
    Prius: model("XW20:II, 2003–2009|XW30:III, 2009–2015|XW50:IV, 2015–2022|XW60:V, 2023+", "1.5 Hybrid|1.8 Hybrid|2.0 Plug-in Hybrid"),
    Avensis: model("T22:I, 1997–2003|T25:II, 2003–2009|T27:III, 2009–2018", "1.6|1.8|2.0 D-4D|2.2 D-4D|2.2 D-CAT"),
    Camry: model("XV40:2006–2011|XV50:2011–2017|XV70:2017–2024|XV80:2024+", "2.5 Hybrid"),
    "C-HR": model("AX10:I, 2016–2023|AX20:II, 2023+", "1.2 Turbo|1.8 Hybrid|2.0 Hybrid|2.0 Plug-in Hybrid"),
    RAV4: model("XA10:1994–2000|XA20:2000–2005|XA30:2005–2012|XA40:2012–2019|XA50:2018–2025|XA60:2025+", "2.0 D-4D|2.0 Valvematic|2.2 D-4D|2.5 Hybrid|Plug-in Hybrid|AWD-i"),
    Highlander: model("XU70:2021+", "2.5 Hybrid AWD-i"),
    "Land Cruiser": model("J90:1996–2002|J120:2002–2009|J150:2009–2023|J200:2007–2021|J250:2024+|J300:2021+", "2.8 D-4D|3.0 D-4D|4.5 V8 D-4D"),
    Hilux: model("N140:1997–2005|AN10:2005–2015|AN120:2015+", "2.4 D-4D|2.5 D-4D|2.8 D-4D|3.0 D-4D"),
    "bZ4X": model("EA10:2022+", "FWD|AWD"),
    "GT86 / GR86": model("ZN6:GT86, 2012–2021|ZN8:GR86, 2021+", "2.0 Boxer|2.4 Boxer"),
    Supra: model("A80:1993–2002|A90:2019+", "2.0 Turbo|3.0"),
    "Proace / Proace City": model("K0:Proace, 2016+|K9:Proace City, 2019+", "1.5 D|2.0 D|Electric"),
  },
  Mazda: {
    "Mazda2": model("DY:2003–2007|DE:2007–2014|DJ/DL:2014+|KB:Hybrid, 2022+", "1.3 MZR|1.5 Skyactiv-G|1.5 Hybrid"),
    "Mazda3": model("BK:I, 2003–2009|BL:II, 2009–2013|BM/BN:III, 2013–2019|BP:IV, 2019+", "1.4|1.6 MZR|1.6 MZ-CD|1.8 Skyactiv-D|2.0 Skyactiv-G|e-Skyactiv X|2.2 Skyactiv-D"),
    "Mazda6": model("GG/GY:I, 2002–2007|GH:II, 2007–2012|GJ/GL:III, 2012–2023", "1.8|2.0 MZR|2.0 CD|2.0 Skyactiv-G|2.2 MZR-CD|2.2 Skyactiv-D|2.5 Skyactiv-G"),
    "323 / 626": model("BJ:323, 1998–2003|GF/GW:626, 1997–2002", "1.5|1.8|2.0 DITD"),
    "Mazda5": model("CR:2005–2010|CW:2010–2015", "1.6 MZ-CD|1.8|2.0 CD"),
    "CX-3": model("DK:2015–2021", "1.5 Skyactiv-D|1.8 Skyactiv-D|2.0 Skyactiv-G"),
    "CX-30": model("DM:2019+", "e-Skyactiv G|e-Skyactiv X|1.8 Skyactiv-D"),
    "MX-30": model("DR:2020+", "e-Skyactiv EV|R-EV"),
    "CX-5": model("KE:I, 2012–2017|KF:II, 2017–2025|III:2025+", "2.0 Skyactiv-G|2.2 Skyactiv-D|2.5 Skyactiv-G|AWD"),
    "CX-60": model("KH:2022+", "3.3 e-Skyactiv D|2.5 e-Skyactiv PHEV"),
    "CX-80": model("KL:2024+", "3.3 e-Skyactiv D|2.5 e-Skyactiv PHEV"),
    "CX-7": model("ER:2006–2012", "2.2 MZR-CD|2.3 DISI Turbo"),
    "MX-5": model("NA:1989–1997|NB:1998–2005|NC:2005–2015|ND:2015+", "1.5 Skyactiv-G|1.6|1.8|2.0 Skyactiv-G|RF"),
  },
  Honda: {
    Jazz: model("GD:I, 2001–2008|GE/GG:II, 2008–2015|GK:III, 2015–2020|GR:IV, 2020+", "1.2 i-DSI|1.2 i-VTEC|1.3 i-VTEC|1.4 i-DSI|1.5 e:HEV"),
    Civic: model("EG/EJ:V, 1991–1995|EK/EJ:VI, 1995–2000|EP/EU:VII, 2001–2005|FN/FK (VIII):VIII, 2005–2011|FK (IX):IX, 2011–2017|FC/FK (X):X, 2017–2021|FE/FL:XI, 2022+", "1.0 VTEC Turbo|1.4 i-VTEC|1.5 VTEC Turbo|1.6 i-DTEC|1.8 i-VTEC|2.0 e:HEV|2.2 i-CTDi|Type R"),
    Accord: model("CG/CH:VI, 1998–2002|CL/CM:VII, 2003–2008|CU/CW:VIII, 2008–2015", "1.8 i-VTEC|2.0 i-VTEC|2.2 i-CTDi|2.2 i-DTEC|2.4 i-VTEC"),
    "HR-V": model("GH:I, 1999–2006|RU:II, 2015–2021|RV:III, 2021+", "1.5 i-VTEC|1.6 i-DTEC|1.5 e:HEV"),
    "ZR-V": model("RZ:2023+", "2.0 e:HEV"),
    "CR-V": model("RD:I/II, 1995–2006|RE:III, 2007–2012|RM:IV, 2012–2018|RW/RT:V, 2018–2023|RS:VI, 2023+", "1.5 VTEC Turbo|1.6 i-DTEC|2.0 i-VTEC|2.2 i-CTDi|2.2 i-DTEC|2.0 e:HEV|e:PHEV"),
    "FR-V": model("BE:2004–2009", "1.7|1.8|2.2 i-CTDi"),
    "CR-Z": model("ZF1:2010–2016", "1.5 IMA Hybrid"),
    Insight: model("ZE2:2009–2014", "1.3 IMA Hybrid"),
    Prelude: model("BB1–BB9:1992–2001", "2.0|2.2 VTEC|2.3"),
    Legend: model("KA7–KA9:1991–2004|KB1:2006–2012", "3.2|3.5 V6|3.7 V6 SH-AWD"),
    "Honda e": model("ZC7:2020–2024", "100 kW|113 kW Advance"),
    "e:Ny1": model("I:2023+", "68,8 kWh"),
    S2000: model("AP1/AP2:1999–2009", "2.0 VTEC"),
  },
  Nissan: {
    Micra: model("K11:1992–2002|K12:2002–2010|K13:2010–2017|K14:2017–2023|VI:Electric, 2025+", "0.9 IG-T|1.0 IG-T|1.2|1.5 dCi|52 kWh"),
    Note: model("E11:I, 2006–2013|E12:II, 2013–2020", "1.2|1.4|1.5 dCi|1.6"),
    Pulsar: model("C13:2014–2018", "1.2 DIG-T|1.5 dCi"),
    Almera: model("N15:1995–2000|N16:2000–2006", "1.4|1.5|1.5 dCi|1.8|2.2 dCi"),
    Primera: model("P10:1990–1996|P11:1996–2002|P12:2002–2008", "1.6|1.8|1.9 dCi|2.0|2.2 dCi"),
    Juke: model("F15:I, 2010–2019|F16:II, 2019+", "1.0 DIG-T|1.2 DIG-T|1.5 dCi|1.6|1.6 Hybrid"),
    Qashqai: model("J10:I, 2006–2013|J11:II, 2013–2021|J12:III, 2021+", "1.2 DIG-T|1.3 DIG-T|1.5 dCi|1.6 dCi|1.7 dCi|2.0 dCi|e-POWER"),
    "X-Trail": model("T30:2001–2007|T31:2007–2013|T32:2014–2022|T33:2022+", "1.6 dCi|1.7 dCi|2.0 dCi|2.2 dCi|e-POWER|e-4ORCE"),
    Murano: model("Z50:2003–2007|Z51:2008–2014", "2.5 dCi|3.5 V6"),
    Pathfinder: model("R51:2005–2014", "2.5 dCi|3.0 V6 dCi"),
    Patrol: model("Y60:1987–1997|Y61:1997–2010", "2.8 TD|3.0 Di"),
    Pixo: model("D31S:2009–2013", "1.0"),
    Tiida: model("C11:2007–2011", "1.5 dCi|1.6|1.8"),
    "350Z / 370Z": model("Z33:350Z, 2002–2009|Z34:370Z, 2009–2020", "3.5 V6|3.7 V6"),
    "GT-R": model("R35:2007–2024", "3.8 V6 Biturbo"),
    Terrano: model("R20:1993–2006", "2.4|2.7 TD|3.0 Di"),
    Navara: model("D22:1997–2005|D40:2005–2015|D23:NP300, 2015–2022", "2.3 dCi|2.5 dCi|3.0 V6 dCi"),
    Leaf: model("ZE0:I, 2010–2017|ZE1:II, 2017–2025|III:2025+", "24 kWh|30 kWh|40 kWh|62 kWh"),
    Ariya: model("FE0:2022+", "63 kWh|87 kWh|e-4ORCE"),
    "NV200 / Townstar": model("M20:NV200, 2009–2021|XFK:Townstar, 2021+", "1.3 TCe|1.5 dCi|EV"),
  },
  Suzuki: {
    Alto: model("HA12:1998–2008|GF:2009–2014", "1.0|1.1"),
    Ignis: model("FH:2000–2003|MH:2003–2008|MF:2016+", "1.2 Dualjet|1.2 Hybrid|1.3|AllGrip"),
    Splash: model("EX:2008–2014", "1.0|1.2|1.3 DDiS"),
    Swift: model("SF/MA:1989–2004|MZ/EZ:2004–2010|FZ/NZ:2010–2017|AZ:2017–2024|AOL:2024+", "1.2 Dualjet|1.2 Hybrid|1.3|1.3 DDiS|1.4 Boosterjet Sport"),
    Baleno: model("EG:1995–2002|EW:2015–2020", "1.0 Boosterjet|1.2 Dualjet|1.2 Hybrid"),
    SX4: model("GY:2006–2014", "1.5|1.6 VVT|1.6 DDiS|1.9 DDiS|2.0 DDiS|4x4"),
    "S-Cross": model("JY:2013–2021|II:2021+", "1.0 Boosterjet|1.4 Boosterjet|1.4 Hybrid|1.5 Hybrid|1.6 DDiS|AllGrip"),
    Vitara: model("ET/TA:1988–2005|LY:2015+", "1.0 Boosterjet|1.4 Boosterjet|1.5 Hybrid|1.6 VVT|1.6 DDiS|AllGrip"),
    "Grand Vitara": model("FT/GT:1998–2005|JT:2005–2015", "1.9 DDiS|2.0|2.4"),
    "Wagon R+": model("EM:1997–2000|MM:2000–2006", "1.0|1.2|1.3|1.3 DDiS"),
    Liana: model("ER:2001–2007", "1.3|1.4 DDiS|1.6"),
    Kizashi: model("FR:2009–2014", "2.4"),
    Samurai: model("SJ:1988–2004", "1.3|1.9 D"),
    Jimny: model("JB23/JB33/JB43:III, 1998–2018|JB64/JB74:IV, 2018+", "1.3 VVT|1.5 DDiS|1.5 VVT"),
    Swace: model("E210:2020+", "1.8 Hybrid"),
    Across: model("XA50:2020+", "2.5 Plug-in Hybrid"),
  },
  Mitsubishi: {
    "Space Star": model("DG:1998–2005|A00:2012–2024", "1.0 MIVEC|1.2 MIVEC|1.3|1.9 DI-D"),
    Colt: model("CJ0:1996–2003|Z30:2004–2012|VII:2023+", "1.0 Turbo|1.1 MPI|1.3 MPI|1.5 DI-D|Hybrid"),
    Lancer: model("CS:2000–2007|CY:VIII/IX, 2007–2017", "1.5|1.6|1.8|2.0 DI-D|Evolution"),
    "Galant": model("E50:1992–1996|EA0:1996–2004", "1.8|2.0|2.0 TD|2.4 GDI|2.5 V6"),
    "Grandis": model("NA4W:2003–2011", "2.0 DI-D|2.4"),
    "Space Wagon": model("N30:1991–1998|N80:1998–2004", "2.0|2.4 GDI"),
    Carisma: model("DA:1995–2004", "1.6|1.8 GDI|1.9 DI-D"),
    ASX: model("GA0:I, 2010–2022|II:2023+", "1.0 T|1.3 Turbo|1.6 MIVEC|1.8 DI-D|2.2 DI-D|Hybrid"),
    "Eclipse Cross": model("GK:2017+", "1.5 Turbo|2.2 DI-D|PHEV"),
    Outlander: model("CU:2003–2006|CW:2006–2012|GF/GG:2012–2021|GN:2021+", "2.0 MIVEC|2.0 DI-D|2.2 DI-D|2.4 PHEV"),
    Pajero: model("V20:1991–2000|V60:2000–2006|V80:2006–2021|Pinin:1999–2007", "2.5 TD|2.8 TD|3.2 DI-D"),
    "L200": model("K74:1996–2006|KA/KB:2006–2015|KJ/KK/KL:2015–2024|LC:2024+", "2.4 DI-D|2.5 DI-D"),
  },
  Subaru: {
    Justy: model("JMA:1995–2003|G3X:2003–2007|M300:2007–2011", "1.0|1.3|1.5 AWD"),
    Impreza: model("GC/GF:1992–2000|GD/GG:2000–2007|GE/GH:2007–2011|GP/GJ:2011–2016|GK/GT:2016–2023|GU:2023+", "1.5|1.6 Boxer|2.0 Boxer|2.0D|WRX STI|e-Boxer"),
    Legacy: model("BD/BG:1993–1999|BE/BH:1998–2003|BL/BP:2003–2009|BM/BR:2009–2014", "2.0 Boxer|2.0D|2.5 Boxer"),
    Levorg: model("VM:2015–2020", "1.6 DIT|2.0"),
    Outback: model("BH:1998–2003|BP:2003–2009|BR:2009–2014|BS:2015–2020|BT:2020+", "2.0D|2.5 Boxer|3.0R|3.6R"),
    Forester: model("SF:1997–2002|SG:2002–2008|SH:2008–2013|SJ:2013–2018|SK:2018–2024|SL:2024+", "2.0 Boxer|2.0D|2.0 XT|e-Boxer"),
    XV: model("GP:2011–2017|GT:2017–2023", "1.6 Boxer|2.0 Boxer|2.0D|e-Boxer"),
    Crosstrek: model("GU:2023+", "2.0 e-Boxer"),
    BRZ: model("ZC6:2012–2020|ZD8:2021+", "2.0|2.4"),
    Solterra: model("XEAM10/YEAM15:2022+", "FWD|AWD"),
  },
  Lexus: {
    CT: model("ZWA10:2011–2022", "200h"),
    IS: model("XE10:I, 1999–2005|XE20:II, 2005–2013|XE30:III, 2013–2020", "200|220d|250|300h"),
    GS: model("S160:1997–2004|S190:2005–2011|L10:2012–2020", "300|300h|450h"),
    ES: model("XZ10:2018+", "300h"),
    LS: model("XF30:2000–2006|XF40:2006–2017|XF50:2017+", "430|460|500h|600h"),
    LBX: model("AY10:2023+", "1.5 Hybrid|AWD"),
    UX: model("ZA10:2018+", "250h|300h|300e"),
    NX: model("AZ10:I, 2014–2021|AZ20:II, 2021+", "200t|300h|350h|450h+"),
    RX: model("XU30:2003–2008|AL10:2009–2015|AL20:2015–2022|ALA10:2022+", "350|350h|400h|450h|450h+|500h"),
    RZ: model("XEBM15:2023+", "300e|450e"),
  },
  Infiniti: {
    Q30: model("H15:2015–2019", "1.5d|1.6t|2.0t|2.2d"),
    QX30: model("H15:2016–2019", "2.2d AWD"),
    Q50: model("V37:2013–2019", "2.0t|2.2d|3.5 Hybrid"),
    Q70: model("Y51:2010–2019", "2.2d|3.0d|3.5 Hybrid"),
    "FX / QX70": model("S50:2003–2008|S51:2008–2017", "3.0d|3.7 V6|5.0 V8"),
    "EX / QX50": model("J50:2008–2017|P71A:2018+", "3.0d|3.7 V6"),
  },
  Daihatsu: {
    Cuore: model("L501:1994–1998|L701:1998–2003|L251:2003–2007|L276:2007–2012", "0.8|1.0"),
    Sirion: model("M100:1998–2004|M300:2005–2011", "1.0|1.3|1.5"),
    Materia: model("M400:2006–2011", "1.3|1.5"),
    Terios: model("J100:1997–2005|J200:2006–2012", "1.3|1.5 4WD"),
    Feroza: model("F300:1988–1999", "1.6 16V"),
  },
  Isuzu: {
    "D-Max": model("RA/RC:I, 2002–2012|RT:II, 2012–2020|RG:III, 2020+", "1.9 Ddi|2.5 TD|3.0 TD"),
    Trooper: model("UBS:1991–2002", "3.0 DTI|3.1 TD"),
  },

  // === KOREAN ===
  Hyundai: {
    Atos: model("MX:1998–2008", "1.0|1.1"),
    i10: model("PA:I, 2007–2013|IA/BA:II, 2013–2019|AC3:III, 2019+", "1.0 MPI|1.1|1.2 MPI|N Line"),
    Getz: model("TB:2002–2009", "1.1|1.3|1.4|1.5 CRDi"),
    i20: model("PB:I, 2008–2014|GB/IB:II, 2014–2020|BC3:III, 2020+", "1.0 T-GDi|1.2 MPI|1.4|1.4 CRDi|N Line|N"),
    Bayon: model("BC3:2021+", "1.0 T-GDi|1.2 MPI"),
    Accent: model("X3:1994–1999|LC:1999–2005|MC:2005–2010|RB:2010–2017", "1.3|1.4|1.5 CRDi|1.6"),
    i30: model("FD:I, 2007–2012|GD:II, 2011–2017|PD:III, 2017+", "1.0 T-GDi|1.4|1.4 T-GDi|1.5 T-GDi|1.6 CRDi|N Line|N"),
    Elantra: model("XD:2000–2006|HD:2006–2010|MD:2010–2015|AD:2015–2020|CN7:2020+", "1.6|1.6 CRDi|1.6 Hybrid"),
    i40: model("VF:2011–2019", "1.6 GDi|1.7 CRDi|2.0 GDi"),
    Sonata: model("EF:1998–2004|NF:2004–2009|YF:2009–2014|LF:2014–2019|DN8:2019+", "2.0 CRDi|2.0|2.4"),
    ix20: model("JC:2010–2019", "1.4|1.4 CRDi|1.6|1.6 CRDi"),
    Tucson: model("JM:I, 2004–2009|LM:ix35, 2009–2015|TL:III, 2015–2020|NX4:IV, 2020+", "1.6 GDi|1.6 T-GDi|1.6 CRDi|1.7 CRDi|2.0 CRDi|Hybrid|Plug-in Hybrid"),
    Kona: model("OS:I, 2017–2023|SX2:II, 2023+", "1.0 T-GDi|1.6 CRDi|1.6 T-GDi|Hybrid|Electric"),
    "Santa Fe": model("SM:2000–2006|CM:2006–2012|DM:2012–2018|TM:2018–2023|MX5:2023+", "2.0 CRDi|2.2 CRDi|Hybrid|Plug-in Hybrid"),
    Terracan: model("HP:2001–2007", "2.9 CRDi|3.5 V6"),
    Ioniq: model("AE:2016–2022", "Hybrid|Plug-in Hybrid|Electric"),
    "IONIQ 5": model("NE:2021+", "58 kWh|63 kWh|72,6 kWh|77,4 kWh|84 kWh|N"),
    "IONIQ 6": model("CE:2022+", "53 kWh|77,4 kWh|AWD"),
    Inster: model("I:2024+", "42 kWh|49 kWh"),
    Coupe: model("RD:1996–2001|GK:2001–2009", "1.6|2.0|2.7 V6"),
    Veloster: model("FS:2011–2018", "1.6 GDi|1.6 T-GDi"),
    Matrix: model("FC:2001–2010", "1.5 CRDi|1.6|1.8"),
    Trajet: model("FO:1999–2008", "2.0|2.0 CRDi"),
    Galloper: model("I/II:1991–2003", "2.5 TD|3.0 V6"),
    "H-1 / Staria": model("TQ:H-1, 2008–2021|US4:Staria, 2021+", "2.2 CRDi|2.5 CRDi|Hybrid"),
  },
  Kia: {
    Picanto: model("SA:I, 2004–2011|TA:II, 2011–2017|JA:III, 2017+", "1.0 MPI|1.1|1.2 MPI|GT-Line"),
    Rio: model("DC:2000–2005|JB:2005–2011|UB:2011–2017|YB:2017–2023", "1.0 T-GDi|1.1 CRDi|1.2 MPI|1.4|1.4 CRDi"),
    Stonic: model("YB CUV:2017+", "1.0 T-GDi|1.2 MPI|1.4|1.6 CRDi"),
    Ceed: model("ED:cee'd I, 2006–2012|JD:cee'd II, 2012–2018|CD:Ceed III, 2018+", "1.0 T-GDi|1.4|1.4 T-GDi|1.5 T-GDi|1.6 CRDi|Plug-in Hybrid|GT"),
    ProCeed: model("ED:2008–2012|JD:2013–2018|CD:Shooting Brake, 2019+", "1.4 T-GDi|1.5 T-GDi|1.6 CRDi|1.6 T-GDi GT"),
    XCeed: model("CD:2019+", "1.0 T-GDi|1.5 T-GDi|1.6 CRDi|1.6 T-GDi|Plug-in Hybrid"),
    Optima: model("TF:2010–2015|JF:2015–2020", "1.6 CRDi|1.7 CRDi|2.0|Plug-in Hybrid"),
    Stinger: model("CK:2017–2023", "2.0 T-GDi|2.2 CRDi|3.3 V6 T-GDi"),
    Soul: model("AM:2008–2014|PS:2014–2019|SK3:2019+", "1.6 GDi|1.6 CRDi|EV"),
    Venga: model("YN:2009–2019", "1.4|1.4 CRDi|1.6|1.6 CRDi"),
    Carens: model("FC:1999–2006|UN:2006–2012|RP:2013–2018", "1.6 GDi|1.7 CRDi|2.0 CRDi"),
    Niro: model("DE:I, 2016–2022|SG2:II, 2022+", "Hybrid|Plug-in Hybrid|EV"),
    Sportage: model("NB:1993–2002|KM:II, 2004–2010|SL:III, 2010–2015|QL:IV, 2015–2021|NQ5:V, 2021+", "1.6 GDi|1.6 T-GDi|1.6 CRDi|1.7 CRDi|2.0 CRDi|Hybrid|Plug-in Hybrid"),
    Sorento: model("BL:2002–2009|XM:2009–2014|UM:2014–2020|MQ4:2020+", "2.2 CRDi|2.5 CRDi|Hybrid|Plug-in Hybrid"),
    EV3: model("SV:2024+", "58,3 kWh|81,4 kWh"),
    EV6: model("CV:2021+", "Standard Range|Long Range|AWD|GT"),
    Sephia: model("FA:1992–2000", "1.5|1.6|1.8"),
    Shuma: model("FB:1997–2004", "1.5|1.6|1.8"),
    Magentis: model("MS:2000–2005|MG:2005–2010", "2.0|2.0 CRDi|2.7 V6"),
    Carnival: model("KV-II:1999–2006|VQ:2006–2014", "2.2 CRDi|2.9 CRDi|2.7 V6"),
    EV9: model("MV:2023+", "RWD|AWD|GT-Line"),
  },
  "SsangYong / KGM": {
    Tivoli: model("X100:2015+", "1.2 Turbo|1.5 Turbo|1.6|1.6 Diesel|XLV"),
    Korando: model("KJ:1996–2006|C200:2010–2019|C300:2019+", "1.5 Turbo|1.6 Diesel|2.0 Diesel|2.2 Diesel|e-Motion"),
    Torres: model("J100:2022+", "1.5 Turbo|EVX|Hybrid"),
    Actyon: model("CJ:2005–2011|II:2024+", "1.5 Turbo|2.0 Xdi"),
    Kyron: model("D100:2005–2014", "2.0 Xdi|2.7 Xdi"),
    Rexton: model("Y200/Y250:I/II, 2001–2017|Y400/Y450:2017+", "2.0 Xdi|2.2 Diesel|2.7 Xdi|4WD"),
    Musso: model("FJ:1993–2005|Q200/Q250:2018+", "2.2 Diesel|Grand"),
  },
  Daewoo: {
    Tico: model("I:1991–2001", "0.8"),
    Matiz: model("M100/M150:1998–2005", "0.8|1.0"),
    Kalos: model("T200:2002–2005", "1.2|1.4"),
    Lanos: model("T100/T150:1997–2008", "1.4|1.5|1.6"),
    Nubira: model("J100/J150:1997–2003|J200:2003–2005", "1.6|1.8|2.0"),
    Lacetti: model("J200:2003–2005", "1.4|1.6|1.8"),
    Leganza: model("V100:1997–2002", "2.0|2.2"),
  },
  Genesis: {
    G70: model("IK:2017+", "2.0 T|2.2 D|3.3 T|Shooting Brake"),
    G80: model("DH:2016–2020|RG3:2020+", "2.5 T|3.5 T|Electrified"),
    GV60: model("JW:2021+", "RWD|AWD|Performance"),
    GV70: model("JK1:2021+", "2.2 D|2.5 T|Electrified"),
    GV80: model("JX1:2020+", "3.0 D|3.5 T"),
  },

  // === SWEDISH & BRITISH ===
  Volvo: {
    "440 / 460 / 480": model("1986–1996", "1.7|1.8|1.9 TD|2.0"),
    "740 / 940 / 960": model("1984–1998", "2.0|2.3|2.4 TD|2.5|3.0"),
    "850": model("LS/LW:1991–1997", "2.0|2.4|2.5 TDI|T5"),
    "S40": model("VS:I, 1995–2004|MS:II, 2004–2012", "1.6|1.6 D|1.8|1.9 D|2.0 D|D2|D3|D4|T5"),
    "V40": model("VW:I, 1995–2004|MV:II, 2012–2019", "1.6 D|1.9 D|D2|D3|D4|T2|T3|T4|Cross Country"),
    "C40 / EC40": model("CMA:2021+", "Single Motor|Twin Motor"),
    V50: model("P1:2004–2012", "1.6 D|D2|D3|D4|2.0 D|2.4"),
    C30: model("P1:2006–2013", "1.6 D|D2|D3|2.0 D|T5"),
    C70: model("I:1997–2005|II:2006–2013", "2.0 D|D3|D4|2.4|T5"),
    S60: model("P2:I, 2000–2009|P3:II, 2010–2018|SPA:III, 2019+", "2.4 D|D3|D4|D5|B4|T5|T8 Recharge"),
    V60: model("P3:I, 2010–2018|SPA:II, 2018+", "D2|D3|D4|D5|B3|B4|T6 Recharge|T8 Recharge|Cross Country"),
    "V70 / XC70": model("I:1996–2000|P2:II, 2000–2007|P3:III, 2007–2016", "2.4 D|D3|D4|D5|2.5 T"),
    S80: model("I:1998–2006|II:2006–2016", "2.0 D|2.4 D|D3|D4|D5|3.2"),
    "S90 / V90": model("SPA:2016+", "D3|D4|D5|B4|B5|T8 Recharge|Cross Country"),
    EX30: model("SEA2:2023+", "Single Motor|Single Motor Extended Range|Twin Motor Performance"),
    XC40: model("CMA:2017+", "D3|D4|B3|B4|T3|T4 Recharge|T5 Recharge|EX40 Electric"),
    XC60: model("P3:I, 2008–2017|SPA:II, 2017+", "2.4 D|D3|D4|D5|B4|B5|T6 Recharge|T8 Recharge"),
    XC90: model("P2:I, 2002–2014|SPA:II, 2015+", "2.4 D5|D5|B5|T6|T8 Recharge"),
    EX90: model("SPA2:2024+", "Single Motor|Twin Motor|Performance"),
  },
  Saab: {
    "900": model("NG:1993–1998", "2.0i|2.0 Turbo|2.3i"),
    "9000": model("I:1985–1998", "2.0 Turbo|2.3 Turbo|Aero"),
    "9-3": model("YS3D:I, 1998–2002|YS3F:II, 2002–2014", "1.8t|1.9 TiD|1.9 TTiD|2.0t|2.2 TiD|Aero"),
    "9-5": model("YS3E:I, 1997–2010|YS3G:II, 2010–2012", "1.9 TiD|2.0 TiD|2.0t|2.3t|3.0 TiD|Aero"),
  },
  "Land Rover": {
    Defender: model("L316:1983–2016|L663:2020+", "90|110|130|2.4 TD4|2.5 Td5|D200|D250|D300|P400|P400e"),
    Freelander: model("L314:I, 1997–2006|L359:II, 2006–2014", "2.0 TD4|2.2 TD4|2.2 SD4"),
    Discovery: model("L318:I/II, 1989–2004|L319:III/IV, 2004–2016|L462:V, 2017+", "2.5 Td5|2.7 TDV6|3.0 SDV6|D250|D300"),
    "Discovery Sport": model("L550:2014+", "2.0 TD4|D150|D180|D200|P300e"),
    "Range Rover Evoque": model("L538:I, 2011–2018|L551:II, 2018+", "2.2 SD4|TD4|D150|D180|D200|P300e"),
    "Range Rover Velar": model("L560:2017+", "D180|D200|D240|D300|P400e"),
    "Range Rover Sport": model("L320:I, 2005–2013|L494:II, 2013–2022|L461:III, 2022+", "2.7 TDV6|3.0 TDV6|SDV6|3.6 TDV8|D300|D350|P460e|SVR"),
    "Range Rover": model("P38A:II, 1994–2002|L322:III, 2002–2012|L405:IV, 2012–2021|L460:V, 2021+", "TDV6|3.0 TDV6|4.4 SDV8|D350|P460e|P530|Autobiography"),
  },
  Jaguar: {
    "X-Type": model("X400:2001–2009", "2.0 D|2.2 D|2.5 V6|3.0 V6"),
    "S-Type": model("X200:1999–2008", "2.7 D|3.0 V6|4.2 V8"),
    XE: model("X760:2015–2024", "2.0d|D180|D200|P250"),
    XF: model("X250:I, 2007–2015|X260:II, 2015–2024", "2.0d|2.2d|2.7d|3.0d|P250"),
    XJ: model("X308:1997–2003|X350:2003–2009|X351:2009–2019", "2.7 D|3.0 D|5.0 V8"),
    "E-Pace": model("X540:2017–2024", "D150|D180|D200|P250|P300e"),
    "F-Pace": model("X761:2016+", "2.0d|D180|D200|3.0d|D300|P400e|SVR"),
    "I-Pace": model("X590:2018–2024", "EV320|EV400"),
    "F-Type": model("X152:2013–2024", "P300|3.0 V6|P450|5.0 V8 R"),
  },
  "Aston Martin": {
    Vantage: model("I:2005–2018|II:2018+", "V8|V12|F1 Edition"),
    "DB9 / DBS": model("DB9:2004–2016|DBS:2007–2023", "5.9 V12|5.2 V12"),
    DB11: model("I:2016–2023", "V8|V12|AMR"),
    DB12: model("I:2023+", "4.0 V8"),
    DBX: model("I:2020+", "V8|707"),
  },
  Bentley: {
    "Continental GT": model("3W:I/II, 2003–2018|3S:III, 2018–2024|IV:2024+", "V8|W12|Speed|Hybrid"),
    "Flying Spur": model("4W:I/II, 2005–2019|ZG:III, 2019–2024|IV:2024+", "V8|W12|Hybrid"),
    Bentayga: model("4V:2015+", "4.0 V8 Diesel|V8|W12|Hybrid|EWB"),
  },
  "Rolls-Royce": {
    Ghost: model("RR4:I, 2009–2020|RR21:II, 2020+", "6.6 V12|6.75 V12|Extended|Black Badge"),
    "Wraith / Dawn": model("RR5:Wraith, 2013–2023|RR6:Dawn, 2015–2023", "6.6 V12"),
    Phantom: model("RR01:VII, 2003–2017|RR11:VIII, 2017+", "6.75 V12|Extended"),
    Cullinan: model("RR31:2018+", "6.75 V12|Black Badge"),
    Spectre: model("RR25:2023+", "Electric|Black Badge"),
  },
  Rover: {
    "25 / 200": model("RF:200, 1995–1999|25:1999–2005", "1.4 16V|1.6|2.0 IDT"),
    "45 / 400": model("HH-R:400, 1995–2000|45:1999–2005", "1.4|1.6|2.0 IDT"),
    "75": model("RJ:1999–2005", "1.8|1.8 T|2.0 CDT|2.0 CDTi|2.5 V6"),
    Streetwise: model("I:2003–2005", "1.4|2.0 TD"),
  },
  MG: {
    "ZR / ZS / ZT": model("2001–2005", "1.4|1.8|2.0 CDTi|2.5 V6"),
    MG3: model("II:2013–2024|III:2024+", "1.5|Hybrid+"),
    MG4: model("EH32:2022+", "Standard|Comfort|Luxury|XPower"),
    MG5: model("EP22:Electric, 2020+", "Standard Range|Long Range"),
    ZS: model("ZS11:I, 2017–2024|II:2024+", "1.0 T-GDi|1.5 VTi|EV|Hybrid+"),
    HS: model("AS23:I, 2018–2024|II:2024+", "1.5 T-GDi|Plug-in Hybrid|Hybrid+"),
    "Marvel R": model("I:2021–2024", "Comfort|Luxury|Performance"),
    Cyberster: model("I:2024+", "Trophy|GT"),
  },
  Lotus: {
    Elise: model("S1:1996–2001|S2:2001–2010|S3:2011–2021", "1.6|1.8|Cup"),
    Exige: model("S2:2004–2011|S3:2012–2021", "1.8|3.5 V6"),
    Evora: model("I:2009–2021", "3.5 V6|400|GT"),
    Emira: model("Type 131:2022+", "2.0 Turbo|3.5 V6"),
    Eletre: model("Type 132:2023+", "600|S|R"),
    Emeya: model("Type 133:2024+", "600|S|R"),
  },
  Vauxhall: {
    Corsa: model("C:2000–2006|D:2006–2014|E:2014–2019|F:2019+", "1.2|1.2 Turbo|1.3 CDTI|Electric"),
    Astra: model("G:1998–2004|H:2004–2010|J:2009–2015|K:2015–2021|L:2021+", "1.2 Turbo|1.6 CDTI|1.7 CDTI|Plug-in Hybrid"),
    Insignia: model("A:2008–2017|B:2017–2022", "1.6 CDTI|2.0 CDTI|GSi"),
    Mokka: model("A:2012–2019|B:2020+", "1.2 Turbo|1.6 CDTI|Electric"),
  },
  Ineos: {
    Grenadier: model("I:2022+", "3.0 Benzin|3.0 Dizel"),
    Quartermaster: model("I:2023+", "3.0 Benzin|3.0 Dizel"),
  },
  McLaren: {
    "570S / 600LT": model("Sports Series:2015–2021", "540C|570S|600LT"),
    "720S / 750S": model("Super Series:2017+", "720S|750S|765LT"),
    Artura: model("I:2022+", "3.0 V6 Hybrid"),
    "GT / GTS": model("I:2019+", "4.0 V8"),
  },

  // === AMERICAN ===
  Ford: {
    Ka: model("I:1996–2008|II:2008–2016|Ka+:2016–2020", "1.2|1.3|1.3 TDCi"),
    Fiesta: model("Mk4/Mk5:1995–2002|Mk6:2002–2008|Mk7:2008–2017|Mk8:2017–2023", "1.0 EcoBoost|1.1|1.25|1.4|1.4 TDCi|1.5 TDCi|1.6 TDCi|ST"),
    Fusion: model("JU2:2002–2012", "1.4|1.4 TDCi|1.6|1.6 TDCi"),
    "B-Max": model("I:2012–2017", "1.0 EcoBoost|1.4|1.5 TDCi|1.6 TDCi"),
    Escort: model("Mk5/Mk6/Mk7:1990–2000", "1.4|1.6 16V|1.8 TD"),
    Focus: model("Mk1:1998–2004|Mk2:2004–2011|Mk3:C346, 2010–2018|Mk4:C519, 2018–2025", "1.0 EcoBoost|1.4|1.5 EcoBoost|1.5 EcoBlue|1.6|1.6 TDCi|1.8 TDCi|2.0 TDCi|2.0 EcoBlue|ST|RS"),
    "C-Max": model("I:2003–2010|II:2010–2019", "1.0 EcoBoost|1.5 TDCi|1.6 TDCi|2.0 TDCi|Grand C-Max"),
    Mondeo: model("Mk1/Mk2:1993–2000|Mk3:2000–2007|Mk4:2007–2014|Mk5:2014–2022", "1.5 EcoBoost|1.6 TDCi|1.8 TDCi|2.0 TDCi|2.0 EcoBlue|2.2 TDCi|Hybrid"),
    Puma: model("I:1997–2002, Coupé|II:2019+, crossover", "1.0 EcoBoost|1.0 EcoBoost mHEV|1.5 EcoBlue|ST|Gen-E"),
    EcoSport: model("II:2012–2022", "1.0 EcoBoost|1.5 TDCi|1.5 EcoBlue"),
    Kuga: model("I:2008–2012|II:2012–2019|III:2019+", "1.5 EcoBoost|1.5 TDCi|1.5 EcoBlue|2.0 TDCi|2.0 EcoBlue|2.5 FHEV|2.5 PHEV"),
    Edge: model("II:2015–2021", "2.0 TDCi|2.0 EcoBlue AWD"),
    Explorer: model("VI:2020+|Electric:2024+", "3.0 EcoBoost PHEV|52 kWh|77 kWh|79 kWh"),
    "S-Max": model("I:2006–2014|II:2015–2023", "1.5 EcoBoost|1.8 TDCi|2.0 TDCi|2.0 EcoBlue|2.2 TDCi|2.5 Hybrid"),
    Galaxy: model("I:1995–2006|II:2006–2015|III:2015–2023", "1.9 TDI|2.0 TDCi|2.0 EcoBlue|2.5 Hybrid"),
    Mustang: model("V:2005–2014|VI:2015–2023|VII:2024+", "2.3 EcoBoost|3.7 V6|4.6 V8|5.0 V8 GT"),
    "Mustang Mach-E": model("I:2021+", "Standard Range|Extended Range|AWD|GT"),
    Ranger: model("T6:2011–2022|T6.2:2023+", "2.0 EcoBlue|2.2 TDCi|3.0 V6 Diesel|3.2 TDCi|Raptor"),
    Probe: model("II:1992–1997", "2.0 16V|2.5 V6"),
    Cougar: model("EC_:1998–2002", "2.0 16V|2.5 V6"),
    Scorpio: model("I/II:1985–1998", "2.0|2.5 TD|2.9 V6"),
    Maverick: model("UDS:1993–1998|1N2:2001–2007", "2.0|2.3|2.7 TD|3.0 V6"),
    "Tourneo Courier": model("B460:I, 2014–2023|II:2024+", "1.0 EcoBoost|1.5 TDCi|E-Tourneo"),
    "Tourneo Connect": model("I:2002–2013|II:2013–2022|III:2022+", "1.5 EcoBoost|1.5 TDCi|1.8 TDCi|2.0 EcoBlue"),
    "Transit / Custom": model("I/II:2000–2013|V362/V363:2013+", "2.0 EcoBlue|2.2 TDCi|2.4 TDCi|Custom|Nugget"),
  },
  Jeep: {
    Avenger: model("JJ:2022+", "1.2 Turbo|e-Hybrid|Electric|4xe"),
    Renegade: model("BU:2014+", "1.0 Turbo|1.3 Turbo|1.5 e-Hybrid|1.6 MultiJet|2.0 MultiJet|4xe"),
    Compass: model("MK49:I, 2006–2016|MP:II, 2017–2025|III:2025+", "1.3 Turbo|1.5 e-Hybrid|1.6 MultiJet|2.0 MultiJet|2.2 CRD|4xe"),
    Patriot: model("MK74:2007–2016", "2.0 CRD|2.2 CRD"),
    Cherokee: model("XJ:1984–2001|KJ:2001–2007|KK:2008–2013|KL:2014–2023", "2.0 MultiJet|2.2 MultiJet|2.5 CRD|2.8 CRD|3.2 V6"),
    "Grand Cherokee": model("ZJ:1993–1998|WJ:1999–2004|WK:2005–2010|WK2:2011–2021|WL:2021+", "2.7 CRD|3.0 CRD|3.0 MultiJet|3.6 V6|5.7 HEMI|4xe|SRT"),
    Wrangler: model("YJ:1987–1995|TJ:1996–2006|JK:2007–2018|JL:2018+", "2.0 Turbo|2.2 MultiJet|2.8 CRD|3.6 V6|4xe|Rubicon"),
    Gladiator: model("JT:2020+", "3.0 V6 MultiJet|3.6 V6"),
  },
  Tesla: {
    "Model 3": model("I:2017–2023|Highland:2023+", "RWD|Long Range|Performance"),
    "Model Y": model("I:2020–2025|Juniper:2025+", "RWD|Long Range|Performance"),
    "Model S": model("I:2012–2021|I facelift:2021+", "75D|85|90D|100D|Long Range|Plaid"),
    "Model X": model("I:2015–2021|I facelift:2021+", "75D|90D|100D|Long Range|Plaid"),
    Cybertruck: model("I:2024+", "AWD|Cyberbeast"),
    Roadster: model("I:2008–2012", "2.0|2.5|Sport"),
  },
  Chevrolet: {
    Spark: model("M200:2005–2009|M300:2009–2015|M400:2015–2022", "0.8|1.0|1.2"),
    Aveo: model("T200/T250:2002–2011|T300:2011–2016", "1.2|1.3 Diesel|1.4|1.6"),
    Lacetti: model("J200:2004–2011", "1.4|1.6|1.8|2.0 D"),
    Cruze: model("J300:2008–2016", "1.4 Turbo|1.6|1.7 D|1.8|2.0 VCDi"),
    Trax: model("I:2013–2016", "1.4 Turbo|1.6|1.7 D"),
    Orlando: model("J309:2011–2018", "1.4 Turbo|1.8|2.0 VCDi"),
    Captiva: model("C100/C140:2006–2016", "2.0 VCDi|2.2 VCDi|2.4"),
    Camaro: model("V:2009–2015|VI:2016–2024", "2.0 Turbo|3.6 V6|6.2 V8 SS|ZL1"),
    Tahoe: model("III:2007–2014|IV:2015–2020|V:2021+", "5.3 V8|6.2 V8"),
  },
  Chrysler: {
    "PT Cruiser": model("PT:2000–2010", "1.6|2.0|2.2 CRD"),
    "300C": model("LX:2004–2010|LD:2011–2015", "3.0 CRD|3.5 V6|5.7 HEMI"),
    Sebring: model("JR:2001–2006|JS:2007–2010", "2.0 CRD|2.4|2.7 V6"),
    "Voyager / Grand Voyager": model("RG:2001–2007|RT:2008–2016", "2.5 CRD|2.8 CRD|3.3 V6"),
    Crossfire: model("ZH:2003–2008", "3.2 V6|SRT-6"),
  },
  Dodge: {
    Caliber: model("PM:2006–2012", "1.8|2.0 CRD|2.2 CRD"),
    Journey: model("JC:2008–2015", "2.0 CRD|2.4|3.6 V6"),
    Nitro: model("KA:2007–2012", "2.8 CRD|3.7 V6"),
    Challenger: model("LC/LA:2008–2023", "3.6 V6|5.7 HEMI|6.4 SRT|SRT Hellcat"),
    Charger: model("LX:2006–2010|LD:2011–2023|LB:2024+", "3.6 V6|5.7 HEMI|6.4 SRT|Daytona"),
    Durango: model("WD:2011+", "3.6 V6|5.7 HEMI|SRT"),
  },
  Cadillac: {
    BLS: model("I:2005–2010", "1.9 D|2.0 T"),
    CTS: model("I:2003–2007|II:2008–2014|III:2014–2019", "2.0 T|3.6 V6|CTS-V"),
    SRX: model("I:2004–2009|II:2010–2016", "3.0 V6|3.6 V6|4.6 V8"),
    XT4: model("I:2018+", "2.0 T|2.0 D"),
    XT5: model("I:2016+", "2.0 T|3.6 V6"),
    Escalade: model("III:2007–2014|IV:2015–2020|V:2021+", "6.2 V8|ESV"),
    Lyriq: model("I:2023+", "AWD"),
  },
  Corvette: {
    C5: model("1997–2004", "5.7 V8|Z06"),
    C6: model("2005–2013", "6.0 V8|6.2 V8|Z06"),
    C7: model("2014–2019", "6.2 V8 Stingray|Z06"),
    C8: model("2020+", "6.2 V8 Stingray|E-Ray|Z06"),
  },
  RAM: {
    "1500": model("DS:IV, 2009–2018|DT:V, 2019+", "3.0 EcoDiesel|5.7 HEMI|3.0 Hurricane|TRX"),
    "2500": model("DJ:IV, 2010–2018|DJ facelift:2019+", "6.4 HEMI|6.7 Cummins"),
    "3500": model("D2:IV, 2010–2018|V:2019+", "6.7 Cummins"),
  },
  Hummer: {
    H2: model("I:2002–2009", "6.0 V8|6.2 V8"),
    H3: model("I:2005–2010", "3.5|3.7|5.3 V8"),
    "Hummer EV": model("I:2022+", "2X|3X"),
  },
  GMC: {
    Sierra: model("1500:2007+", "3.0 Duramax|5.3 V8|6.2 V8|Denali"),
    Yukon: model("IV:2015–2020|V:2021+", "5.3 V8|6.2 V8|Denali"),
  },

  // === NEW EV & CHINESE BRANDS IN HR ===
  BYD: {
    "Dolphin Surf": model("I:2025+", "Active|Boost|Comfort"),
    Dolphin: model("EA1:2021+", "Active|Boost|Comfort|Design"),
    "Atto 2": model("I:2025+", "Active|Boost|Comfort|DM-i"),
    "Atto 3": model("I:2022+|EVO:2026+", "Comfort|Design|EVO"),
    Seal: model("I:2022+", "Design|Excellence AWD"),
    "Seal U": model("I:2023+", "Comfort|Design|DM-i Boost|DM-i Design"),
    "Seal 6": model("I:2025+", "DM-i|DM-i Touring"),
    "Sealion 7": model("I:2024+", "Comfort|Design AWD|Excellence AWD"),
    Han: model("I:2020+", "Executive AWD"),
    Tang: model("II:2021+", "Flagship AWD"),
  },
  Geely: {
    Coolray: model("SX11:I, 2018–2022|SX11 facelift:2022+", "1.5 TD"),
    Cityray: model("G426:2024+", "1.5 TD"),
    Starray: model("FX11:2023+", "1.5 TD|2.0 TD"),
    "Starray EM-i": model("I:2025+", "EM-i"),
    "Atlas Pro": model("NL3B:2021+", "1.5 TD MHEV"),
    EX5: model("E245:2024+", "Pro|Max"),
  },
  Omoda: {
    "5": model("I:2022+", "1.6 TGDI|SHS-H"),
    E5: model("I:2024+", "Comfort|Premium"),
    "7": model("I:2025+", "1.6 TGDI|SHS"),
    "9": model("I:2025+", "SHS"),
  },
  Jaecoo: {
    "5": model("I:2025+", "1.6 TGDI"),
    "7": model("I:2023+", "1.6 TGDI|SHS"),
    "8": model("I:2023+", "2.0 TGDI|SHS"),
  },
  Forthing: {
    "T5 EVO": model("I:2020+", "1.5 Turbo|HEV"),
    Friday: model("I:2023+", "Electric"),
    "U-Tour": model("I:2022+", "1.5 Turbo"),
    S7: model("I:2024+", "Electric"),
  },
  DFSK: {
    "Glory 500": model("I:2020+", "1.5"),
    "Glory 580": model("I:2016+", "1.5 Turbo"),
    "Fengon 5": model("I:2019+", "1.5 Turbo"),
    "Fengon 600": model("I:2023+", "1.5 Turbo"),
    E5: model("I:2023+", "PHEV"),
  },
  Dongfeng: {
    Box: model("I:2024+", "31 kWh|42 kWh"),
    Shine: model("I:2021+", "1.5|1.5 Turbo"),
    "Shine Max": model("I:2022+", "1.5 Turbo|Hybrid"),
    Mage: model("I:2023+", "1.5 Turbo|Hybrid"),
    Huge: model("I:2023+", "1.5 Turbo|Hybrid"),
  },
  "Lynk & Co": {
    "01": model("I:2017+", "Hybrid|Plug-in Hybrid"),
    "02": model("E335:Electric, 2024+", "Core|More"),
    "08": model("I:2023+", "Plug-in Hybrid"),
  },
  Polestar: {
    "1": model("SPA:2019–2021", "Hybrid AWD"),
    "2": model("CMA:2020+", "Standard Range|Long Range|Dual Motor"),
    "3": model("SPA2:2024+", "Long Range Dual Motor|Performance"),
    "4": model("SEA:2024+", "Long Range Single Motor|Long Range Dual Motor"),
  },
  Nio: {
    ET5: model("I:2022+", "75 kWh|100 kWh|Touring"),
    ET7: model("I:2022+", "75 kWh|100 kWh"),
    EL6: model("I:2023+", "75 kWh|100 kWh"),
    EL7: model("I:2022+", "75 kWh|100 kWh"),
    EL8: model("I:2024+", "75 kWh|100 kWh"),
  },
  Xpeng: {
    P7: model("I:2020+", "RWD Long Range|AWD Performance"),
    G6: model("I:2023+", "RWD Standard|RWD Long Range|AWD Performance"),
    G9: model("I:2022+", "RWD Standard|RWD Long Range|AWD Performance"),
  },
  Leapmotor: {
    T03: model("I:2020+", "37,3 kWh"),
    B10: model("I:2025+", "Electric"),
    C10: model("I:2024+", "Electric|REEV"),
  },
  Chery: {
    "Tiggo 4 Pro": model("I:2022+", "1.5|1.5 Turbo"),
    "Tiggo 7 Pro": model("I:2022+", "1.6 TGDI|PHEV"),
    "Tiggo 8 Pro": model("I:2022+", "1.6 TGDI|PHEV"),
  },
  Voyah: {
    Free: model("I:2021+", "Electric|REEV"),
    Dream: model("I:2022+", "Electric|PHEV"),
    Courage: model("I:2024+", "Electric"),
  },
  Seres: {
    "3": model("I:2020+", "52 kWh"),
    "5": model("I:2023+", "RWD|AWD"),
    "7": model("I:2024+", "REEV"),
  },
  Zeekr: {
    "001": model("I:2021+", "Long Range RWD|Performance AWD|Privilege AWD"),
    X: model("I:2023+", "Long Range RWD|Privilege AWD"),
    "7X": model("I:2024+", "Core RWD|Long Range RWD|Privilege AWD"),
  },
  Maxus: {
    "Euniq 5": model("I:2019+", "Electric"),
    "Euniq 6": model("I:2021+", "Electric"),
    "MIFA 9": model("I:2022+", "Electric"),
    "T90 EV": model("I:2022+", "Electric"),
    "eDeliver 3 / 9": model("I:2020+", "Electric"),
  },

  // === EASTERN EUROPEAN & OTHER ===
  Lada: {
    "Niva / 4x4": model("2121:1977–2020|Legend/Travel:2020+", "1.6|1.7|1.7i|1.9 D"),
    Samara: model("2108/2109/21099:1984–2013", "1.1|1.3|1.5"),
    "110 / 111 / 112": model("1995–2009", "1.5|1.6 16V"),
    Kalina: model("1117/1118/1119:2004–2013|II:2013–2018", "1.4 16V|1.6"),
    Priora: model("2170:2007–2018", "1.6 16V"),
    Granta: model("2190:2011+", "1.6"),
    Vesta: model("I:2015+", "1.6|1.8|SW Cross"),
  },
  "Zastava / Yugo": {
    "Yugo Koral / Tempo": model("1980–2008", "45|55|60|65|1.1|1.3"),
    Florida: model("1988–2008", "1.3|1.4|1.6"),
    "Skala / 101": model("1971–2008", "1.1|55|65"),
    "750 / Fićo": model("1955–1985", "750|850"),
  },
  Tata: {
    Indica: model("I:1998–2008|Vista:2008–2015", "1.4|1.4 TDI"),
    Safari: model("I:1998–2019|II:2021+", "2.0 TDI|2.2 Dicor"),
    Xenon: model("I:2007+", "2.2 Dicor 4x4"),
  },
  Mahindra: {
    "XUV500": model("W201:2011–2021", "2.2 mHawk"),
    "KUV100": model("I:2016+", "1.2 mFalcon"),
    Goa: model("I:2002+", "2.2 mHawk|Pik-Up"),
    Thar: model("I:2010–2020|II:2020+", "2.2 mHawk 4x4"),
  },
  Rimac: {
    Concept_One: model("I:2016–2017", "Electric"),
    Nevera: model("I:2021+", "Nevera|Nevera R"),
  },
} satisfies Record<string, Record<string, CarModel>>;

export const CAR_MAKES = Object.keys(CAR_CATALOG).sort((a, b) => a.localeCompare(b, "hr"));
const catalog: Readonly<Record<string, Readonly<Record<string, CarModel>>>> = CAR_CATALOG;
const otherGenerationFamily: GenerationFamily = {
  codes: [OTHER_GENERATION],
  description: "Ostale izvedbe / godišta",
  yearFrom: CATALOG_MIN_YEAR,
  yearTo: CATALOG_MAX_YEAR,
};

export function modelsFor(make: string, includeOther = true) {
  if (!Object.hasOwn(catalog, make)) return [];
  const list = Object.keys(catalog[make]);
  return includeOther ? [...list, OTHER_MODEL] : list;
}

export function modelFor(make: string, modelName: string): CarModel | undefined {
  if (!Object.hasOwn(catalog, make) || !modelName) return undefined;
  if (modelName === OTHER_MODEL) {
    return {
      generations: [{ codes: [OTHER_GENERATION], description: "Ručni unos modela", yearFrom: CATALOG_MIN_YEAR, yearTo: CATALOG_MAX_YEAR }],
      variants: [],
      variantDetails: [],
    };
  }
  if (!Object.hasOwn(catalog[make], modelName)) {
    return { generations: [otherGenerationFamily], variants: [], variantDetails: [] };
  }
  const entry = catalog[make][modelName];
  return {
    generations: [...entry.generations, otherGenerationFamily],
    variants: entry.variants,
    variantDetails: entry.variantDetails,
  };
}

export function generationFamilyFor(make: string, modelName: string, generation: string): GenerationFamily | undefined {
  if (!generation || generation === OTHER_GENERATION) return undefined;
  return modelFor(make, modelName)?.generations.find(
    family => !family.codes.includes(OTHER_GENERATION) && (family.codes.includes(generation) || family.codes.join("/") === generation),
  );
}

export function generationRange(make: string, modelName: string, generation: string): YearRange | undefined {
  const family = generationFamilyFor(make, modelName, generation);
  return family ? { yearFrom: family.yearFrom, yearTo: family.yearTo } : undefined;
}

export function modelYearRange(make: string, modelName: string): YearRange | undefined {
  const realGens = modelFor(make, modelName)?.generations.filter(g => !g.codes.includes(OTHER_GENERATION));
  if (!realGens?.length) return undefined;
  return {
    yearFrom: Math.min(...realGens.map(g => g.yearFrom)),
    yearTo: Math.max(...realGens.map(g => g.yearTo)),
  };
}

export function variantYearRange(make: string, modelName: string, variant: string): YearRange | undefined {
  if (!variant) return undefined;
  const detail = modelFor(make, modelName)?.variantDetails?.find(v => v.name === variant);
  return detail ? { yearFrom: detail.yearFrom, yearTo: detail.yearTo } : undefined;
}

export function effectiveYearRange(
  make: string,
  modelName: string,
  generation?: string,
  variant?: string,
  defaultMin = 1990,
): YearRange {
  const fallback: YearRange = { yearFrom: defaultMin, yearTo: CATALOG_MAX_YEAR };
  if (!make || !modelName || modelName === OTHER_MODEL) return fallback;
  if (generation === OTHER_GENERATION) return fallback;

  const genSpan = generation ? generationRange(make, modelName, generation) : undefined;
  const modSpan = modelYearRange(make, modelName);
  let span: YearRange = genSpan ?? modSpan ?? fallback;
  if (!genSpan && modSpan) {
    span = { yearFrom: Math.min(defaultMin, modSpan.yearFrom), yearTo: modSpan.yearTo };
  }

  if (variant) {
    const varSpan = variantYearRange(make, modelName, variant);
    if (varSpan) {
      const from = Math.max(span.yearFrom, varSpan.yearFrom);
      const to = Math.min(span.yearTo, varSpan.yearTo);
      if (from <= to) span = { yearFrom: from, yearTo: to };
    }
  }
  return span;
}

export function generationsForYear(make: string, modelName: string, year?: number): readonly GenerationFamily[] {
  const gens = modelFor(make, modelName)?.generations ?? [];
  if (!year || !Number.isFinite(year)) return gens;
  return gens.filter(family => family.codes.includes(OTHER_GENERATION) || (year >= family.yearFrom && year <= family.yearTo));
}

export function variantsForSelection(
  make: string,
  modelName: string,
  generation?: string,
  year?: number,
): readonly string[] {
  const entry = modelFor(make, modelName);
  if (!entry) return [];
  const details = entry.variantDetails ?? entry.variants.map(name => ({ name, yearFrom: CATALOG_MIN_YEAR, yearTo: CATALOG_MAX_YEAR }));
  const genSpan = generation && generation !== OTHER_GENERATION ? generationRange(make, modelName, generation) : undefined;

  return details
    .filter(item => {
      if (genSpan && (item.yearTo < genSpan.yearFrom || item.yearFrom > genSpan.yearTo)) {
        return false;
      }
      if (year && Number.isFinite(year) && generation !== OTHER_GENERATION) {
        if (year < item.yearFrom || year > item.yearTo) return false;
      }
      return true;
    })
    .map(item => item.name);
}

export function clampYearToRange(year: number, range: YearRange): number {
  if (!Number.isFinite(year)) return range.yearTo;
  return Math.min(Math.max(year, range.yearFrom), range.yearTo);
}

export function describeFamily(family: GenerationFamily) {
  return family.codes.join("/") + (family.description ? " (" + family.description + ")" : "");
}

export function validGeneration(make: string, modelName: string, selection: string) {
  if (!selection || !Object.hasOwn(catalog, make)) return false;
  if (selection === OTHER_GENERATION) return true;
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
  const matches = codes.filter(code => code !== OTHER_GENERATION && code.length >= 2 && /\d/.test(code) && titleContainsChassis(title, code));
  const longest = matches.filter(code => !matches.some(other => other !== code && other.startsWith(code + " ")));
  return longest.length === 1 ? longest[0] : undefined;
}
