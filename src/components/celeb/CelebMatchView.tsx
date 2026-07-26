"use client";

import { useState, useTransition } from "react";
import Choice from "@/components/ui/Choice";
import ReviewPrompt from "@/components/reviews/ReviewPrompt";
import { unlockMatchDeep } from "@/lib/readings/actions";
import { computeGuestMatchDeep } from "@/lib/readings/guest-actions";
import {
  CELEBRITIES, CELEB_CATEGORIES, type CelebCategory, type Celebrity,
} from "@/lib/celeb/celebrities";
import type { Draft } from "@/app/onboarding/draft";
import type { InterpretationSection } from "@/lib/interpret/types";

// 엔진 import 금지(번들 보호) — 모드는 로컬 상수. 슬러그는 서버에서 검증·변환된다.
// MatchDeepForm과 같은 세 갈래를 쓰되, 유명인 상대라 "동료" 대신 "닮은 결"을 묻는 문구로.
const MODES = [
  { slug: "lover", label: "연인이라면" },
  { slug: "friend", label: "친구라면" },
  { slug: "coworker", label: "함께 일한다면" },
] as const;

/**
 * 유명인 사주 궁합(2026-07-26) — 인물을 고르면 기존 궁합 심층 경로를 그대로 태운다.
 * 새 계산 엔진은 없다: 유명인 생년월일을 "상대"로 넣어 computeDeepMatch가 돌 뿐이다.
 * 로그인이면 unlockMatchDeep(LLM 개인화·캐시 포함), 게스트면 computeGuestMatchDeep(템플릿까지).
 */
export default function CelebMatchView({
  remaining,
  unlimited,
  myDraft,
}: {
  remaining: number;
  unlimited: boolean;
  myDraft?: Draft | null;
}) {
  const [category, setCategory] = useState<CelebCategory>("music");
  const [picked, setPicked] = useState<Celebrity | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [result, setResult] = useState<
    { sections: InterpretationSection[]; readingId: string | null } | null
  >(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  // 게스트는 크레딧 개념이 없다 — 부모가 unlimited를 안 넘겨도 여기서 스스로 방어한다.
  const effectiveUnlimited = unlimited || Boolean(myDraft);

  function reset() {
    setResult(null);
    setPicked(null);
    setMode(null);
    setError(false);
  }

  const open = () => {
    if (!picked || !mode) return;
    setError(false);
    startTransition(async () => {
      // 출생 시각은 공개된 적이 없어 전원 시간 미상으로 본다(celebrities.ts 원칙 2).
      const partner = {
        birthDate: picked.birthDate, birthTime: "", timeUnknown: true, mode,
        partnerName: picked.name,
      };
      const r = myDraft
        ? await computeGuestMatchDeep(myDraft, partner)
        : await unlockMatchDeep(partner);
      if (r.ok) setResult({ sections: r.sections, readingId: r.readingId });
      else setError(true);
    });
  };

  if (result && picked) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-text-soft">
          {picked.name}님과의 결 — {MODES.find((m) => m.slug === mode)?.label}
        </p>
        {result.sections.map((s, i) => (
          <section key={`${i}-${s.title}`} className="rounded-card bg-warm-surface p-5">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              {s.title}
            </h2>
            <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ))}
        {result.readingId && <ReviewPrompt readingId={result.readingId} />}
        <button
          type="button"
          onClick={reset}
          className="press mt-2 block w-full rounded-card bg-warm-surface py-3.5 text-center text-sm text-text-main"
        >
          다른 사람과도 맞춰보기
        </button>
        <Notice />
      </div>
    );
  }

  if (!effectiveUnlimited && remaining <= 0) {
    return (
      <div className="mt-5 rounded-card bg-warm-surface p-5 text-center">
        <p className="text-sm text-text-soft">
          지금은 남은 크레딧이 없네요. 채우고 나면 다시 맞춰볼 수 있어요.
        </p>
      </div>
    );
  }

  const list = CELEBRITIES.filter((c) => c.category === category);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        {CELEB_CATEGORIES.map((c) => (
          <Choice
            key={c.id}
            small
            selected={category === c.id}
            onClick={() => {
              setCategory(c.id);
              setPicked(null);
            }}
            unselectedBg="bg-warm-surface"
          >
            {c.label}
          </Choice>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {list.map((c) => {
          const on = picked?.id === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setPicked(on ? null : c)}
                aria-pressed={on}
                className={`press block w-full rounded-card p-4 text-left ${
                  on ? "bg-primary-green/10 ring-1 ring-primary-green/40" : "bg-warm-surface"
                }`}
              >
                <span className="block text-text-main">{c.name}</span>
                <span className="mt-0.5 block text-sm text-text-soft">{c.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {picked && (
        <div className="mt-5 rounded-card bg-warm-surface p-5">
          <span className="block text-sm text-text-soft">
            {picked.name}님과 어떤 사이로 맞춰볼까요?
          </span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <Choice
                key={m.slug}
                small
                selected={mode === m.slug}
                onClick={() => setMode(m.slug)}
                unselectedBg="bg-warm-base"
              >
                {m.label}
              </Choice>
            ))}
          </div>
          <button
            type="button"
            disabled={!mode || pending}
            onClick={open}
            className="press mt-5 w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
          >
            {pending ? "두 사람의 결을 살펴보는 중…" : "맞춰보기 ✨"}
          </button>
          {error && (
            <p className="mt-2 text-center text-sm text-accent-coral">
              지금은 풀이가 어려워요. 잠시 뒤 다시 시도해 주세요.
            </p>
          )}
        </div>
      )}

      <Notice />
    </div>
  );
}

/** 공개 정보 기반이라는 한계를 밝히는 고지 — 결과 화면과 목록 화면 모두에 둔다. */
function Notice() {
  return (
    <p className="mt-6 rounded-card bg-warm-surface p-4 text-xs leading-relaxed text-text-soft">
      널리 공개된 생년월일만 썼어요. 태어난 시각은 알려지지 않아 시주 없이 세 기둥으로만 보았고,
      해외에서 태어난 분은 시차로 하루 차이가 날 수 있어요. 가볍게 재미로 읽어주세요.
    </p>
  );
}
