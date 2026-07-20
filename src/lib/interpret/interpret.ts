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
    // 무료 티어 모델(OpenRouter :free 등)은 부하 시 대기열에 걸려 응답이 느려질 수 있고,
    // premium/report 모드는 응답 예산이 커서(openrouter-provider.ts) 생성 자체도 오래 걸릴 수
    // 있어 여유를 두었다 — 그래도 넘기면 정상 경로인 템플릿 폴백으로(설계서 §8). 호출부
    // ("use server" 액션)도 Vercel 함수 제한 시간을 이 값보다 넉넉히 잡아야 한다(maxDuration).
    const text = await withTimeout(llm.chat(input), 25000);
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
