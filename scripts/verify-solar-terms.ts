// 절기 테이블(solar-terms.data.ts)을 KASI(한국천문연구원) 공식 값과 대조한다.
// Meeus 근사로 생성한 테이블의 분 단위 오차를 찾아, 경계 출생(절입 직전·직후)의
// 월주 오판 가능성을 없애는 것이 목적이다.
//
// 사용법:
//   KASI_SERVICE_KEY=<공공데이터포털 인증키(Decoding)> npx tsx scripts/verify-solar-terms.ts 2004 2026
//   ... --write   # 차이가 있는 연도의 데이터 라인을 solar-terms.data.ts에 반영
//
// 키 발급: https://www.data.go.kr → "한국천문연구원_특일 정보" 활용신청(무료) → 일반 인증키.
// 참고: 이 API는 대체로 2004년 이후만 제공한다 — 커버 범위 밖 연도는 '조회 불가'로 보고만 한다.

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "src", "lib", "engine", "solar-terms.data.ts");

// solar-terms.data.ts 연도 배열 순서(소한부터)와 같은 KASI 절기명
const TERM_NAMES = [
  "소한", "대한", "입춘", "우수", "경칩", "춘분", "청명", "곡우",
  "입하", "소만", "망종", "하지", "소서", "대서", "입추", "처서",
  "백로", "추분", "한로", "상강", "입동", "소설", "대설", "동지",
] as const;

interface KasiItem { dateName: string; locdate: number; kst?: number | string }

async function fetchYear(year: number, key: string): Promise<Map<string, string> | null> {
  const url =
    "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo" +
    `?solYear=${year}&numOfRows=30&pageNo=1&_type=json&ServiceKey=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const items: KasiItem[] | KasiItem | undefined = body?.response?.body?.items?.item;
  if (!items) return null;
  const list = Array.isArray(items) ? items : [items];
  const map = new Map<string, string>();
  for (const it of list) {
    const d = String(it.locdate); // YYYYMMDD
    const t = String(it.kst ?? "0000").padStart(4, "0"); // HHmm
    map.set(
      it.dateName,
      `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}`,
    );
  }
  return map;
}

function localTable(source: string, year: number): string[] | null {
  const m = new RegExp(`^\\s*${year}: \\[(.*)\\],\\s*$`, "m").exec(source);
  if (!m) return null;
  return m[1].split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
}

async function main() {
  const key = process.env.KASI_SERVICE_KEY;
  if (!key) {
    console.error("KASI_SERVICE_KEY 환경변수가 필요합니다 (공공데이터포털 '특일 정보' 인증키).");
    process.exit(1);
  }
  const args = process.argv.slice(2).filter((a) => a !== "--write");
  const write = process.argv.includes("--write");
  const from = Number(args[0] ?? 2004);
  const to = Number(args[1] ?? new Date().getFullYear());

  let source = readFileSync(DATA_PATH, "utf-8");
  let totalDiff = 0;

  for (let year = from; year <= to; year++) {
    const kasi = await fetchYear(year, key);
    if (!kasi || kasi.size < TERM_NAMES.length) {
      console.log(`${year}: KASI 조회 불가(커버 범위 밖이거나 응답 이상) — 건너뜀`);
      continue;
    }
    const local = localTable(source, year);
    if (!local) {
      console.log(`${year}: 로컬 테이블에 없음 — 건너뜀`);
      continue;
    }

    const corrected = [...local];
    const diffs: string[] = [];
    TERM_NAMES.forEach((name, i) => {
      const k = kasi.get(name);
      if (!k) return;
      if (local[i] !== k) {
        const dMin = Math.round((Date.parse(`${k}:00+09:00`) - Date.parse(`${local[i]}:00+09:00`)) / 60000);
        diffs.push(`  ${name}: 로컬 ${local[i]} → KASI ${k} (${dMin > 0 ? "+" : ""}${dMin}분)`);
        corrected[i] = k;
      }
    });

    if (diffs.length === 0) {
      console.log(`${year}: 일치 (24절기 모두)`);
      continue;
    }
    totalDiff += diffs.length;
    console.log(`${year}: ${diffs.length}건 차이`);
    diffs.forEach((d) => console.log(d));

    if (write) {
      const line = `  ${year}: [${corrected.map((s) => `"${s}"`).join(",")}],`;
      source = source.replace(new RegExp(`^\\s*${year}: \\[.*\\],\\s*$`, "m"), line);
    }
  }

  if (write && totalDiff > 0) {
    writeFileSync(DATA_PATH, source, "utf-8");
    console.log(`\nsolar-terms.data.ts 갱신 완료 — npm run verify로 월주 대조 테스트를 다시 돌리세요.`);
  }
  console.log(`\n총 차이: ${totalDiff}건`);
}

main();
