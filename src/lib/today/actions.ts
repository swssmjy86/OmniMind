"use server";

import { computeProfile } from "@/lib/engine/index";
import { computeDaily } from "@/lib/engine/daily";
import { assembleDaily, dailyPrompt } from "@/lib/interpret/content/daily";
import { toKstParts } from "@/lib/engine/kst";
import { respond } from "@/lib/interpret/interpret";
import { PRODUCT_PERSONA } from "@/lib/persona/products";

export interface GuestDailyExtras {
  /** 계산 기준 KST 날짜(YYYY-MM-DD) — 클라이언트의 하루 캐시 키. */
  date: string;
  /** 내 일간으로 본 오늘 — 십성 개인화 한 줄. */
  personal: string | null;
  /** 내 띠와 오늘 — 년지 × 오늘 일진의 관계. */
  zodiac: { animal: string; line: string } | null;
  /** AI가 다듬은 오늘의 이야기 — 무료 LLM 1회 시도, 실패하면 null(카드 생략, §8). */
  story: string | null;
}

/**
 * 비로그인 오늘의운세 개인화(2026-07-24 블러 해제) — 예전 블러 티저 3장(일간·띠·AI)을
 * 전부 연다. localStorage에만 있는 태어난 날/시간을 클라이언트가 넘기고, 엔진·LLM은
 * 서버에만 둔다. LLM 호출은 클라이언트가 (날짜+생일)로 하루 캐시해 기기당 하루 1회로
 * 줄인다 — 무료 쿼터 보호(호출부 TodayFreeFlow 참고).
 */
export async function computeGuestDailyExtras(
  birthDate: string,
  birthTime: string,
): Promise<GuestDailyExtras | null> {
  try {
    const timeUnknown = birthTime === "";
    const ctx = computeProfile({
      birthDate, birthTime: timeUnknown ? null : birthTime, timeUnknown,
    });
    const t = toKstParts(new Date());
    const daily = computeDaily(
      { y: t.y, mo: t.mo, d: t.d }, ctx.dayMaster.element, ctx.dayMaster.stem,
    );
    const guide = assembleDaily(daily, undefined, ctx.pillars);

    // 3단 해석 엔진의 ③LLM — 실패는 정상 경로(템플릿 폴백 대신 카드 생략).
    let story: string | null = null;
    const r = await respond(
      {
        profile: ctx, nickname: "", history: [],
        message: dailyPrompt(daily, guide),
        personaId: PRODUCT_PERSONA.today,
      },
      { template: { chat: async () => "" } },
    );
    if (r.source === "llm" && r.text) story = r.text;

    return {
      date: daily.date,
      personal: guide.personal ?? null,
      zodiac: guide.zodiacSign ?? null,
      story,
    };
  } catch {
    return null; // 형식이 어긋나도 무료 공통 화면은 그대로 유지
  }
}
