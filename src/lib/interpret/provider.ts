import type { ProfileContext } from "@/lib/engine";
import type { PersonaId } from "@/lib/persona/personas";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface ChatInput {
  profile: ProfileContext;
  nickname: string;
  history: ChatMsg[]; // 최근 대화(오래된→최신)
  message: string; // 이번 사용자 메시지
  /** 어느 페르소나 화면에서 왔는지 — 있으면 그 페르소나의 말투(personas.ts)로 답한다.
   *  없으면(마음 챗 등 특정 상품에 안 묶인 자리) 기본 옴니마인드 동반자 목소리. */
  personaId?: PersonaId;
}

/** 해석 생성 단일 인터페이스. 유료 전환 시 어댑터만 추가(설계서 §2). */
export interface InterpretProvider {
  chat(input: ChatInput): Promise<string>;
}
