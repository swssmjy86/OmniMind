// 일주(일진) 앵커를 KASI(한국천문연구원) 공표 일진과 대조하는 **감시 도구**.
//
// 왜 필요한가: 엔진의 일주는 "2000-01-07 = 갑자일" 앵커 하나 위에 JDN 산술로 세워진다.
// CLAUDE.md가 이 앵커를 "유일한 외부 가정"이라 부르는 이유다. 앵커가 k칸 틀리면 모든 사용자의
// 일간(아신)이 통째로 틀리는데, 자기정합 테스트로는 절대 드러나지 않는다.
// 일진은 60일 주기라 흩어진 날짜 다수가 맞으면 앵커와 JDN 산술이 함께 입증된다.
//
// 사용법:
//   KASI_SERVICE_KEY=<공공데이터포털 인증키> npx tsx scripts/verify-iljin.ts [시작연도] [끝연도]
//   ... --emit-fixture   # 오프라인 회귀 테스트(iljin.fixture.ts)용 코드 출력
// 키 발급: https://www.data.go.kr → "한국천문연구원_음양력 정보" 활용신청(무료).
// 이 API의 제공 범위는 1900~2050년이다(그 밖은 조회 불가로 표시된다).

import { dayPillar } from "../src/lib/engine/pillars";
import { kstStringToInstant } from "../src/lib/engine/kst";
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from "../src/lib/engine/constants";

const API =
  "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const p2 = (n: number) => String(n).padStart(2, "0");

/** 엔진의 그날 일진 — 정오로 물어 야자시(23시) 이월 규칙을 피한다(달력상 그날의 간지). */
function engineIljin(date: string): string {
  const p = dayPillar(kstStringToInstant(`${date}T12:00`));
  return HEAVENLY_STEMS[p.stem] + EARTHLY_BRANCHES[p.branch];
}

/** KASI 일진 조회. "갑자(甲子)" → "갑자". 초당 호출 제한이 있어 재시도로 흡수한다. */
async function fetchIljin(date: string, key: string): Promise<string | null> {
  const [y, m, d] = date.split("-");
  const url = `${API}?solYear=${y}&solMonth=${m}&solDay=${d}&_type=json&ServiceKey=${encodeURIComponent(key)}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json().catch(() => null);
        const item = body?.response?.body?.items?.item;
        const raw = (Array.isArray(item) ? item[0] : item)?.lunIljin;
        if (typeof raw === "string") {
          const ko = raw.split("(")[0].trim();
          if (/^[가-힣]{2}$/.test(ko)) return ko;
        }
      }
    } catch {
      // 네트워크 오류 — 재시도
    }
    await sleep(1200 * attempt);
  }
  return null;
}

/** 대조 날짜: 연도별 3개 + 달력 산술이 깨지기 쉬운 경계일. */
function sampleDates(from: number, to: number): string[] {
  const dates: string[] = [];
  for (let y = from; y <= to; y++) {
    for (const [m, d] of [[1, 15], [6, 15], [11, 15]] as const) dates.push(`${y}-${p2(m)}-${p2(d)}`);
  }
  // 그레고리력 윤년 규칙(100년 예외·400년 예외)과 월말 이월이 틀리면 여기서 잡힌다.
  const edges = [
    "1900-02-28", "1900-03-01", // 1900년은 윤년이 아니다
    "2000-02-28", "2000-02-29", "2000-03-01", // 2000년은 윤년이다(400년 예외)
    "1904-02-29", "2024-02-29", "2048-02-29",
    "1999-12-31", "2000-01-01", "2000-01-07", // 앵커 당일
    "1999-01-31", "1999-02-01", "2050-12-31",
  ];
  for (const e of edges) {
    const y = Number(e.slice(0, 4));
    if (y >= from && y <= to && !dates.includes(e)) dates.push(e);
  }
  return dates.sort();
}

async function main() {
  const key = process.env.KASI_SERVICE_KEY;
  if (!key) {
    console.error("KASI_SERVICE_KEY 환경변수가 필요합니다 (공공데이터포털 '음양력 정보' 인증키).");
    process.exit(2);
  }
  const args = process.argv.slice(2);
  const emitFixture = args.includes("--emit-fixture");
  const years = args.filter((a) => /^\d{4}$/.test(a));
  const unknown = args.filter((a) => a !== "--emit-fixture" && !/^\d{4}$/.test(a));
  if (unknown.length) {
    console.error(`알 수 없는 인자: ${unknown.join(" ")}`);
    console.error("사용법: npx tsx scripts/verify-iljin.ts [시작연도] [끝연도] [--emit-fixture]");
    process.exit(2);
  }
  const from = Number(years[0] ?? 1900);
  const to = Number(years[1] ?? 2050);
  if (from > to) {
    console.error(`연도 범위가 뒤집혔습니다: ${from} > ${to}`);
    process.exit(2);
  }

  const dates = sampleDates(from, to);
  console.log(`대조 시작: ${from}~${to}, ${dates.length}개 날짜\n`);

  const mismatches: string[] = [];
  const verified: Array<[string, string]> = [];
  let unavailable = 0;

  for (const date of dates) {
    await sleep(250); // 초당 호출 제한 회피
    const kasi = await fetchIljin(date, key);
    if (!kasi) {
      unavailable++;
      console.log(`${date}: KASI 조회 불가(제공 범위 밖이거나 응답 이상) — 건너뜀`);
      continue;
    }
    const ours = engineIljin(date);
    verified.push([date, kasi]);
    if (ours !== kasi) mismatches.push(`${date}: 엔진 ${ours} vs KASI ${kasi}`);
  }

  console.log(`\n=== 요약 ===`);
  console.log(`대조: ${verified.length}건 / 일치: ${verified.length - mismatches.length}건 / 조회 불가: ${unavailable}건`);

  // 아무것도 대조하지 못했으면 '이상 없음'이 아니라 실패다.
  if (verified.length === 0) {
    console.error("\n⚠ 대조된 날짜가 0건입니다 — 인증키·네트워크·연도 범위를 확인하세요.");
    process.exit(1);
  }
  if (mismatches.length) {
    console.error(`\n⚠ 불일치 ${mismatches.length}건 — 일주 앵커 또는 JDN 산술을 의심해야 합니다:`);
    mismatches.forEach((m) => console.error("  " + m));
    process.exit(1);
  }
  console.log("일진 전부 일치 — 앵커(2000-01-07=갑자일)와 JDN 산술이 KASI 공표값으로 확인됨.");

  if (emitFixture) {
    console.log(`\n// ↓ src/lib/engine/fixtures/iljin-cases.ts 본문으로 복사`);
    console.log(`export const ILJIN_CASES: ReadonlyArray<readonly [string, string]> = [`);
    for (const [date, ilj] of verified) console.log(`  ["${date}", "${ilj}"],`);
    console.log(`];`);
  }
}

main();
