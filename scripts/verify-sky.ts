// src/lib/engine/sky.ts(월령·출몰시각·태양고도)를 KASI(한국천문연구원) 공표값과 대조하는
// **감시 도구**. verify-solar-terms.ts와 동일 철학: 패치 없음, 대조·보고만 한다.
//
// 왜 실시간 KASI 호출 없이 astronomy-engine으로 계산하는가: sky.ts 상단 주석 참고.
// 이 스크립트는 그 계산이 KASI 공표값과 맞는지 사람이 주기적으로 확인하는 용도다.
//
// 사용법:
//   KASI_SERVICE_KEY=<공공데이터포털 인증키> npx tsx scripts/verify-sky.ts [시작일 YYYY-MM-DD] [일수]
// 기본값: 2024-01-01부터 30일(재현 가능하도록 "오늘"이 아니라 고정 시작일).
// 키 발급: https://www.data.go.kr → "한국천문연구원_출몰시각정보"/"...태양고도정보"/
//   "...월령정보" 활용신청(무료) — 3개 모두 필요.
import { moonPhaseOf, riseSetOf, sunAltitudeOf } from "../src/lib/engine/sky";

const BASE = "https://apis.data.go.kr/B090041/openapi/service";
const LOCATION = "서울";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const p2 = (n: number) => String(n).padStart(2, "0");

/** 이미 사람이 확인한 KASI 원본 오류 — 새로운 이상만 실패로 다룬다(verify-solar-terms.ts와 동일 패턴). */
const KNOWN_KASI_DEFECTS = new Map<string, string>();

/** "HHMM"(4자리, 콜론 없음) → 분. 형식이 아니면 null(대조 생략). */
function hhmmToMinutes(raw: unknown): number | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{3,4}$/.test(s)) return null;
  const padded = s.padStart(4, "0");
  const h = Number(padded.slice(0, 2));
  const m = Number(padded.slice(2, 4));
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

function hhmmClockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

/** KASI 태양고도 응답은 "29˚ 23´" 같은 도분(DMS) 문자열 — 십진도로 변환. 형식이 아니면 null. */
function parseDms(raw: unknown): number | null {
  const m = /^(-?\d+)\D+(\d+)/.exec(String(raw ?? "").trim());
  if (!m) return null;
  const deg = Number(m[1]);
  const min = Number(m[2]);
  return deg < 0 ? deg - min / 60 : deg + min / 60;
}

async function fetchJson(url: string): Promise<unknown | null> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = await res.json().catch(() => null);
        return body;
      }
    } catch {
      // 네트워크 오류 — 재시도
    }
    await sleep(1200 * attempt);
  }
  return null;
}

function firstItem(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null) return null;
  const root = body as { response?: { body?: { items?: { item?: unknown } } } };
  const item = root.response?.body?.items?.item;
  if (Array.isArray(item)) return (item[0] as Record<string, unknown>) ?? null;
  if (typeof item === "object" && item !== null) return item as Record<string, unknown>;
  return null;
}

async function fetchRiseSet(locdate: string, key: string) {
  const url = `${BASE}/RiseSetInfoService/getAreaRiseSetInfo?locdate=${locdate}&location=${encodeURIComponent(LOCATION)}&_type=json&ServiceKey=${encodeURIComponent(key)}`;
  return firstItem(await fetchJson(url));
}

async function fetchAltitude(locdate: string, key: string) {
  const url = `${BASE}/SrAltudeInfoService/getAreaSrAltudeInfo?locdate=${locdate}&location=${encodeURIComponent(LOCATION)}&_type=json&ServiceKey=${encodeURIComponent(key)}`;
  return firstItem(await fetchJson(url));
}

async function fetchMoonAge(y: number, mo: number, d: number, key: string) {
  const url = `${BASE}/LunPhInfoService/getLunPhInfo?solYear=${y}&solMonth=${p2(mo)}&solDay=${p2(d)}&_type=json&ServiceKey=${encodeURIComponent(key)}`;
  return firstItem(await fetchJson(url));
}

function dateRange(fromStr: string, days: number): Array<{ y: number; mo: number; d: number }> {
  const [y0, m0, d0] = fromStr.split("-").map(Number);
  const start = new Date(Date.UTC(y0, m0 - 1, d0));
  const out: Array<{ y: number; mo: number; d: number }> = [];
  for (let i = 0; i < days; i++) {
    const t = new Date(start.getTime() + i * 86_400_000);
    out.push({ y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() });
  }
  return out;
}

async function main() {
  const key = process.env.KASI_SERVICE_KEY;
  if (!key) {
    console.error("KASI_SERVICE_KEY 환경변수가 필요합니다 (공공데이터포털 출몰시각/태양고도/월령 정보 인증키).");
    process.exit(2);
  }
  const args = process.argv.slice(2);
  const fromStr = /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args[0] : "2024-01-01";
  const days = Number(args[1] ?? 30);
  if (!Number.isFinite(days) || days <= 0) {
    console.error(`일수가 올바르지 않습니다: ${args[1]}`);
    process.exit(2);
  }

  const dates = dateRange(fromStr, days);
  console.log(`대조 시작: ${fromStr}부터 ${days}일, 위치=${LOCATION}\n`);

  let riseSetChecked = 0;
  let altitudeChecked = 0;
  let moonAgeChecked = 0;
  const suspects: string[] = [];
  const THRESHOLD_MIN = 5; // 분 단위 표기 반올림 감안 — 5분 넘게 벌어지면 의심
  const ALTITUDE_THRESHOLD_DEG = 1;
  const MOONAGE_THRESHOLD_DAYS = 1;

  for (const date of dates) {
    const locdate = `${date.y}${p2(date.mo)}${p2(date.d)}`;
    const label = `${date.y}-${p2(date.mo)}-${p2(date.d)}`;

    await sleep(300);
    const rs = await fetchRiseSet(locdate, key);
    if (rs) {
      const ours = riseSetOf(date);
      const pairs: Array<[string, string | null, unknown]> = [
        ["sunrise", ours.sunriseKst, rs.sunrise],
        ["sunset", ours.sunsetKst, rs.sunset],
        ["moonrise", ours.moonriseKst, rs.moonrise],
        ["moonset", ours.moonsetKst, rs.moonset],
      ];
      for (const [field, mine, kasiRaw] of pairs) {
        const kasiMin = hhmmToMinutes(kasiRaw);
        if (kasiMin === null || mine === null) continue; // 둘 중 하나라도 없으면(그날 미출몰 등) 대조 생략
        riseSetChecked++;
        const diff = Math.abs(hhmmClockToMinutes(mine) - kasiMin);
        if (diff > THRESHOLD_MIN) {
          const key2 = `${label} ${field}`;
          const known = KNOWN_KASI_DEFECTS.get(key2);
          const line = `${label} ${field}: 엔진 ${mine} vs KASI ${String(kasiRaw)} (${diff}분 차)`;
          if (known) console.log(`  · ${line} — 확인된 KASI 오류(${known})`);
          else suspects.push(line);
        }
      }
    } else {
      console.log(`${label}: 출몰시각 조회 불가 — 건너뜀`);
    }

    await sleep(300);
    const alt = await fetchAltitude(locdate, key);
    const kasiAltitude = alt ? parseDms(alt.altitudeMeridian) : null;
    if (kasiAltitude !== null) {
      altitudeChecked++;
      const mine = sunAltitudeOf(date).altitudeDeg;
      const diff = Math.abs(mine - kasiAltitude);
      if (diff > ALTITUDE_THRESHOLD_DEG) {
        suspects.push(`${label} 남중고도: 엔진 ${mine.toFixed(2)}도 vs KASI ${kasiAltitude.toFixed(2)}도 (${diff.toFixed(2)}도 차)`);
      }
    } else {
      console.log(`${label}: 태양고도 조회 불가 — 건너뜀`);
    }

    await sleep(300);
    const moon = await fetchMoonAge(date.y, date.mo, date.d, key);
    if (moon && typeof moon.lunAge !== "undefined") {
      moonAgeChecked++;
      const mine = moonPhaseOf(date).ageDays;
      const kasi = Number(moon.lunAge);
      if (Number.isFinite(kasi)) {
        const diff = Math.abs(mine - kasi);
        // 월령은 삭 경계(29.5일 주기 이월) 근처에서 정의상 며칠 차이가 날 수 있어 넉넉히 잡는다.
        if (diff > MOONAGE_THRESHOLD_DAYS && diff < 28) {
          suspects.push(`${label} 월령: 엔진 ${mine.toFixed(2)}일 vs KASI ${kasi}일 (${diff.toFixed(2)}일 차)`);
        }
      }
    } else {
      console.log(`${label}: 월령 조회 불가 — 건너뜀`);
    }
  }

  console.log(`\n=== 요약 ===`);
  console.log(`출몰시각 대조: ${riseSetChecked}건 / 태양고도 대조: ${altitudeChecked}건 / 월령 대조: ${moonAgeChecked}건`);

  if (riseSetChecked === 0 && altitudeChecked === 0 && moonAgeChecked === 0) {
    console.error("\n⚠ 아무것도 대조하지 못했습니다 — 인증키(3개 서비스 모두 활용신청 필요)·네트워크·범위를 확인하세요.");
    process.exit(1);
  }
  if (suspects.length) {
    console.error(`\n⚠ 새로운 이상 ${suspects.length}건:`);
    suspects.forEach((s) => console.error("  " + s));
    process.exit(1);
  }
  console.log("KASI와 새로운 차이 없음.");
}

main();
