export const DEFAULT_WEIGHTS = Object.freeze({ H: 40, P: 35, V: 25 });
export const GOAL = 24;
export const DISTRICTS = [
  { name: '大同區', C: 10, H: .92, P: .82, V: .82, pilot: true },
  { name: '萬華區', C: 11, H: .95, P: .88, V: .95, pilot: true },
  { name: '中正區', C: 12, H: .86, P: .79, V: .70 },
  { name: '中山區', C: 13, H: .82, P: .81, V: .68 },
  { name: '松山區', C: 15, H: .72, P: .86, V: .70 },
  { name: '大安區', C: 17, H: .70, P: .92, V: .65 },
  { name: '信義區', C: 18, H: .68, P: .76, V: .58 },
  { name: '南港區', C: 18, H: .72, P: .55, V: .62 },
  { name: '士林區', C: 19, H: .61, P: .43, V: .78 },
  { name: '內湖區', C: 20, H: .63, P: .45, V: .52 },
  { name: '北投區', C: 21, H: .59, P: .38, V: .81 },
  { name: '文山區', C: 22, H: .57, P: .48, V: .68 },
];
export function redistribute(weights, key, nextValue) {
  const value = Math.max(0, Math.min(100, Math.round(nextValue)));
  const others = ['H', 'P', 'V'].filter(k => k !== key);
  const rest = 100 - value;
  const previous = weights[others[0]] + weights[others[1]];
  const proportion = previous > 0 ? weights[others[0]] / previous : .5;
  const first = Math.round(rest * proportion);
  return { ...weights, [key]: value, [others[0]]: first, [others[1]]: rest - first };
}
export function score(district, weights = DEFAULT_WEIGHTS) {
  const G = Math.max(0, Math.min(1, 1 - district.C / GOAL));
  const S = (weights.H * district.H + weights.P * district.P + weights.V * district.V) / 100;
  const PPI = 100 * G * (.5 + .5 * S);
  return { ...district, G, S, PPI, TES: 100 - PPI };
}
export function rank(weights = DEFAULT_WEIGHTS) {
  return DISTRICTS.map(d => score(d, weights))
    .sort((a, b) => a.TES - b.TES || a.name.localeCompare(b.name, 'zh-TW'))
    .map((d, i) => ({ ...d, rank: i + 1 }));
}
export function band(ppi) {
  return ppi >= 40 ? 'high' : ppi >= 20 ? 'mid' : 'low';
}
export function csvFor(weights) {
  const baseline = rank();
  const head = ['情境名次','行政區','假設樹冠率_pct','目標_pct','H_假設','P_假設','V_假設','H權重_pct','P權重_pct','V權重_pct','G','S','PPI','TES','TES基準','TES差值','名次改善','資料狀態'];
  const rows = rank(weights).map(d => {
    const b = baseline.find(r => r.name === d.name);
    return [d.rank,d.name,d.C,GOAL,d.H,d.P,d.V,weights.H,weights.P,weights.V,d.G.toFixed(6),d.S.toFixed(6),d.PPI.toFixed(6),d.TES.toFixed(6),b.TES.toFixed(6),(d.TES-b.TES).toFixed(6),b.rank-d.rank,'情境假設，非實測／非官方評分'];
  });
  return '\uFEFF' + [head,...rows].map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
}
