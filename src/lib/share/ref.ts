// P4-2 유입 추적 — 공유 링크의 ?ref=card&via=<진입점> 파라미터를 쿠키로 보존한다.
// 온보딩 완료 시 이 쿠키를 유입 경로로 기록해 "공유 카드 경유 가입"을 추적한다(§P4 완료 기준).

export const REF_COOKIE = "om_ref";
export const REF_MAX_AGE_DAYS = 30;

export interface RefInfo {
  ref: string; // 유입 매체 (card 등)
  via: string | null; // 진입점 (profile | daily 등)
}

const TOKEN = /^[\w-]{1,32}$/;

/** location.search → 유입 정보. ref가 없거나 형식이 어긋나면 null. */
export function parseRef(search: string): RefInfo | null {
  const sp = new URLSearchParams(search);
  const ref = sp.get("ref");
  if (!ref || !TOKEN.test(ref)) return null;
  const via = sp.get("via");
  return { ref, via: via && TOKEN.test(via) ? via : null };
}

/** 쿠키 저장값 — "card:profile" 형태. */
export function refCookieValue(info: RefInfo): string {
  return info.via ? `${info.ref}:${info.via}` : info.ref;
}

/** 쿠키 저장값 → 유입 정보 (서버에서 기록 시 사용). */
export function parseRefCookie(value: string): RefInfo | null {
  const [ref, via] = value.split(":");
  if (!ref || !TOKEN.test(ref)) return null;
  return { ref, via: via && TOKEN.test(via) ? via : null };
}
