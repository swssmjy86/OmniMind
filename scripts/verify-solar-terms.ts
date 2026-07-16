// 절기 테이블(solar-terms.data.ts)을 KASI(한국천문연구원) 공표 시각과 대조하는 **감시 도구**.
//
// 이 스크립트는 데이터를 고치지 않는다(패치 기능 없음). 이유:
//   테이블은 astronomy-engine(태양 겉보기 황경)으로 초 단위 생성되며, USNO 공표 분점·지점과
//   1분 이내로 일치함이 solar-terms.usno.test.ts로 상시 검증된다. 반면 KASI **API**의 데이터에는
//   실측된 오류가 있었다 — 2015 하지 +20분, 2011 대한 +1일, 2011 입동 +356분, 2019 대한 "17:60".
//   따라서 KASI 값을 그대로 덮어쓰면 정확한 값이 오염된다. 대신 차이를 '보고'만 하고,
//   2분을 넘는 차이는 사람이 판단하도록 경고한다.
//
// 사용법:
//   KASI_SERVICE_KEY=<공공데이터포털 인증키(Decoding)> npx tsx scripts/verify-solar-terms.ts 2000 2028
// 키 발급: https://www.data.go.kr → "한국천문연구원_특일 정보" 활용신청(무료) → 일반 인증키.
// 이 API의 절기 정보 제공 범위는 2000~2028년이다(그 밖 연도는 조회 불가로 표시된다).

import { readFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(__dirname, "..", "src", "lib", "engine", "solar-terms.data.ts");

/** 이 이상 차이나면 KASI 원본 데이터 오류를 의심한다(정상 차이는 KASI의 분 단위 표기뿐). */
const SUSPECT_THRESHOLD_MS = 2 * 60_000;

/**
 * 이미 사람이 확인한 KASI API 원본 오류 — 이 도구는 '새로운' 이상만 실패로 다룬다.
 * 여기 없는 이상이 나오면 종료 코드 1로 알린다.
 */
const KNOWN_KASI_DEFECTS = new Map<string, string>([
  ["2011 대한", "locdate가 하루 뒤(1/21)로 기록됨 — 테이블 1/20이 맞다"],
  ["2011 입동", "kst가 09:26으로 기록됨 — 테이블 03:35가 맞다(약 6시간 오차)"],
  ["2015 하지", "kst가 01:58로 기록됨 — 테이블 01:37이 맞다(USNO 6/21 16:38 UTC와 일치)"],
  ["2019 대한", "kst가 '1760'(60분)이라는 불법 시각 — 조회 단계에서 버려진다"],
]);

// solar-terms.data.ts 연도 배열 순서(소한부터)와 같은 KASI 절기명
const TERM_NAMES = [
  "소한", "대한", "입춘", "우수", "경칩", "춘분", "청명", "곡우",
  "입하", "소만", "망종", "하지", "소서", "대서", "입추", "처서",
  "백로", "추분", "한로", "상강", "입동", "소설", "대설", "동지",
] as const;

interface KasiItem { dateName: string; locdate: number; kst?: number | string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const at = (kst: string) => Date.parse(kst.length === 16 ? `${kst}:00+09:00` : `${kst}+09:00`);

// 공공데이터포털 무료 키는 초당 호출 제한이 있어 간헐적으로 거절된다 — 재시도로 흡수한다.
async function fetchYear(year: number, key: string): Promise<Map<string, string> | null> {
  const url =
    "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo" +
    `?solYear=${year}&numOfRows=30&pageNo=1&_type=json&ServiceKey=${encodeURIComponent(key)}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json().catch(() => null);
        const items: KasiItem[] | KasiItem | undefined = body?.response?.body?.items?.item;
        if (items) {
          const list = Array.isArray(items) ? items : [items];
          const map = new Map<string, string>();
          for (const it of list) {
            if (map.has(it.dateName)) continue; // KASI 라벨 중복(예: 2000년 입춘×2) — 첫 항목만
            const d = String(it.locdate); // YYYYMMDD
            const t = String(it.kst ?? "").trim(); // "HHmm"
            // 불법 시각(예: 2019 대한 "1760" = 60분)은 버린다 — 00:00으로 메꾸면 가짜 값이 된다.
            if (!/^\d{4}$/.test(t) || Number(t.slice(0, 2)) > 23 || Number(t.slice(2, 4)) > 59) continue;
            map.set(
              it.dateName,
              `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}`,
            );
          }
          if (map.size >= TERM_NAMES.length - 2) return map; // 한두 개 누락은 항목별로 건너뛴다
        }
      }
    } catch {
      // 네트워크 오류 — 재시도
    }
    await sleep(1200 * attempt);
  }
  return null;
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
  // 인자를 검증하지 않으면 오타·옛 플래그(--write)가 NaN이 되어 루프가 한 번도 돌지 않고
  // "이상 없음"으로 끝난다 — 아무것도 대조하지 않았는데 통과한 것처럼 보이는 게 최악이다.
  const args = process.argv.slice(2);
  const bad = args.filter((a) => !/^\d{4}$/.test(a));
  if (bad.length) {
    console.error(`알 수 없는 인자: ${bad.join(" ")}`);
    if (bad.includes("--write")) {
      console.error("패치(--write) 기능은 제거되었습니다. 이 도구는 대조·보고만 합니다.");
      console.error("테이블 값은 scripts/gen-solar-terms.ts(astronomy-engine)가 생성합니다.");
    }
    console.error("사용법: npx tsx scripts/verify-solar-terms.ts [시작연도] [끝연도]");
    process.exit(2);
  }
  const from = Number(args[0] ?? 2000);
  const to = Number(args[1] ?? 2028);
  if (from > to) {
    console.error(`연도 범위가 뒤집혔습니다: ${from} > ${to}`);
    process.exit(2);
  }

  const source = readFileSync(DATA_PATH, "utf-8");
  let checked = 0;
  let withinMinute = 0;
  let yearsCompared = 0;
  const suspects: string[] = [];
  const unparsable: string[] = [];

  for (let year = from; year <= to; year++) {
    await sleep(400); // 초당 호출 제한 회피
    const kasi = await fetchYear(year, key);
    if (!kasi) {
      console.log(`${year}: KASI 조회 불가(제공 범위 밖이거나 응답 이상) — 건너뜀`);
      continue;
    }
    const local = localTable(source, year);
    if (!local) {
      console.log(`${year}: 로컬 테이블에 없음 — 건너뜀`);
      continue;
    }

    const notes: string[] = [];
    TERM_NAMES.forEach((name, i) => {
      const k = kasi.get(name);
      if (!k) {
        notes.push(`  ${name}: KASI 항목 없음/시각 불량 — 대조 생략`);
        return;
      }
      const diff = at(local[i]) - at(k);
      if (!Number.isFinite(diff)) {
        // 어느 쪽이든 파싱 실패 — 조용히 넘어가면 '대조했다'고 착각하게 된다.
        unparsable.push(`${year} ${name}: 테이블 "${local[i]}" vs KASI "${k}"`);
        notes.push(`  ⚠ ${year} ${name}: 시각을 해석할 수 없어 대조 실패`);
        return;
      }
      checked++;
      if (Math.abs(diff) < 60_000) {
        withinMinute++; // KASI는 분 단위 표기 — 1분 미만 차이는 같은 값으로 본다
        return;
      }
      const line = `${year} ${name}: 테이블 ${local[i]} vs KASI ${k} (${(diff / 60_000).toFixed(1)}분)`;
      if (Math.abs(diff) > SUSPECT_THRESHOLD_MS) {
        const known = KNOWN_KASI_DEFECTS.get(`${year} ${name}`);
        if (known) {
          notes.push(`  · ${line} — 확인된 KASI 오류(${known})`);
        } else {
          suspects.push(line);
          notes.push(`  ⚠ ${line} — KASI 원본 오류 의심(사람 확인 필요)`);
        }
      } else {
        notes.push(`  ${line}`);
      }
    });
    yearsCompared++;
    console.log(`${year}: 대조 완료${notes.length ? "" : " — 전부 일치"}`);
    notes.forEach((n) => console.log(n));
  }

  console.log(`\n=== 요약 ===`);
  console.log(`대조한 연도: ${yearsCompared} / 절기: ${checked}건 / 1분 이내 일치: ${withinMinute}건`);

  // 아무것도 대조하지 못했으면 '이상 없음'이 아니라 실패다(키 만료·네트워크·범위 오지정).
  if (checked === 0) {
    console.error("\n⚠ 대조된 절기가 0건입니다 — 인증키·네트워크·연도 범위를 확인하세요.");
    process.exit(1);
  }
  if (unparsable.length) {
    console.error(`\n⚠ 해석 불가 ${unparsable.length}건:`);
    unparsable.forEach((s) => console.error("  " + s));
  }
  if (suspects.length) {
    console.error(`\n⚠ 새로운 ${SUSPECT_THRESHOLD_MS / 60_000}분 초과 차이 ${suspects.length}건:`);
    suspects.forEach((s) => console.error("  " + s));
    console.error(
      `\n판단 기준: 테이블 값은 USNO 공표 분점·지점과 1분 이내로 일치함이 검증된다` +
        `(solar-terms.usno.test.ts). 지금까지 벗어난 값은 모두 KASI API 측 오류였다.` +
        `\n확인 후 KASI 오류로 판명되면 KNOWN_KASI_DEFECTS에 등록하고, 아니면 테이블을 조사하세요.`,
    );
  }
  if (suspects.length || unparsable.length) process.exit(1);
  console.log(`KASI와 새로운 차이 없음(확인된 KASI 오류 ${KNOWN_KASI_DEFECTS.size}건은 위에 '·'로 표시).`);
}

main();
