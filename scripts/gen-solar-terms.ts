// AUTO-GEN TOOL (빌드 타임 전용) — 24절기 절입 시각 테이블 생성.
// 알고리즘: Jean Meeus, "Astronomical Algorithms" 2nd ed.
//   - 25장: 태양의 겉보기 황경(apparent solar longitude)
//   - 목표 황경(15° 배수) 도달 순간을 뉴턴 반복으로 역산
//   - JDE(TT) → ΔT 보정 → UT → +9h(KST) → 벽시계 "YYYY-MM-DDTHH:mm"
// 검증: scripts/verify-solar-terms.ts 가 KASI 공인 시각과 대조·패치.
// 실행: npx tsx scripts/gen-solar-terms.ts
import { writeFileSync } from "node:fs";

const YEAR_FROM = 1900;
const YEAR_TO = 2100;

const RAD = Math.PI / 180;
const sin = (deg: number) => Math.sin(deg * RAD);
const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

/** 태양 겉보기 황경(도, 0~360). jde = Julian Ephemeris Day(TT). */
function sunApparentLongitude(jde: number): number {
  const T = (jde - 2451545.0) / 36525.0;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const apparent = trueLong - 0.00569 - 0.00478 * sin(omega);
  return norm360(apparent);
}

/** 목표 황경(도)에 도달하는 JDE를 뉴턴 반복으로 구한다. seedJde 근처의 해. */
function solveTermJde(targetLon: number, seedJde: number): number {
  let jde = seedJde;
  for (let i = 0; i < 8; i++) {
    const lon = sunApparentLongitude(jde);
    let delta = targetLon - lon;
    delta = (((delta + 180) % 360) + 360) % 360 - 180; // (-180,180]로 정규화 (JS % 음수 보정)
    jde += delta / 0.98564736; // 태양 평균 이동 ~0.9856°/일
    if (Math.abs(delta) < 1e-7) break;
  }
  return jde;
}

/** ΔT(초): TT - UT. Espenak & Meeus 다항 근사 (1900~2150). */
function deltaTSeconds(year: number): number {
  let t: number;
  if (year < 1920) {
    t = year - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  } else if (year < 1941) {
    t = year - 1920;
    return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3;
  } else if (year < 1961) {
    t = year - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t ** 3) / 2547;
  } else if (year < 1986) {
    t = year - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t ** 3) / 718;
  } else if (year < 2005) {
    t = year - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 +
      0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  } else if (year < 2050) {
    t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  t = year - 1820;
  return -20 + 32 * (t / 100) ** 2 - 0.5628 * (2150 - year);
}

/** 그레고리력(정오=0.5 포함) → JD. Meeus 7장. */
function jdFromCalendar(y: number, m: number, dayFrac: number): number {
  let yy = y;
  let mm = m;
  if (mm <= 2) { yy -= 1; mm += 12; }
  const A = Math.floor(yy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (yy + 4716)) +
    Math.floor(30.6001 * (mm + 1)) +
    dayFrac + B - 1524.5
  );
}

/** JD → 벽시계 "YYYY-MM-DDTHH:mm" (분 반올림). Meeus 7장 역변환. */
function jdToWallClock(jd: number): string {
  const z0 = jd + 0.5;
  const Z = Math.floor(z0);
  const F = z0 - Z;
  let A: number;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const dayWithFrac = B - D - Math.floor(30.6001 * E) + F;
  const day = Math.floor(dayWithFrac);
  const frac = dayWithFrac - day;
  const month = E < 14 ? E - 1 : E - 13;
  let year = month > 2 ? C - 4716 : C - 4715;

  // 분 단위 반올림
  const totalMin = Math.round(frac * 1440);
  let hh = Math.floor(totalMin / 60);
  const mi = totalMin % 60;
  if (hh === 24) {
    // 자정 넘김 → 다음 날로 이월 (윤·월말 안전 처리)
    hh = 0;
    const d = new Date(Date.UTC(year, month - 1, day + 1));
    year = d.getUTCFullYear();
    return fmt(year, d.getUTCMonth() + 1, d.getUTCDate(), hh, mi);
  }
  return fmt(year, month, day, hh, mi);
}

const p2 = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number, hh: number, mi: number) =>
  `${y}-${p2(m)}-${p2(d)}T${p2(hh)}:${p2(mi)}`;

// 인덱스 순서(0=소한 … 23=동지)와 근사 절입일 시드(month, day)
// 목표 황경 = (285 + 15*index) % 360
const SEED: [number, number][] = [
  [1, 6], [1, 20], [2, 4], [2, 19], [3, 6], [3, 21], [4, 5], [4, 20],
  [5, 6], [5, 21], [6, 6], [6, 21], [7, 7], [7, 23], [8, 8], [8, 23],
  [9, 8], [9, 23], [10, 8], [10, 23], [11, 7], [11, 22], [12, 7], [12, 22],
];

const rows: string[] = [];
for (let y = YEAR_FROM; y <= YEAR_TO; y++) {
  const dt = deltaTSeconds(y) / 86400; // 일 단위
  const terms: string[] = [];
  for (let k = 0; k < 24; k++) {
    const targetLon = (285 + k * 15) % 360;
    const [sm, sd] = SEED[k];
    const seedJde = jdFromCalendar(y, sm, sd + 0.5);
    const jde = solveTermJde(targetLon, seedJde); // TT
    const jdKst = jde - dt + 9 / 24; // TT → UT → KST
    terms.push(jdToWallClock(jdKst));
  }
  rows.push(`  ${y}: [${terms.map((t) => `"${t}"`).join(",")}],`);
}

writeFileSync(
  "src/lib/engine/solar-terms.data.ts",
  `// AUTO-GENERATED by scripts/gen-solar-terms.ts — DO NOT EDIT.\n` +
    `// KST(UTC+9) 절입 시각. 인덱스 0=소한,1=대한,2=입춘,3=우수,4=경칩,5=춘분,\n` +
    `//   6=청명,7=곡우,8=입하,9=소만,10=망종,11=하지,12=소서,13=대서,14=입추,\n` +
    `//   15=처서,16=백로,17=추분,18=한로,19=상강,20=입동,21=소설,22=대설,23=동지\n` +
    `export const SOLAR_TERMS: Record<number, string[]> = {\n${rows.join("\n")}\n};\n`,
  "utf8",
);

console.log(`생성 완료: ${YEAR_FROM}~${YEAR_TO} (${rows.length}개 연도 × 24절기)`);
