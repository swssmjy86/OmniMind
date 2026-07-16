import type { ChatInput, InterpretProvider } from "./provider";
import { chatSystemPrompt } from "./chat-prompt";

// Gemini 무료티어 Provider — REST 직접 호출(SDK 의존 없음). 서버 전용.
// 키 없음/오류 시 throw → 상위 폴백 체인이 템플릿으로 대체(설계서 §8).
const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiProvider implements InterpretProvider {
  async chat(input: ChatInput): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("gemini:no-key");

    const contents = [
      ...input.history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: input.message }] },
    ];

    const res = await fetch(`${ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: chatSystemPrompt(input) }] },
        contents,
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
      }),
    });
    if (!res.ok) throw new Error(`gemini:http-${res.status}`);
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || !text.trim()) throw new Error("gemini:empty");
    return text.trim();
  }
}
