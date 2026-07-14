import type { ProfileContext } from "@/lib/engine";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface ChatInput {
  profile: ProfileContext;
  nickname: string;
  history: ChatMsg[]; // 최근 대화(오래된→최신)
  message: string; // 이번 사용자 메시지
}

/** 해석 생성 단일 인터페이스. 유료 전환 시 어댑터만 추가(설계서 §2). */
export interface InterpretProvider {
  chat(input: ChatInput): Promise<string>;
}
