import type { EngineInput } from "../types";

export interface ManseCase {
  label: string;
  input: EngineInput;
  expect: { year: string; month: string; day: string; hour: string | null };
}

/**
 * 만세력 대조 코퍼스 (21건).
 *
 * 검증 방법 — 각 케이스의 4주를 독립 규칙으로 감사(audit):
 *   - 년주: (절기해-4) 60갑자 공식 (입춘 기준 절기해)
 *   - 월주: 오호둔(五虎遁) — 년간 → 월간 관계
 *   - 시주: 오서둔(五鼠遁) — 일간 → 시간 관계
 *   - 일주: JDN 연속 60갑자. 앵커 2000-01-07=갑자.
 *
 * 일주 앵커 외부 확정 (2026-07-14):
 *   - 1900-01-01 = 갑술일(干支序数 11) — 干支纪日 표준 계산 기준일
 *   - 1900-04-20 = 계해일(序数 60=0)
 *   위 두 문헌 기준일을 공식 (JDN+49)%60 이 정확히 재현하며, 동일 공식이
 *   2000-01-07=갑자를 산출(상호 정합). 앵커는 객관적으로 확정됨.
 *
 * 월지는 절기(節) 경계에서 충분히 떨어진 날짜만 사용해 ±수분 근사 오차의
 * 영향을 배제. (절기 경계 분단위 케이스는 KASI 패치 후 별도 추가.)
 */
export const CASES: ManseCase[] = [
  // ── 경계 유형 (손계산 검증) ──
  {
    label: "앵커일 정오(2000-01-07 12:30) — 기묘 정축 갑자 경오",
    input: { birthDate: "2000-01-07", birthTime: "12:30", timeUnknown: false, bloodType: "A", mbti: "ENFP" },
    expect: { year: "기묘", month: "정축", day: "갑자", hour: "경오" },
  },
  {
    label: "자시 경계 23:30(2000-01-07) — 일주가 을축으로, 야자시 병자",
    input: { birthDate: "2000-01-07", birthTime: "23:30", timeUnknown: false, bloodType: "O", mbti: "INTJ" },
    expect: { year: "기묘", month: "정축", day: "을축", hour: "병자" },
  },
  {
    label: "입춘 전날(2000-02-03 10:00) — 전년(기묘) 귀속",
    input: { birthDate: "2000-02-03", birthTime: "10:00", timeUnknown: false, bloodType: "B", mbti: "ISFJ" },
    expect: { year: "기묘", month: "정축", day: "신묘", hour: "계사" },
  },
  {
    label: "출생시간 미상(1988-12-31) — hour=null",
    input: { birthDate: "1988-12-31", birthTime: null, timeUnknown: true, bloodType: "AB", mbti: "ESTP" },
    expect: { year: "무진", month: "갑자", day: "경신", hour: null },
  },
  {
    label: "현대 사례(1995-08-20 14:30) — 을해 갑신 계미 기미",
    input: { birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false, bloodType: "A", mbti: "ENFP" },
    expect: { year: "을해", month: "갑신", day: "계미", hour: "기미" },
  },
  {
    label: "현대 사례(1990-05-15 08:00) — 경오 신사 경진 경진",
    input: { birthDate: "1990-05-15", birthTime: "08:00", timeUnknown: false, bloodType: "B", mbti: "INFJ" },
    expect: { year: "경오", month: "신사", day: "경진", hour: "경진" },
  },

  // ── 오호둔·오서둔 다양성 감사 (년간 5군 × 일간 5군 × 사계절 × 시지) ──
  {
    label: "1984-03-15 09:00 — 갑자 정묘 무신 정사 (갑기년 인월=병인)",
    input: { birthDate: "1984-03-15", birthTime: "09:00", timeUnknown: false, bloodType: "A", mbti: "ENTJ" },
    expect: { year: "갑자", month: "정묘", day: "무신", hour: "정사" },
  },
  {
    label: "1985-05-15 22:00 — 을축 신사 갑인 을해 (을경년 인월=무인)",
    input: { birthDate: "1985-05-15", birthTime: "22:00", timeUnknown: false, bloodType: "B", mbti: "INFP" },
    expect: { year: "을축", month: "신사", day: "갑인", hour: "을해" },
  },
  {
    label: "1986-08-10 03:00 — 병인 병신 병술 경인 (병신년 인월=경인)",
    input: { birthDate: "1986-08-10", birthTime: "03:00", timeUnknown: false, bloodType: "O", mbti: "ISTP" },
    expect: { year: "병인", month: "병신", day: "병술", hour: "경인" },
  },
  {
    label: "1987-11-20 15:00 — 정묘 신해 계유 경신 (정임년 인월=임인)",
    input: { birthDate: "1987-11-20", birthTime: "15:00", timeUnknown: false, bloodType: "AB", mbti: "ENFJ" },
    expect: { year: "정묘", month: "신해", day: "계유", hour: "경신" },
  },
  {
    label: "1988-02-20 11:00 — 무진 갑인 을사 임오 (무계년 인월=갑인)",
    input: { birthDate: "1988-02-20", birthTime: "11:00", timeUnknown: false, bloodType: "A", mbti: "ESFJ" },
    expect: { year: "무진", month: "갑인", day: "을사", hour: "임오" },
  },
  {
    label: "1991-06-25 19:00 — 신미 갑오 병인 무술",
    input: { birthDate: "1991-06-25", birthTime: "19:00", timeUnknown: false, bloodType: "B", mbti: "INTP" },
    expect: { year: "신미", month: "갑오", day: "병인", hour: "무술" },
  },
  {
    label: "1992-09-30 07:00 — 임신 기유 기유 무진",
    input: { birthDate: "1992-09-30", birthTime: "07:00", timeUnknown: false, bloodType: "O", mbti: "ESTJ" },
    expect: { year: "임신", month: "기유", day: "기유", hour: "무진" },
  },
  {
    label: "1993-12-15 23:30 — 계유 갑자 신미 무자 (야자시)",
    input: { birthDate: "1993-12-15", birthTime: "23:30", timeUnknown: false, bloodType: "AB", mbti: "ENTP" },
    expect: { year: "계유", month: "갑자", day: "신미", hour: "무자" },
  },
  {
    label: "2001-04-10 05:00 — 신사 임진 계묘 을묘",
    input: { birthDate: "2001-04-10", birthTime: "05:00", timeUnknown: false, bloodType: "A", mbti: "ISFP" },
    expect: { year: "신사", month: "임진", day: "계묘", hour: "을묘" },
  },
  {
    label: "2010-07-15 12:00 — 경인 계미 병인 갑오",
    input: { birthDate: "2010-07-15", birthTime: "12:00", timeUnknown: false, bloodType: "B", mbti: "ESFP" },
    expect: { year: "경인", month: "계미", day: "병인", hour: "갑오" },
  },
  {
    label: "2015-10-15 08:00 — 을미 병술 갑자 무진",
    input: { birthDate: "2015-10-15", birthTime: "08:00", timeUnknown: false, bloodType: "O", mbti: "INTJ" },
    expect: { year: "을미", month: "병술", day: "갑자", hour: "무진" },
  },
  {
    label: "2003-01-10 14:00 — 임오(전년) 계축 계미 기미 (입춘 전)",
    input: { birthDate: "2003-01-10", birthTime: "14:00", timeUnknown: false, bloodType: "A", mbti: "INFJ" },
    expect: { year: "임오", month: "계축", day: "계미", hour: "기미" },
  },
  {
    label: "1976-08-15 00:30 — 병진 병신 기해 갑자 (조자시)",
    input: { birthDate: "1976-08-15", birthTime: "00:30", timeUnknown: false, bloodType: "B", mbti: "ENFP" },
    expect: { year: "병진", month: "병신", day: "기해", hour: "갑자" },
  },
  {
    label: "2024-12-21 18:30 — 갑진 병자 기미 계유",
    input: { birthDate: "2024-12-21", birthTime: "18:30", timeUnknown: false, bloodType: "AB", mbti: "ENTJ" },
    expect: { year: "갑진", month: "병자", day: "기미", hour: "계유" },
  },
  {
    label: "1999-11-15 06:00 — 기묘 을해 신미 신묘",
    input: { birthDate: "1999-11-15", birthTime: "06:00", timeUnknown: false, bloodType: "O", mbti: "ISFJ" },
    expect: { year: "기묘", month: "을해", day: "신미", hour: "신묘" },
  },
];
