// P8 3단계 요금제 — 마음/고민 상담 접근 규칙. 챗·고민 양쪽이 같은 규칙을 쓰므로 한 곳에 둔다.
//
// 1단계(비로그인)  — 프로필·데일리까지만, 상담 자체가 막힘(각 액션의 auth 체크에서 차단).
// 2단계(로그인)    — 마음·고민 각각 하루 1회 무료.
// 3단계(구독)      — 그 이상은 consult_credits(구매한 상담 크레딧)로 이어간다.
// 레거시 30일 이용권(premium_until)은 구매 당시 약속대로 계속 무제한 유지.

/** 무제한을 뜻하는 잔여 횟수 센티널(서버 액션 직렬화 때문에 Infinity 대신 사용). */
export const UNLIMITED = -1;

/** 로그인 사용자가 하루에 무료로 나눌 수 있는 상담 횟수(마음·고민 각각). */
export const FREE_DAILY_CONSULT = 1;

/** 레거시 프리미엄 여부 — premium_until이 미래면 참. */
export function isPremium(premiumUntil: string | null | undefined, now: Date): boolean {
  if (!premiumUntil) return false;
  const t = new Date(premiumUntil).getTime();
  return Number.isFinite(t) && t > now.getTime();
}

export interface ConsultAccess {
  /** 이번 상담 요청을 진행해도 되는지. */
  allowed: boolean;
  /** 이번 상담이 무료 슬롯이 아니라 크레딧을 소비하는지(고퀄 유료 모델 사용 여부와 연결). */
  usesCredit: boolean;
  /** 화면 표시용 잔여치. 무제한이면 UNLIMITED. */
  remaining: number;
}

/**
 * 오늘 이 상담(마음 또는 고민 — 종류별로 따로 호출)을 진행할 수 있는지 판정한다.
 * 우선순위: 레거시 무제한 → 오늘의 무료 1회 → 보유 크레딧 → 차단.
 */
export function consultAccess(
  premiumUntil: string | null | undefined,
  credits: number,
  usedToday: number,
  now: Date,
): ConsultAccess {
  if (isPremium(premiumUntil, now)) return { allowed: true, usesCredit: false, remaining: UNLIMITED };

  const freeLeft = Math.max(0, FREE_DAILY_CONSULT - usedToday);
  if (freeLeft > 0) return { allowed: true, usesCredit: false, remaining: freeLeft + credits };
  if (credits > 0) return { allowed: true, usesCredit: true, remaining: credits };
  return { allowed: false, usesCredit: false, remaining: 0 };
}

// ── P9 §6.3 / IA 2단계: 풀이 상품 접근 규칙 ───────────────────────────────
// 이 함수 하나가 모든 풀이 잠금의 단일 진실 공급원이다. 크레딧 "차감 실행"은 3단계 —
// 여기서는 consumesCredit 판정만 한다. 상품 메타(제목·페르소나)는 persona/products.ts.

export type ReadingProduct =
  | "chongun" | "career" | "love" | "wealth" | "match" | "marriage";

export interface ReadingUserState {
  loggedIn: boolean;
  credits: number;
  premiumUntil?: string | null;
  now: Date;
}

export interface ReadingAccess {
  allowed: boolean;
  /** 잠금 사유 — CTA가 갈린다(P9 §5.1): login="로그인하고 무료로", credit="크레딧으로 열기" */
  lockReason: "login" | "credit" | null;
  consumesCredit: boolean;
}

/** 풀이 상품 접근 판정: 비로그인→login / 총운→로그인 무료 / 레거시 무제한 / 크레딧 / credit 잠금. */
export function readingAccess(product: ReadingProduct, s: ReadingUserState): ReadingAccess {
  if (!s.loggedIn) return { allowed: false, lockReason: "login", consumesCredit: false };
  if (product === "chongun") return { allowed: true, lockReason: null, consumesCredit: false };
  if (isPremium(s.premiumUntil, s.now)) return { allowed: true, lockReason: null, consumesCredit: false };
  if (s.credits > 0) return { allowed: true, lockReason: null, consumesCredit: true };
  return { allowed: false, lockReason: "credit", consumesCredit: false };
}
