import type { ChatInput, InterpretProvider } from "./provider";
import { chatSystemPrompt } from "./chat-prompt";

// OpenRouter Provider — OpenAI 호환 chat completions API 하나로 여러 모델(무료 :free 포함)에
// 접근한다. REST 직접 호출(SDK 의존 없음). 서버 전용. 키 없음/오류 시 throw → 상위 폴백 체인이
// 템플릿으로 대체(설계서 §8). 무료 모델 라인업은 OpenRouter 쪽에서 종종 바뀌므로 모델을
// OPENROUTER_MODEL 환경변수로 오버라이드할 수 있게 해둔다 — 다만 "월 고정비 0원" 원칙
// (CLAUDE.md)을 지키려면 반드시 ":free" 접미사가 붙은 모델로만 바꿀 것. 유료 모델 전환은
// 수익 발생 후 별도 어댑터로.
//
// 기본값 선정 근거(2026-07-16 실측): 후보 여러 개를 실제 톤 가드·프로필 맥락 반영 품질로
// 비교했다. deepseek-chat-v3.1:free는 무료 라인업에서 이미 빠졌고(404), qwen3-next·
// llama-3.3-70b·gemma-4-31b는 공용 무료 풀 과부하로 429, nemotron 계열은 추론 과정
// 텍스트("We need to respond...")가 그대로 새어 나와 부적합했다. gemma-4-26b-a4b-it은
// 4/4 케이스 모두 톤 가드 통과 + 존댓말 일관 + 사주/MBTI/별자리 맥락을 자연스럽게 녹여
// 가장 안정적이었다.
const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterProvider implements InterpretProvider {
  async chat(input: ChatInput): Promise<string> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("openrouter:no-key");
    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

    const messages = [
      { role: "system", content: chatSystemPrompt(input) },
      ...input.history.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: input.message },
    ];

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.9,
        max_tokens: 300,
      }),
    });
    if (!res.ok) throw new Error(`openrouter:http-${res.status}`);
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text || !text.trim()) throw new Error("openrouter:empty");
    return text.trim();
  }
}
