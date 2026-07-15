export type BloodType = "A" | "B" | "O" | "AB";
export type Mbti =
  | "INTJ" | "INTP" | "ENTJ" | "ENTP"
  | "INFJ" | "INFP" | "ENFJ" | "ENFP"
  | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ"
  | "ISTP" | "ISFP" | "ESTP" | "ESFP";

/** 오행: 목0 화1 토2 금3 수4 (생 순환 인덱스) */
export type ElementIndex = 0 | 1 | 2 | 3 | 4;

/** 하나의 기둥(주): 천간 인덱스 0~9, 지지 인덱스 0~11 */
export interface Pillar {
  stem: number; // 0=갑 … 9=계
  branch: number; // 0=자 … 11=해
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null; // 출생시간 미상이면 null
}

export interface EngineInput {
  birthDate: string; // "YYYY-MM-DD" (KST 벽시계)
  birthTime: string | null; // "HH:mm" | null
  timeUnknown: boolean;
  bloodType: BloodType;
  mbti: Mbti;
  /** 선택 — 있으면 대운(10년 단위 운의 흐름)까지 계산한다 */
  gender?: "male" | "female";
}
