"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { computeProfile, type ProfileContext } from "@/lib/engine";
import { zodiacSign } from "@/lib/engine/zodiac";
import { assembleProfile } from "@/lib/interpret/templates";
import type { InterpretationSection } from "@/lib/interpret/types";
import type { BloodType, Mbti } from "@/lib/engine/types";

const BLOODS: BloodType[] = ["A", "B", "O", "AB"];
const MBTIS: Mbti[] = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];
const ELEMENTS = ["목", "화", "토", "금", "수"] as const;

interface Draft {
  nickname: string;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  bloodType: BloodType | null;
  mbti: Mbti | null;
}

interface Result {
  ctx: ProfileContext;
  sections: InterpretationSection[];
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    nickname: "", birthDate: "", birthTime: "", timeUnknown: false,
    bloodType: null, mbti: null,
  });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function finish() {
    try {
      const ctx = computeProfile({
        birthDate: draft.birthDate,
        birthTime: draft.timeUnknown ? null : draft.birthTime,
        timeUnknown: draft.timeUnknown,
        bloodType: draft.bloodType!,
        mbti: draft.mbti!,
      });
      const sections = assembleProfile(ctx, draft.nickname.trim() || "당신");
      setResult({ ctx, sections });
      setStep(5);
    } catch {
      setError("입력을 다시 확인해 주세요.");
    }
  }

  if (step === 5 && result) {
    return <ProfileView nickname={draft.nickname.trim() || "당신"} result={result} />;
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
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col p-6">
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

function Choice({
  children, selected, onClick, small,
}: { children: React.ReactNode; selected: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-card border py-3 font-medium transition ${small ? "text-sm" : "text-lg"} ${
        selected
          ? "border-primary-green bg-primary-green text-white"
          : "border-text-soft/30 bg-warm-surface text-text-main"
      }`}
    >
      {children}
    </button>
  );
}

function ProfileView({ nickname, result }: { nickname: string; result: Result }) {
  const [revealing, setRevealing] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setRevealing(false), 1600);
    return () => clearTimeout(t);
  }, []);

  const { ctx, sections } = result;
  const max = Math.max(...Object.values(ctx.elements.counts), 1);

  if (revealing) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center p-6">
        <p className="animate-pulse font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
          당신의 조각들을 잇는 중이에요…
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[480px] p-6 pb-24">
      <p className="text-text-soft">온전한 나</p>
      <h1 className="mt-1 font-[family-name:var(--font-serif-kr)] text-3xl text-primary-green">
        {nickname}님의 이야기
      </h1>

      {/* 사주 4주 */}
      <div className="mt-6 grid grid-cols-4 gap-2 text-center">
        {[
          ["시주", ctx.pillars.hour],
          ["일주", ctx.pillars.day],
          ["월주", ctx.pillars.month],
          ["년주", ctx.pillars.year],
        ].map(([label, val]) => (
          <div key={label} className="rounded-card bg-warm-surface py-4">
            <p className="text-xs text-text-soft">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-serif-kr)] text-xl text-primary-green">
              {val ?? "—"}
            </p>
          </div>
        ))}
      </div>

      {/* 오행 균형 */}
      <div className="mt-4 rounded-card bg-warm-surface p-4">
        <p className="mb-3 text-sm text-text-soft">오행의 균형</p>
        <div className="space-y-2">
          {ELEMENTS.map((e) => (
            <div key={e} className="flex items-center gap-3">
              <span className="w-5 text-sm text-text-main">{e}</span>
              <div className="h-2.5 flex-1 rounded-full bg-text-soft/15">
                <div
                  className="h-2.5 rounded-full bg-accent-coral"
                  style={{ width: `${(ctx.elements.counts[e] / max) * 100}%` }}
                />
              </div>
              <span className="w-4 text-right text-xs text-text-soft">{ctx.elements.counts[e]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 해석 섹션 */}
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

      <p className="mt-8 text-center text-xs text-text-soft">
        지금은 미리보기예요. 로그인하고 저장하면 언제든 다시 볼 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-4 block w-full rounded-card border border-text-soft/30 py-3.5 text-center text-text-soft"
      >
        홈으로
      </Link>
    </main>
  );
}
