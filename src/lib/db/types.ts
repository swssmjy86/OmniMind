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
