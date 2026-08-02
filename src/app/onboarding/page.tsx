"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { computeProfile, type ProfileContext } from "@/lib/engine";
import { zodiacSign } from "@/lib/engine/zodiac";
import { assembleProfile } from "@/lib/interpret/templates";
import type { InterpretationSection } from "@/lib/interpret/types";
import { saveDraft, type Draft } from "./draft";
import SajuChart from "@/components/profile/SajuChart";
import PersonaIntro from "@/components/persona/PersonaIntro";
import Choice from "@/components/ui/Choice";
import PickerInput from "@/components/ui/PickerInput";
import { PERSONAS } from "@/lib/persona/personas";
import { PERSONA_VIDEOS } from "@/lib/persona/videos";

interface Result {
  ctx: ProfileContext;
  sections: InterpretationSection[];
  nickname: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    nickname: "", birthDate: "", birthTime: "", timeUnknown: false, gender: null,
  });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function finishWith(d: Draft) {
    try {
      const ctx = computeProfile({
        birthDate: d.birthDate,
        birthTime: d.timeUnknown ? null : d.birthTime,
        timeUnknown: d.timeUnknown,
        gender: d.gender ?? undefined,
      });
      const nickname = d.nickname.trim() || "당신";
      const sections = assembleProfile(ctx, nickname);
      setResult({ ctx, sections, nickname });
      setStep(3);
      // 익명 앱 — draft(localStorage)가 곧 영구 프로필 저장소다. 서버 저장 없음.
      saveDraft(d);
    } catch {
      setError("입력을 다시 확인해 주세요.");
    }
  }

  const finish = () => finishWith(draft);

  if (step === 3 && result) {
    return <ProfileView nickname={result.nickname} result={result} />;
  }

  const zodiacPreview =
    draft.birthDate.length === 10
      ? zodiacSign(Number(draft.birthDate.slice(5, 7)), Number(draft.birthDate.slice(8, 10)))
      : null;

  const canNext =
    (step === 0 && draft.nickname.trim().length > 0) ||
    (step === 1 && draft.birthDate.length === 10 && (draft.timeUnknown || draft.birthTime.length === 5)) ||
    step === 2;

  return (
    <main className="flex min-h-dvh flex-col p-6">
      <PersonaIntro
        personaId="dalzigi"
        eyebrow={`🏮 ${PERSONAS.dalzigi.name} · 오늘의운세`}
        line={PERSONAS.dalzigi.homeLine}
        src={PERSONA_VIDEOS.dalzigi}
        // 영상을 끝까지 보면 생년월일 입력 스텝으로 바로 전환 — 별명은 건너뛰어도
        // "당신"으로 폴백되고, 이전 버튼으로 돌아가 채울 수도 있다.
        onComplete={() => setStep((s) => (s === 0 ? 1 : s))}
      />
      <Progress step={step} total={3} />

      <div key={step} className="mt-8 flex-1 fade-rise">
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
            <PickerInput
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              value={draft.birthDate}
              onChange={(v) => set({ birthDate: v })}
              placeholder="눌러서 날짜를 골라 주세요"
            />
            <label className="mt-5 mb-2 block text-sm text-text-soft">태어난 시간</label>
            <PickerInput
              type="time"
              value={draft.birthTime}
              disabled={draft.timeUnknown}
              onChange={(v) => set({ birthTime: v })}
              placeholder="눌러서 시간을 골라 주세요"
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
            <div className="flex gap-3">
              <Choice
                className="flex-1"
                selected={draft.gender === "male"}
                onClick={() => set({ gender: draft.gender === "male" ? null : "male" })}
              >
                남성
              </Choice>
              <Choice
                className="flex-1"
                selected={draft.gender === "female"}
                onClick={() => set({ gender: draft.gender === "female" ? null : "female" })}
              >
                여성
              </Choice>
            </div>
          </Field>
        )}

        {step === 2 && (
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
            className="press rounded-card border border-text-soft/30 px-5 py-3.5 text-text-soft"
          >
            이전
          </button>
        )}
        {step < 2 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="press flex-1 rounded-card bg-accent-coral py-3.5 font-medium text-on-accent disabled:opacity-40"
          >
            다음
          </button>
        ) : (
          <button
            onClick={finish}
            className="press flex-1 rounded-card bg-primary-green py-3.5 font-medium text-on-primary"
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
  nickname, result,
}: { nickname: string; result: Result }) {
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
    <main className="fade-rise-lg p-6 pb-24">
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

      <p className="mt-8 text-center text-sm text-primary-green">
        지금 이 화면에서 당신의 이야기를 만나보세요. 사주팔자 탭의 총운에서도 이어집니다 🌿
      </p>
      <Link
        href="/"
        className="press mt-3 block w-full rounded-card border border-text-soft/30 py-3.5 text-center text-text-soft"
      >
        홈으로
      </Link>
    </main>
  );
}
