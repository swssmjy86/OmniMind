import { applyDst } from "./dst";
import { kstStringToInstant } from "./kst";

// 기록된 벽시계(출생신고서에 적힌 그 시각) → 실제 절대 시각.
// 이 엔진은 모든 입력을 동경 135°(UTC+9) 벽시계로 읽지만, 한국의 시계는 늘 그렇지 않았다.
// 여기서 역사적 차이를 되돌린 뒤에야 사주를 세울 수 있다.

/**
 * 시계가 동경 127.5°(UTC+8:30) 기준이던 구간 — 지금 기준보다 30분 느렸다.
 * 출처: tzdata Asia/Seoul (`8:30 ... 1912 Jan 1`, `8:30 ROK ... 1961 Aug 10`).
 * 이 구간 기록에 30분을 더해야 동경 135° 기준의 같은 순간이 된다 — 만세력 관례와 같다.
 *
 * 경계 표기는 '기록된 벽시계' 기준이다(판정도 기록 벽시계로 하므로 서로 상쇄된다).
 * 1954-03-21 00:00에 시계를 30분 되돌렸으므로 3/20 23:30~23:59는 두 번 존재했다 —
 * 기록만으로는 구분할 수 없어, 서머타임 해제 때와 같이 '첫 번째 발생'(보정 전 시대)으로 본다.
 *
 * 1908-04-01 이전은 표준시 이전의 지방평균시(서울 +8:27:52)라 단일 보정이 성립하지 않고,
 * 애초에 벽시계로 시각을 적던 시대가 아니라 보정하지 않는다(서비스 대상 밖).
 */
export const HALF_HOUR_ERAS = [
  { start: "1908-04-01T00:00", end: "1912-01-01T00:00" },
  { start: "1954-03-21T00:00", end: "1961-08-10T00:00" },
] as const;

const HALF_HOUR_MS = 30 * 60_000;

const ERAS = HALF_HOUR_ERAS.map((e) => ({
  start: kstStringToInstant(e.start).getTime(),
  end: kstStringToInstant(e.end).getTime(),
}));

/** 기록된 벽시계가 UTC+8:30 시대에 속하는가. */
export function inHalfHourEra(recorded: Date): boolean {
  const t = recorded.getTime();
  return ERAS.some((e) => t >= e.start && t < e.end);
}

/**
 * 기록된 벽시계 → 실제 절대 시각. 서머타임(−1h)과 표준시 오프셋(+30m)을 함께 되돌린다.
 * 두 보정 모두 판정 기준은 항상 '기록된 벽시계'다 — 한쪽을 보정한 값으로 다른 쪽을 판정하면
 * 경계에서 결과가 순서에 따라 달라진다(예: 1955년 여름은 두 구간에 동시에 속한다).
 */
export function toTrueInstant(recorded: Date): Date {
  let t = applyDst(recorded).getTime(); // 서머타임 구간이면 −1h (판정은 recorded로)
  if (inHalfHourEra(recorded)) t += HALF_HOUR_MS;
  return new Date(t);
}
