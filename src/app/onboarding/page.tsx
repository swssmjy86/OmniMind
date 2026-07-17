"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { computeProfile, type ProfileContext } from "@/lib/engine";
import { zodiacSign } from "@/lib/engine/zodiac";
import { assembleProfile } from "@/lib/interpret/templates";
import type { InterpretationSection } from "@/lib/interpret/types";
import type { BloodType, Mbti } from "@/lib/engine/types";
import { saveProfile } from "./actions";
import { saveDraft, loadDraft, clearDraft, isCompleteDraft, type Draft } from "./draft";
import SajuChart from "@/components/profile/SajuChart";
import Choice from "@/components/ui/Choice";

const BLOODS: BloodType[] = ["A", "B", "O", "AB"];
const MBTIS: Mbti[] = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];

interface Result {
  ctx: ProfileContext;
  sections: InterpretationSection[];
  nickname: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    nickname: "", birthDate: "", birthTime: "", timeUnknown: false,
    bloodType: null, mbti: null, gender: null,
  });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"pending" | "saved" | "guest" | "error">("pending");

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function finishWith(d: Draft) {
    try {
      const ctx = computeProfile({
        birthDate: d.birthDate,
        birthTime: d.timeUnknown ? null : d.birthTime,
        timeUnknown: d.timeUnknown,
        bloodType: d.bloodType!,
        mbti: d.mbti!,
        gender: d.gender ?? undefined,
      });
      const nickname = d.nickname.trim() || "당신";
      const sections = assembleProfile(ctx, nickname);
      setResult({ ctx, sections, nickname });
      setStep(5);
      // 로그인 왕복(OAuth)에 대비해 draft 보존 — 저장 성공 시 삭제
      saveDraft(d);
      // 로그인 상태면 백그라운드로 저장(best-effort). 미리보기는 항상 동작.
      setSaveState("pending");
      saveProfile({
        nickname: d.nickname.trim() || "당신",
        birthDate: d.birthDate,
        birthTime: d.timeUnknown ? null : d.birthTime,
        timeUnknown: d.timeUnknown,
        bloodType: d.bloodType!,
        mbti: d.mbti!,
        gender: d.gender ?? null,
      }).then((r) => {
        if (r.saved) {
          clearDraft();
          setSaveState("saved");
        } else {
          setSaveState(r.reason === "not-authenticated" ? "guest" : "error");
        }
      });
    } catch {
      setError("입력을 다시 확인해 주세요.");
    }
  }

  const finish = () => finishWith(draft);

  // 로그인 복귀(?resume=1): 보존된 draft로 자동 재계산·저장을 이어간다.
  // 렌더 캐스케이드를 피하기 위해 마운트 직후 태스크로 미룬다.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).get("resume")) return;
    const d = loadDraft();
    if (!d || !isCompleteDraft(d)) return;
    const t = setTimeout(() => finishWith(d), 0);
    return () => clearTimeout(t);
  }, []);

  if (step === 5 && result) {
    return <ProfileView nickname={result.nickname} result={result} saveState={saveState} />;
  }

  const zodiacPreview =
    draft.birthDate.length === 10
      ? zodiacSign(Number(draft.birthDate.slice(5, 7)), Number(draft.birthDate.slice(8, 10)))
      : null;

  const canNext =
    (step === 0 && draft.nickname.trim().length > 0) ||
    (step === 1 && draft.birthDate.length === 10 && (draft.timeUnknown || draft.birthTime.length === 5)) ||
    (step === 2 && draft.bloodType !== null) ||
    (step === 3 && draft.mbti !== null) ||
    step === 4;

  return (
    <main className="flex min-h-dvh flex-col p-6">
      <Progress step={step} total={5} />

      <div className="mt-8 flex-1">
        {step === 0 && (
          <Field
            title="어떻게 불러드리면 좋을까요?"
            hint="편하게 부를 이름을 알려주세요."
          >
            <input
              autoFocus
              value={draft.nickname}
              onChange={(e) => set({ nickname: e.target.value })}
              placeholder="예: 다인"
              maxLength={12}
              className="w-full rounded-card border border-text-soft/30 bg-warm-surface px-4 py-3.5 text-lg outline-none focus:border-primary-green"
            />
          </Field>
        )}

        {step === 1 && (
          <Field
            title="당신이 세상에 온 순간을 알려주세요."
            hint="그 순간의 하늘이 당신의 첫 이야기예요."
          >
            <label className="mb-2 block text-sm text-text-soft">생년월일</label>
            <input
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              value={draft.birthDate}
              onChange={(e) => set({ birthDate: e.target.value })}
              className="w-full rounded-card border border-text-soft/30 bg-warm-surface px-4 py-3.5 text-lg outline-none focus:border-primary-green"
            />
            <label className="mt-5 mb-2 block text-sm text-text-soft">태어난 시간</label>
            <input
              type="time"
              value={draft.birthTime}
              disabled={draft.timeUnknown}
              onChange={(e) => set({ birthTime: e.target.value })}
              className="w-full rounded-card border border-text-soft/30 bg-warm-surface px-4 py-3.5 text-lg outline-none focus:border-primary-green disabled:opacity-40"
            />
            <label className="mt-3 flex items-center gap-2 text-text-soft">
              <input
                type="checkbox"
                checked={draft.timeUnknown}
                onChange={(e) => set({ timeUnknown: e.target.checked })}
                className="h-4 w-4 accent-primary-green"
              />
              태어난 시간을 몰라요
            </label>

            <label className="mt-5 mb-2 block text-sm text-text-soft">
              성별 (알려주시면 10년 단위 운의 흐름까지 읽어드려요)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Choice
                selected={draft.gender === "male"}
                onClick={() => set({ gender: draft.gender === "male" ? null : "male" })}
              >
                남성
              </Choice>
              <Choice
                selected={draft.gender === "female"}
                onClick={() => set({ gender: draft.gender === "female" ? null : "female" })}
              >
                여성
              </Choice>
            </div>
          </Field>
        )}

        {step === 2 && (
          <Field title="혈액형을 알려주세요." hint="작은 조각도 당신의 일부예요.">
            <div className="grid grid-cols-2 gap-3">
              {BLOODS.map((b) => (
                <Choice key={b} selected={draft.bloodType === b} onClick={() => set({ bloodType: b })}>
                  {b}형
                </Choice>
              ))}
            </div>
          </Field>
        )}

        {step === 3 && (
          <Field title="MBTI는 무엇인가요?" hint="아직 모른다면 대략 골라도 괜찮아요.">
            <div className="grid grid-cols-4 gap-2">
              {MBTIS.map((m) => (
                <Choice key={m} small selected={draft.mbti === m} onClick={() => set({ mbti: m })}>
                  {m}
                </Choice>
              ))}
            </div>
          </Field>
        )}

        {step === 4 && (
          <Field title="별자리를 확인했어요." hint="생년월일에서 자동으로 찾았어요.">
            <div className="rounded-card bg-warm-surface p-6 text-center">
              <p className="font-[family-name:var(--font-serif-kr)] text-3xl text-primary-green">
                {zodiacPreview ?? "—"}
              </p>
              <p className="mt-3 text-text-soft">이제 당신을 알아갈 준비가 됐어요.</p>
            </div>
          </Field>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-accent-coral">{error}</p>}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="rounded-card border border-text-soft/30 px-5 py-3.5 text-text-soft"
          >
            이전
          </button>
        )}
        {step < 4 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
          >
            다음
          </button>
        ) : (
          <button
            onClick={finish}
            className="flex-1 rounded-card bg-primary-green py-3.5 font-medium text-white"
          >
            나를 알아보기 ✨
          </button>
        )}
      </div>
    </main>
  );
}

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary-green" : "bg-text-soft/20"}`}
        />
      ))}
    </div>
  );
}

function Field({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl leading-snug text-primary-green">
        {title}
      </h1>
      <p className="mt-2 mb-6 text-text-soft">{hint}</p>
      {children}
    </div>
  );
}

function ProfileView({
  nickname, result, saveState,
}: { nickname: string; result: Result; saveState: "pending" | "saved" | "guest" | "error" }) {
  const [revealing, setRevealing] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setRevealing(false), 1600);
    return () => clearTimeout(t);
  }, []);

  const { ctx, sections } = result;

  if (revealing) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6">
        <p className="animate-pulse font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
          당신의 조각들을 잇는 중이에요…
        </p>
      </main>
    );
  }

  return (
    <main className="p-6 pb-24">
      <p className="text-text-soft">온전한 나</p>
      <h1 className="mt-1 font-[family-name:var(--font-serif-kr)] text-3xl text-primary-green">
        {nickname}님의 이야기
      </h1>

      {/* 사주 명식(전문 뷰) — 비로그인도 그대로 본다(요약하지 않는다) */}
      <div className="mt-6">
        <SajuChart ctx={ctx} />
      </div>

      {/* 해석 섹션 전체 */}
      <div className="mt-6 space-y-4">
        {sections.map((s) => (
          <section key={s.title} className="rounded-card bg-warm-surface p-5">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              {s.title}
            </h2>
            <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ))}
      </div>

      {saveState === "saved" && (
        <p className="mt-8 text-center text-sm text-primary-green">
          이 이야기를 저장했어요. &lsquo;나&rsquo; 탭에서 언제든 다시 볼 수 있어요 🌿
        </p>
      )}
      {saveState === "error" && (
        <p className="mt-8 text-center text-sm text-text-soft">
          저장이 잠시 어려웠어요. 이야기는 그대로 볼 수 있고, 다음 방문 때 다시 이어둘게요 🌿
        </p>
      )}
      {(saveState === "guest" || saveState === "pending") && (
        <section className="mt-8 rounded-card bg-warm-surface p-5 text-center">
          <p className="text-sm text-text-soft">
            지금은 미리보기예요. 로그인하면 이 이야기를 저장하고, 사주·MBTI·혈액형·별자리를 더
            깊이 엮은 이야기와 매일의 기운도 받아볼 수 있어요.
          </p>
          <Link
            href="/login"
            onClick={() => {
              // 로그인 후 이 자리로 돌아와 자동 저장을 이어가도록 목적지를 쿠키로
              document.cookie = `om_next=${encodeURIComponent("/onboarding?resume=1")}; path=/; max-age=600; samesite=lax`;
            }}
            className="mt-4 block w-full rounded-card bg-accent-coral py-3.5 font-medium text-white"
          >
            로그인하고 저장하기
          </Link>
        </section>
      )}
      <Link
        href="/"
        className="mt-3 block w-full rounded-card border border-text-soft/30 py-3.5 text-center text-text-soft"
      >
        홈으로
      </Link>
    </main>
  );
}
