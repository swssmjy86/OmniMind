"use server";

import { respond } from "@/lib/interpret/interpret";
import type { ProfileContext } from "@/lib/engine";
import type { ChatMsg } from "@/lib/interpret/provider";

// 익명·인증 없는 LLM 프록시라 입력을 서버에서 한 번 더 제한한다 — 무료 티어 쿼터를 겨냥한
// 증폭 남용(긴 메시지·긴 기록 반복 호출)을 줄이기 위해. 한 메시지·한 기록 항목의 상한과
// 프롬프트에 실을 최근 대화 개수를 서버가 강제한다(클라이언트 값은 신뢰하지 않는다).
const MESSAGE_MAX = 1000;
const HISTORY_MAX = 10;

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
  const text = args.message.trim().slice(0, MESSAGE_MAX);
  if (!text) return { ok: false };
  try {
    const history = (args.history ?? [])
      .slice(-HISTORY_MAX)
      .map((m) => ({ role: m.role, content: (m.content ?? "").slice(0, MESSAGE_MAX) }));
    const r = await respond({
      profile: args.profile,
      nickname: args.nickname,
      history,
      message: text,
    });
    return { ok: true, reply: r.text, source: r.source };
  } catch {
    return { ok: false };
  }
}
