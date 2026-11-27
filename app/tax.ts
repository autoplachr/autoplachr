export const customs = "https://carina.gov.hr/posebni-porez-na-motorna-vozila-3650/informativni-kalkulator-za-izracun-ppmv-a/4838";
export const customsTables = "https://carina.gov.hr/pristup-informacijama/propisi-i-sporazumi/trosarinsko-postupanje/visine-trosarina-posebnih-poreza/motorna-vozila/3633";

type Band = [threshold: number, base: number, rate: number];
const valueWLTP: Band[] = [[0,0,0],[26544.57,398.17,.03],[33180.71,597.25,.05],[39816.85,929.06,.07],[46452.99,1393.59,.09],[53089.13,1990.84,.11],[59725.27,2720.82,.13],[66361.41,3583.51,.15],[72997.55,4578.93,.16],[79633.70,5640.71,.17]];
const valueNEDC: Band[] = [[0,0,0],[19908.43,265.45,.03],[26544.57,464.53,.05],[33180.71,796.34,.07],[39816.85,1260.87,.09],[46452.99,1858.12,.11],[53089.13,2588.10,.13],[59725.27,3450.79,.14],[66361.41,4379.85,.15],[72997.55,5375.27,.16],[79633.70,6437.05,.17]];
const dieselWLTP: Band[] = [[95,11.28,13.94],[125,429.48,24.55],[155,1165.98,146],[190,6275.98,165.90],[215,10423.48,179.18],[255,17590.68,205.72]];
const otherWLTP: Band[] = [[95,3.32,5.97],[125,182.42,18.58],[155,739.82,73.66],[175,2213.02,96.22],[200,4618.52,129.40],[240,9794.52,218.99]];
const dieselNEDC: Band[] = [[70,24.55,7.30],[85,134.05,23.23],[120,947.10,152.63],[140,3999.70,165.90],[170,8976.70,179.18],[200,14352.10,192.45]];
const otherNEDC: Band[] = [[75,12.61,4.65],[90,82.36,17.92],[120,619.96,59.73],[140,1814.56,92.91],[170,4601.86,159.27],[200,9379.96,172.54]];
const residualFirst24 = [96,93,90,88,86,84,82,81,80,79,78,77,76.04,75.08,74.12,73.16,72.20,71.24,70.28,69.32,68.36,67.40,66.44,65];
const residualBrackets: [number, number][] = [
  [24,63.58],[26,62.16],[28,60.74],[30,59.32],[32,57.90],[34,56.48],[36,55.06],[38,53.64],[40,52.22],[42,50.80],[44,49.38],[46,47.96],
  [48,46.36],[51,44.76],[54,43.16],[57,41.56],[60,40.06],[64,38.56],[68,37.06],[72,35.26],[78,33.46],[84,31.66],[90,29.86],[96,28.06],[102,26.26],[108,24.46],[114,22.66],
  ...Array.from({ length: 20 }, (_, i): [number, number] => [120 + i * 12, 21.72 - i * .6]),
];
function levy(input: number, bands: Band[], inclusive = true) {
  const match = bands.findLast(([threshold]) => inclusive ? input >= threshold : input > threshold);
  if (!match) return 0;
  const [threshold, base, rate] = match;
  return base + (input - threshold) * rate;
}
export function estimateTax({ price, co2, registration, diesel, used, plugInKm, electric, oldtimer = false }: {
  price: number; co2: number; registration: string; diesel: boolean; used: boolean; plugInKm?: number; electric?: boolean; oldtimer?: boolean;
}, now = new Date()) {
  const [year, month, day] = registration.split("-").map(Number);
  const first = new Date(year, month - 1, day);
  if (Number.isNaN(first.valueOf()) || first > now) return null;
  if (electric || oldtimer) return 0;
  // Vehicles 30+ years old that are not registered as oldtimers pay a flat rate.
  const months = (now.getFullYear() - year) * 12 + now.getMonth() - month + 1 - Number(now.getDate() < day);
  if (year < 1990 || months >= 360) return 265.45;
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(co2) || co2 < 0) return null;
  const wltp = year >= 2021;
  const emissions = diesel ? (wltp ? dieselWLTP : dieselNEDC) : (wltp ? otherWLTP : otherNEDC);
  const residual = residualFirst24[months] ?? residualBrackets.findLast(([limit]) => months >= limit)?.[1] ?? 100;
  const full = levy(price, wltp ? valueWLTP : valueNEDC) + levy(co2, emissions);
  return full * (used ? residual / 100 : 1) * (1 - Math.min(100, Math.max(0, plugInKm ?? 0)) / 100);
}
