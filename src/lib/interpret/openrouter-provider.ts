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
// P8 유료 상담 크레딧 전용 모델 — 무료 라인업보다 지시 순응도가 높은 유료 모델로,
// 존댓말·톤 규칙을 더 안정적으로 지킨다는 전제로 골랐다. OPENROUTER_PREMIUM_MODEL로 교체
// 가능(구독 매출로 사용량 비용을 충당하는 구조라 "월 고정비 0원" 원칙과는 별개— 변동비).
const PREMIUM_DEFAULT_MODEL = "anthropic/claude-3.5-haiku";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterOptions {
  /** true면 P8 상담 크레딧을 소비하는 자리(마음 챗·고민 상담) — 유료 모델·확장 프롬프트·
   *  더 긴 대화형 응답(4~7문장). OPENROUTER_PREMIUM_MODEL이 유효한 모델을 가리켜야 동작한다
   *  (계정에 결제 수단 없이 유료 모델을 쓰면 OpenRouter가 404/"No endpoints found"를 낸다 —
   *  이때는 상위 폴백 체인이 템플릿으로 조용히 대체한다). */
  premium?: boolean;
  /** true면 크레딧 풀이(직업/연애/재물/결혼·궁합) 전용 — "구조를 조금 더 풀어쓴 서술형"
   *  응답 예산으로 늘린다. premium 없이 단독으로 켜면 무료 모델 그대로 쓰되(2026-07-20
   *  실측: 결제 수단 없는 계정에서 premium 기본 모델이 404) 무료 모델의 느린 생성 속도에
   *  맞춰 예산을 보수적으로 잡는다. premium과 함께 켜면(유효한 유료 모델 설정 시) 더 크게
   *  잡는다 — 유료 모델이 보통 훨씬 빠르다. */
  longForm?: boolean;
  /** true면 P8 로그인 전용 심층 리포트(다중 섹션) — 무료 모델 그대로, 응답 예산만 크게. */
  report?: boolean;
}

export class OpenRouterProvider implements InterpretProvider {
  constructor(private opts: OpenRouterOptions = {}) {}

  async chat(input: ChatInput): Promise<string> {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("openrouter:no-key");
    const model = this.opts.premium
      ? process.env.OPENROUTER_PREMIUM_MODEL || PREMIUM_DEFAULT_MODEL
      : process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

    const messages = [
      {
        role: "system",
        content: chatSystemPrompt(input, {
          premium: this.opts.premium, longForm: this.opts.longForm, report: this.opts.report,
        }),
      },
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
        temperature: this.opts.report ? 0.85 : (this.opts.longForm || this.opts.premium) ? 0.8 : 0.9,
        // longForm 예산(2026-07-20 실측 반영): 무료 모델(gemma-4-26b-a4b-it:free)은 초당
        // ~33~36 토큰으로 느리고 가변적이라(공용 무료 풀), interpret.ts의 25초 내부 타임아웃
        // 안에 안전하게 끝내려면 800 토큰 정도가 상한이다(여유분 포함). premium까지 함께 켜면
        // (유효한 유료 모델 설정 시) 유료 모델이 보통 훨씬 빨라 1800까지 넉넉히 잡는다.
        // report(온보딩 심층 리포트)는 건드리지 않는다 — 실측 결과 예산을 1200·1400·2600 중
        // 어느 쪽으로 둬도 42~73초가 걸려 무료 모델 생성 속도 자체가 병목이었다(기존 동작 유지).
        max_tokens: this.opts.report
          ? 1200
          : this.opts.longForm
            ? (this.opts.premium ? 1800 : 800)
            : this.opts.premium ? 600 : 300,
      }),
    });
    if (!res.ok) throw new Error(`openrouter:http-${res.status}`);
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text || !text.trim()) throw new Error("openrouter:empty");
    return text.trim();
  }
}
