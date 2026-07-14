import type { EngineInput } from "../types";

export interface ManseCase {
  label: string;
  input: EngineInput;
  expect: { year: string; month: string; day: string; hour: string | null };
}

/**
 * 대조 코퍼스.
 * 아래 6건은 손계산으로 완전 검증한 케이스:
 *   - 년주: (절기해-4) 60갑자 공식
 *   - 월주: 오호둔(五虎遁)
 *   - 일주: 앵커 2000-01-07=갑자 기준 JDN 산술
 *   - 시주: 오서둔(五鼠遁)
 * 경계 유형(자시 23시·입춘 전·출생시간 미상)을 포함한다.
 *
 * ⚠️ 남은 QA: 포스텔러(Forceteller) 기본 설정으로 30건까지 확장 대조 (외부 오라클).
 *    일주 앵커(2000-01-07=갑자)가 유일한 외부 가정이므로 이를 최우선 확인한다.
 */
export const CASES: ManseCase[] = [
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
    label: "입춘 전날(2000-02-03 10:00) — 전년(기묘)년 귀속",
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
];
