import type { ChatInput, InterpretProvider } from "./provider";
import { dominantCategory } from "./content/ten-gods";

// Gemini 무료티어 Provider(1단계). REST 직접 호출(SDK 의존 없음). 서버 전용.
// 키 없음/오류 시 throw → 상위 폴백 체인이 템플릿으로 대체(설계서 §8).
const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function systemPrompt(input: ChatInput): string {
  const p = input.profile;
  return [
    "당신은 '옴니마인드'의 따뜻한 동반자예요. 사주·MBTI·혈액형·별자리를 아는 채로 공감하며 대화해요.",
    "문체 규칙(반드시 지켜요):",
    "- 단정하지 않기(‘~입니다’ 금지, ‘~한 면이 있으시군요’처럼).",
    "- 명령하지 않기(‘~하세요’ 금지, ‘~해보는 건 어때요?’처럼).",
    "- 분석 용어·공포 표현 금지. ‘회원님/사용자님’ 대신 닉네임으로 불러요.",
    "- 2~4문장으로 짧고 다정하게.",
    `상대의 이름: ${input.nickname}`,
    `상대의 결: 일간 ${p.dayMaster.stem}(${p.dayMaster.element}), 강한 오행 ${p.elements.dominant}, 별자리 ${p.zodiac}, MBTI ${p.mbti.type}.`,
    // 사주 전체 맥락 — 네 기둥·옅은 오행·십성 갈래까지 알고 대화한다(토큰 소폭).
    `사주 네 기둥: 년 ${p.pillars.year} · 월 ${p.pillars.month} · 일 ${p.pillars.day} · 시 ${p.pillars.hour ?? "미상"}.`,
    `옅은 오행: ${p.elements.lacking.length ? p.elements.lacking.join("·") : "없음"} / 두드러진 십성 갈래: ${dominantCategory(p.tenGods)}.`,
    ...(p.daeun ? [`지금의 큰 흐름: ${p.daeun.direction} 대운, ${p.daeun.startAge}세 시작.`] : []),
  ].join("\n");
}

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
        systemInstruction: { parts: [{ text: systemPrompt(input) }] },
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
