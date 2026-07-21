"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDraft, isCompleteDraft } from "@/app/onboarding/draft";
import { computeGuestChongun, computeGuestCreditReading } from "@/lib/readings/guest-actions";
import type { CreditReadingProduct } from "@/lib/interpret/content/credit-readings";
import SajuChart from "@/components/profile/SajuChart";
import ShareSheet from "@/components/share/ShareSheet";
import { profileCardQuery } from "@/lib/share/card-copy";
import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "@/lib/interpret/types";

type Status = "loading" | "no-draft" | "ready" | "error";

/**
 * 총운/사주상품(직업·연애·재물·결혼) 게스트 뷰 — 로그인이 아니라 "온보딩 draft가 있는지"로
 * 갈린다(onboarding/draft.ts, 게스트도 온보딩만 마치면 로컬에 남는 프로필 입력). 있으면 매번
 * 새로 계산해 보여주고(저장·캐시 없음), 없으면 온보딩으로 안내한다. LLM 개인화 문단은 없다 —
 * guest-actions.ts가 애초에 호출하지 않는다(로그인 시 받는 보너스로 남겨둠).
 */
export default function GuestReadingView({
  product, title,
}: {
  product: "chongun" | CreditReadingProduct;
  /** ShareSheet 카드 제목 — 닉네임이 준비된 뒤 조립되므로 접미사만 받는다. 예: "총운" */
  title: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [ctx, setCtx] = useState<ProfileContext | null>(null);
  const [sections, setSections] = useState<InterpretationSection[]>([]);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    // 마운트 후 1회만 localStorage를 읽어 상태를 정한다(외부 스토어 구독이 아니라 최초 1회
    // 동기화라 set-state-in-effect 휴리스틱의 대상이 아니다 — today/TodayFreeFlow.tsx와 동일 근거).
    const draft = loadDraft();
    if (!draft || !isCompleteDraft(draft)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("no-draft");
      return;
    }
    setNickname(draft.nickname);
    let cancelled = false;
    (async () => {
      const r = product === "chongun"
        ? await computeGuestChongun(draft)
        : await computeGuestCreditReading(product, draft);
      if (cancelled) return;
      if (r.ok) {
        setCtx(r.ctx);
        setSections(r.sections);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [product]);

  if (status === "loading") {
    return <p className="mt-6 text-center text-sm text-text-soft">불러오는 중…</p>;
  }

  if (status === "no-draft") {
    return (
      <section className="mt-6 rounded-card border border-accent-coral/30 bg-warm-surface p-5">
        <p className="text-text-soft">
          이 풀이를 보려면 먼저 <span className="text-text-main">당신의 여덟 글자</span>가 필요해요.
        </p>
        <Link
          href="/onboarding"
          className="press mt-4 block w-full rounded-card bg-accent-coral py-3.5 text-center font-medium text-white"
        >
          나를 알아보기 ✨
        </Link>
      </section>
    );
  }

  if (status === "error" || !ctx) {
    return (
      <p className="mt-6 text-center text-sm text-text-soft">
        지금은 풀이를 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.
      </p>
    );
  }

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
        query={profileCardQuery(ctx, `${nickname}님의 ${title}`.slice(0, 20), sections)}
        via="reading"
        label="풀이 카드"
      />
      <p className="mt-4 text-center text-xs text-text-soft">
        로그인하면 이 풀이에 더 깊은 개인화 문단까지 무료로 더해드리고, 기록도 저장돼요.
      </p>
    </>
  );
}
