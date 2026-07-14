// 한국 서머타임(일광절약시간) 시행 구간 — 벽시계가 표준시+1h 이던 기간.
// 이 구간 출생은 시계가 앞당겨져 있었으므로 −1h 하여 실제 표준시로 되돌린 뒤 사주를 세운다.
// 구간 경계(월·일·시각)는 국가기록원/KASI 기록 기준. 시행 요약:
//   1948~1951, 1955~1960 (이승만 정부), 1987~1988 (서울올림픽 대비).
// 각 연도 시행 일자가 상이하므로 정밀 일시로 고정한다. (타깃 1990+ 세대엔 무영향)
export interface DstPeriod {
  start: string; // KST 벽시계 시작(이 시각부터 +1h 적용)
  end: string; // KST 벽시계 종료(이 시각에 원위치)
}

// KST 벽시계 문자열로 저장. 정밀 일시는 공식 기록으로 확정하여 채운다.
// 아래 1987/1988은 널리 확인되는 값. 1948~1960 구간은 확정 후 추가.
export const DST_PERIODS: DstPeriod[] = [
  { start: "1987-05-10T02:00", end: "1987-10-11T03:00" },
  { start: "1988-05-08T02:00", end: "1988-10-09T03:00" },
  // TODO(확정): 1948, 1949, 1950, 1951, 1955, 1956, 1957, 1958, 1959, 1960 구간
];

const toEpoch = (kst: string) => Date.parse(`${kst}:00+09:00`);
const PERIODS = DST_PERIODS.map((p) => ({ start: toEpoch(p.start), end: toEpoch(p.end) }));

/** 서머타임 구간 출생이면 −1h 보정한 실제 표준시 instant 반환. */
export function applyDst(instant: Date): Date {
  const t = instant.getTime();
  for (const p of PERIODS) {
    if (t >= p.start && t < p.end) return new Date(t - 3600_000);
  }
  return instant;
}
