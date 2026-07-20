// KASI(한국천문연구원) 천문현상정보(AstroEventInfoService) — 순수 계산이 아니라 KASI가
// 큐레이션한 이벤트 목록(유성우 절정일 등)이라 실제 API 호출이 필요하다.
// (월령·출몰시각·태양고도는 물리 계산이라 src/lib/engine/sky.ts가 astronomy-engine으로
// 직접 계산한다 — 이 모듈과 섞지 않는다.)
//
// 실패 시 무조건 throw — 호출부(astro-events-cache.ts)가 catch해 조용히 생략한다.
// (src/lib/interpret/openrouter-provider.ts와 같은 "throw 기반 폴백" 철학)
//
// API 스펙(data.go.kr "한국천문연구원_천문현상정보" 상세페이지, 2026-07-20 확인):
//   GET https://apis.data.go.kr/B090041/openapi/service/AstroEventInfoService/getAstroEventInfo
//   params: solYear(4자리), solMonth(2자리), numOfRows, pageNo, _type=json, ServiceKey
//   response: response.body.items.item[] — locdate(YYYYMMDD), astroTitle, astroTime, astroEvent

const ENDPOINT = "https://apis.data.go.kr/B090041/openapi/service/AstroEventInfoService/getAstroEventInfo";

export interface AstroEvent {
  title: string;
  time: string;
  description: string;
}

interface RawAstroItem {
  locdate?: unknown;
  astroTitle?: unknown;
  astroTime?: unknown;
  astroEvent?: unknown;
}

function isRawAstroItem(v: unknown): v is RawAstroItem {
  return typeof v === "object" && v !== null;
}

function parseItems(body: unknown): RawAstroItem[] {
  if (typeof body !== "object" || body === null) return [];
  const root = body as { response?: { body?: { items?: { item?: unknown } } } };
  const item = root.response?.body?.items?.item;
  if (Array.isArray(item)) return item.filter(isRawAstroItem);
  if (isRawAstroItem(item)) return [item];
  return [];
}

/**
 * 그날(solYear/solMonth/solDay)의 천문현상 목록. 그날 특이 현상이 없으면 빈 배열.
 * 키 없음/HTTP 오류/응답 형식 이상이면 throw — 호출부가 캐치해 조용히 생략한다.
 */
export async function fetchAstroEvents(date: { y: number; mo: number; d: number }): Promise<AstroEvent[]> {
  const key = process.env.KASI_SERVICE_KEY;
  if (!key) throw new Error("kasi:no-key");

  const mo = String(date.mo).padStart(2, "0");
  const url =
    `${ENDPOINT}?solYear=${date.y}&solMonth=${mo}&numOfRows=100&pageNo=1&_type=json` +
    `&ServiceKey=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`kasi:http-${res.status}`);

  const body: unknown = await res.json().catch(() => {
    throw new Error("kasi:bad-json");
  });
  const dateStr = `${date.y}${mo}${String(date.d).padStart(2, "0")}`;
  return parseItems(body)
    .filter((it) => String(it.locdate ?? "") === dateStr)
    .map((it) => ({
      title: String(it.astroTitle ?? ""),
      time: String(it.astroTime ?? ""),
      description: String(it.astroEvent ?? ""),
    }))
    .filter((e) => e.title.length > 0);
}
