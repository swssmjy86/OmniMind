import { kstStringToInstant } from "./kst";

// 기록된 벽시계(출생신고서에 적힌 그 시각) → 실제 절대 시각.
// 이 엔진은 모든 입력을 동경 135°(UTC+9) 벽시계로 읽지만, 한국의 시계는 늘 그렇지 않았다.
// 서머타임으로 앞당겨져 있기도 했고, 기준 자오선 자체가 동경 127.5°이던 시절도 있다.
// 여기서 그 역사적 차이를 되돌린 뒤에야 사주를 세울 수 있다.
//
// 경계는 모두 '기록된 벽시계'로 표기하고 판정도 기록 벽시계로 한다 —
// 입력을 +09:00으로 파싱한 가상의 오프셋이 양쪽에서 상쇄되므로 비교가 성립한다.

export interface WallClockEra {
  start: string; // KST 벽시계 시작(포함)
  end: string; // KST 벽시계 종료(제외)
}

/**
 * 서머타임(일광절약시간) 시행 구간 — 벽시계가 표준시+1h 이던 기간.
 * 이 구간 출생은 시계가 앞당겨져 있었으므로 −1h 하여 실제 표준시로 되돌린다.
 * 출처: tzdata Rule ROK / 국가기록원. 연도마다 시행일이 달라 정밀 일시로 고정한다.
 *   1948~51·1955~60(이승만 정부), 1987~88(서울올림픽 대비).
 * 해제 시각 직전 1시간은 시계를 되돌려 두 번 존재한 벽시계다 — 기록만으로 구분할 수 없어
 * '첫 번째 발생'(서머타임 쪽)으로 해석한다.
 */
export const DST_PERIODS: readonly WallClockEra[] = [
  { start: "1948-06-01T00:00", end: "1948-09-13T00:00" },
  { start: "1949-04-03T00:00", end: "1949-09-11T00:00" },
  { start: "1950-04-01T00:00", end: "1950-09-10T00:00" },
  { start: "1951-05-06T00:00", end: "1951-09-09T00:00" },
  { start: "1955-05-05T00:00", end: "1955-09-09T00:00" },
  { start: "1956-05-20T00:00", end: "1956-09-30T00:00" },
  { start: "1957-05-05T00:00", end: "1957-09-22T00:00" },
  { start: "1958-05-04T00:00", end: "1958-09-21T00:00" },
  { start: "1959-05-03T00:00", end: "1959-09-20T00:00" },
  { start: "1960-05-01T00:00", end: "1960-09-18T00:00" },
  { start: "1987-05-10T02:00", end: "1987-10-11T03:00" },
  { start: "1988-05-08T02:00", end: "1988-10-09T03:00" },
];

/**
 * 시계가 동경 127.5°(UTC+8:30) 기준이던 구간 — 지금 기준보다 30분 느렸다.
 * 출처: tzdata Asia/Seoul (`8:30 ... 1912 Jan 1`, `8:30 ROK ... 1961 Aug 10`).
 * 이 구간 기록에 30분을 더해야 동경 135° 기준의 같은 순간이 된다 — 이 엔진이 쓰는 기준이자
 * 만세력 다수 관례와 같다(동경 127.5°를 기준으로 삼는 학파는 이 구간을 보정하지 않는다).
 *
 * 1954-03-21 00:00에 시계를 30분 되돌렸으므로 3/20 23:30~23:59는 두 번 존재했다 —
 * 서머타임 해제 때와 같이 '첫 번째 발생'(보정 전 시대)으로 본다.
 *
 * 1908-04-01 이전은 표준시 이전의 지방평균시(서울 +8:27:52)라 단일 보정이 성립하지 않고,
 * 애초에 벽시계로 시각을 적던 시대가 아니라 보정하지 않는다(서비스 대상 밖).
 */
export const HALF_HOUR_ERAS: readonly WallClockEra[] = [
  { start: "1908-04-01T00:00", end: "1912-01-01T00:00" },
  { start: "1954-03-21T00:00", end: "1961-08-10T00:00" },
];

const HOUR_MS = 3600_000;
const HALF_HOUR_MS = 30 * 60_000;

/** 벽시계 구간 목록 → epoch 범위. 판정은 항상 '기록된 벽시계'로 한다. */
const toRanges = (eras: readonly WallClockEra[]) =>
  eras.map((e) => ({ start: kstStringToInstant(e.start).getTime(), end: kstStringToInstant(e.end).getTime() }));

const DST_RANGES = toRanges(DST_PERIODS);
const HALF_HOUR_RANGES = toRanges(HALF_HOUR_ERAS);

const within = (ranges: { start: number; end: number }[], recorded: Date) => {
  const t = recorded.getTime();
  return ranges.some((r) => t >= r.start && t < r.end);
};

/** 기록된 벽시계가 서머타임 구간에 속하는가. */
export const inDst = (recorded: Date): boolean => within(DST_RANGES, recorded);

/** 기록된 벽시계가 UTC+8:30 시대에 속하는가. */
export const inHalfHourEra = (recorded: Date): boolean => within(HALF_HOUR_RANGES, recorded);

/**
 * 기록된 벽시계 → 실제 절대 시각. 서머타임(−1h)과 표준시 오프셋(+30m)을 함께 되돌린다.
 * 두 보정 모두 판정 기준은 '기록된 벽시계'라 적용 순서에 무관하다 —
 * 1955~60년 여름은 두 구간에 동시에 속한다(순 −30분).
 */
export function toTrueInstant(recorded: Date): Date {
  let t = recorded.getTime();
  if (inDst(recorded)) t -= HOUR_MS;
  if (inHalfHourEra(recorded)) t += HALF_HOUR_MS;
  return new Date(t);
}
