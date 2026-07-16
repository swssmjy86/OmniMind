import type { ChatInput, InterpretProvider } from "./provider";
import { TemplateProvider } from "./template-provider";
import { OpenRouterProvider } from "./openrouter-provider";
import { checkTone } from "./tone-guard";

export interface ChatResponse {
  text: string;
  source: "llm" | "template";
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * 3단 폴백 체인: LLM(1단계, OpenRouter 무료 모델) 시도 → 실패/톤위반/타임아웃 → 템플릿(0단계).
 * 절대 예외를 밖으로 던지지 않는다. LLM 장애는 정상 경로(설계서 §8).
 */
export async function respond(
  input: ChatInput,
  deps: { llm?: InterpretProvider; template?: InterpretProvider } = {},
): Promise<ChatResponse> {
  const llm = deps.llm ?? new OpenRouterProvider();
  const template = deps.template ?? new TemplateProvider();

  try {
    const text = await withTimeout(llm.chat(input), 8000);
    if (text.trim() && checkTone(text).length === 0) {
      return { text: text.trim(), source: "llm" };
    }
    // 빈 응답 또는 톤 위반 → 폴백
  } catch {
    // 키 없음·쿼터 소진·오류·타임아웃 → 폴백
  }

  const text = await template.chat(input);
  return { text, source: "template" };
}
