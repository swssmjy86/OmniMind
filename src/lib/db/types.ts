import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "@/lib/interpret/types";

export interface ProfileRow {
  user_id: string;
  nickname: string;
  birth_date: string; // "YYYY-MM-DD"
  birth_time: string | null; // "HH:mm:ss"
  time_unknown: boolean;
  blood_type: "A" | "B" | "O" | "AB";
  mbti: string;
  profile_context: ProfileContext;
  /** P7 프리미엄(레거시 이용권) — 구독 만료 시각(0004 마이그레이션 전이거나 무료면 null/undefined). */
  premium_until?: string | null;
  /** 대운 — 성별(선택). 0006 마이그레이션 전이거나 미입력이면 null/undefined. */
  gender?: string | null;
  /** P8 상담 크레딧 잔액 — 하루 1회 무료 이후 마음/고민 상담에 쓰인다. 0008 이전이면 undefined. */
  consult_credits?: number;
  created_at: string;
  updated_at: string;
}

export interface InterpretationRow {
  id: string;
  user_id: string;
  kind: "profile" | "daily" | "advice";
  target_date: string | null;
  body: InterpretationSection[];
  source: "template" | "llm";
  created_at: string;
}

export interface ConnectionRow {
  id: string;
  token: string;
  mode: "lover" | "friend" | "coworker";
  status: "pending" | "accepted";
  inviter_id: string;
  inviter_nickname: string;
  inviter_profile: ProfileContext;
  invitee_id: string | null;
  invitee_nickname: string | null;
  invitee_profile: ProfileContext | null;
  created_at: string;
  accepted_at: string | null;
}

/** P7-3 결제 기록 — 쓰기는 service role 전용(0007), 클라이언트는 본인 행 조회만. */
export interface PaymentRow {
  id: string;
  user_id: string;
  order_id: string;
  payment_key: string | null;
  amount: number;
  status: "pending" | "done" | "failed";
  raw: Record<string, unknown> | null;
  created_at: string;
  approved_at: string | null;
  /** 이 주문으로 연장된 premium_until. done인데 null이면 부여 누락 — 재확인 시 자가 복구. */
  granted_until: string | null;
  /** P8 — 주문 종류. 0008 이전 행은 전부 'pass'(기본값). */
  kind?: "pass" | "credits";
  /** P8 — 구매한 크레딧 수량(kind='credits'일 때만). */
  credits?: number | null;
  /** P8 — 이 주문으로 부여된 크레딧. done인데 null이면 부여 누락 — 재확인 시 자가 복구. */
  granted_credits?: number | null;
}

export interface ChatMessageRow {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  source: "llm" | "template" | null;
  created_at: string;
}
