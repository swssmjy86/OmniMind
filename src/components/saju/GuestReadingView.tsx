"use client";

import { useEffect, useState } from "react";
import { loadDraft, saveDraft, isCompleteDraft, type Draft } from "@/app/onboarding/draft";
import { computeGuestChongun, computeGuestCreditReading } from "@/lib/readings/guest-actions";
import type { CreditReadingProduct } from "@/lib/interpret/content/credit-readings";
import { normalizeMbti } from "@/lib/interpret/content/traits";
import { PRODUCT_PERSONA } from "@/lib/persona/products";
import ReadingInputSheet, { type ReadingSheetValues } from "@/components/saju/ReadingInputSheet";
import SajuChart from "@/components/profile/SajuChart";
import ShareSheet from "@/components/share/ShareSheet";
import { profileCardQuery } from "@/lib/share/card-copy";
import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "@/lib/interpret/types";

type Status = "loading" | "input" | "ready" | "error";

/** 시트를 띄워야 하는 draft 상태인지 — 사주 입력 미비 또는 보조축(MBTI·혈액형) 미입력. */
function needsInput(draft: Draft | null): boolean {
  return (
    !draft || !isCompleteDraft(draft) || !normalizeMbti(draft.mbti) || !draft.blood
  );
}

/**
 * 총운/사주상품(직업·연애·재물·결혼) 게스트 뷰 — "풀이 보러 가기"를 누르는 순간 필요한
 * 입력(생년월일·시간·MBTI·혈액형)이 없으면 입력 시트가 뜬다(2026-07-23 스펙). 입력은
 * localStorage draft에만 저장하고 매번 새로 계산한다(저장·캐시 없음). LLM 개인화 문단은
 * 없다 — guest-actions.ts가 애초에 호출하지 않는다(로그인 시 받는 보너스로 남겨둠).
 */
export default function GuestReadingView({
  product, title,
}: {
  product: "chongun" | CreditReadingProduct;
  /** ShareSheet 카드 제목 — 닉네임이 준비된 뒤 조립되므로 접미사만 받는다. 예: "총운" */
  title: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ctx, setCtx] = useState<ProfileContext | null>(null);
  const [sections, setSections] = useState<InterpretationSection[]>([]);

  const compute = async (d: Draft) => {
    const r = product === "chongun"
      ? await computeGuestChongun(d)
      : await computeGuestCreditReading(product, d);
    if (r.ok) {
      setCtx(r.ctx);
      setSections(r.sections);
      setStatus("ready");
    } else {
      setStatus("error");
    }
  };

  useEffect(() => {
    // 마운트 후 1회만 localStorage를 읽어 상태를 정한다(외부 스토어 구독이 아니라 최초 1회
    // 동기화라 set-state-in-effect 휴리스틱의 대상이 아니다 — today/TodayFreeFlow.tsx와 동일 근거).
    const d = loadDraft();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(d);
    if (needsInput(d)) {
      setStatus("input");
      return;
    }
    let cancelled = false;
    (async () => {
      if (!cancelled) await compute(d!);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const onSheetSubmit = async (v: ReadingSheetValues) => {
    // 기존 draft의 닉네임·입력을 보존하며 갱신 — 시트는 닉네임을 묻지 않는다(스펙).
    const next: Draft = {
      nickname: draft?.nickname ?? "",
      birthDate: v.birthDate || draft?.birthDate || "",
      birthTime: v.timeUnknown ? "" : v.birthTime,
      timeUnknown: v.timeUnknown,
      gender: v.gender ?? draft?.gender ?? null,
      mbti: v.mbti,
      blood: v.blood,
    };
    saveDraft(next);
    setDraft(next);
    setStatus("loading");
    await compute(next);
  };

  if (status === "input") {
    return (
      <ReadingInputSheet
        mode="full"
        personaId={PRODUCT_PERSONA[product]}
        initial={{
          birthDate: draft?.birthDate ?? "",
          birthTime: draft?.timeUnknown ? "" : draft?.birthTime ?? "",
          gender: draft?.gender ?? null,
          mbti: draft?.mbti ?? undefined,
          blood: draft?.blood ?? undefined,
        }}
        onSubmit={onSheetSubmit}
      />
    );
  }

  if (status === "loading") {
    return <p className="mt-6 text-center text-sm text-text-soft">불러오는 중…</p>;
  }

  if (status === "error" || !ctx) {
    return (
      <p className="mt-6 text-center text-sm text-text-soft">
        지금은 풀이를 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.
      </p>
    );
  }

  const cardTitle = draft?.nickname ? `${draft.nickname}님의 ${title}` : `나의 ${title}`;
  return (
    <>
      {product === "chongun" && (
        <div className="mt-6">
          <SajuChart ctx={ctx} />
        </div>
      )}
      <div className="mt-6 space-y-4">
        {sections.map((s, i) => (
          <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              {s.title}
            </h2>
            <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ))}
      </div>
      <ShareSheet
        query={profileCardQuery(ctx, cardTitle.slice(0, 20), sections)}
        via="reading"
        label="풀이 카드"
      />
      <p className="mt-4 text-center text-xs text-text-soft">
        로그인하면 이 풀이에 더 깊은 개인화 문단까지 무료로 더해드리고, 기록도 저장돼요.
      </p>
    </>
  );
}
