import type { ChatInput, InterpretProvider } from "./provider";
import { chatSystemPrompt } from "./chat-prompt";

// OpenRouter Provider — OpenAI 호환 chat completions API 하나로 여러 모델(무료 :free 포함)에
// 접근한다. REST 직접 호출(SDK 의존 없음). 서버 전용. 키 없음/오류 시 throw → 상위 폴백 체인이
// 템플릿으로 대체(설계서 §8). 무료 모델 라인업은 OpenRouter 쪽에서 종종 바뀌므로 모델을
// OPENROUTER_MODEL 환경변수로 오버라이드할 수 있게 해둔다 — 다만 "월 고정비 0원" 원칙
// (CLAUDE.md)을 지키려면 반드시 ":free" 접미사가 붙은 모델로만 바꿀 것. 유료 모델 전환은
// 수익 발생 후 별도 어댑터로.
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3.1:free";
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
