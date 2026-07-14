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
  /** P7 프리미엄 — 구독 만료 시각(0004 마이그레이션 전이거나 무료면 null/undefined). */
  premium_until?: string | null;
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

export interface ChatMessageRow {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  source: "llm" | "template" | null;
  created_at: string;
}
