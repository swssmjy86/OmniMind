"use server";

import { respond } from "@/lib/interpret/interpret";
import type { ProfileContext } from "@/lib/engine";
import type { ChatMsg } from "@/lib/interpret/provider";

export type SendResult =
  | { ok: true; reply: string; source: "llm" | "template" }
  | { ok: false };

/**
 * 마음 챗 — 익명. 프로필 맥락과 대화 기록을 받아 respond()로 답한다. 저장·계정·쿼터 없음.
 * 기록은 클라이언트(localStorage)가 관리하고, 이 액션은 LLM 프록시 역할만 한다
 * (OpenRouter 키는 서버 전용이라 서버 액션으로 남긴다). 무료 티어 모델을 쓴다.
 */
export async function sendMessage(args: {
  profile: ProfileContext;
  nickname: string;
  history: ChatMsg[];
  message: string;
}): Promise<SendResult> {
  const text = args.message.trim();
  if (!text) return { ok: false };
  try {
    const r = await respond({
      profile: args.profile,
      nickname: args.nickname,
      history: args.history,
      message: text,
    });
    return { ok: true, reply: r.text, source: r.source };
  } catch {
    return { ok: false };
  }
}
