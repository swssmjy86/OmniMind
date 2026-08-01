"use client";

import { useEffect, useState } from "react";
import { submitConcern } from "@/lib/concern/actions";
import { CONCERN_CATEGORIES, type ConcernCategory } from "@/lib/interpret/content/concern";
import { CONCERN_MAX_LENGTH } from "@/lib/concern/constants";
import { loadLog, saveLog, localId } from "@/lib/local-log";
import type { ProfileContext } from "@/lib/engine";
import type { InterpretationSection } from "@/lib/interpret/types";

const CONCERN_KEY = "om_concern_log";

export interface PastAdvice {
  id: string;
  date: string; // "오늘" 등 표시 문자열
  sections: InterpretationSection[];
}

/**
 * 고민 상담 — 익명 로컬. 기록은 이 기기(localStorage)에만 쌓이고, 제출 시 프로필 맥락과
 * 오늘 운기를 서버 액션(계산+LLM 프록시)에 보내 조언을 받는다. 계정·쿼터·서버 저장 없음.
 */
export default function ConcernRoom({
  nickname, profile,
}: { nickname: string; profile: ProfileContext }) {
  const [category, setCategory] = useState<ConcernCategory>(CONCERN_CATEGORIES[0]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InterpretationSection[] | null>(null);
  const [history, setHistory] = useState<PastAdvice[]>([]);

  useEffect(() => {
    const stored = loadLog<PastAdvice>(CONCERN_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored.length) setHistory(stored);
  }, []);

  function persist(next: PastAdvice[]) {
    setHistory(next);
    saveLog(CONCERN_KEY, next);
  }

  async function submit() {
    const concern = text.trim();
    if (!concern || pending) return;
    setPending(true);
    setError(null);
    const res = await submitConcern({ profile, nickname, category, concern });
    setPending(false);
    if (res.ok) {
      setResult(res.sections);
      setText("");
      persist([{ id: localId(), date: "오늘", sections: res.sections }, ...history]);
    } else {
      setError("잠시 길을 잃었어요. 조금 뒤에 다시 이야기 나눠요.");
    }
  }

  function removeOne(id: string) {
    persist(history.filter((p) => p.id !== id));
  }

  function removeAll() {
    if (!window.confirm("고민 상담 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    persist([]);
  }

  return (
    <main className="p-6 pb-24">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">고민</h1>
      <p className="mt-1 text-xs text-text-soft">
        고민 이야기를 마음껏 나눌 수 있어요 ✨
      </p>

      {result ? (
        <AdviceCard sections={result} />
      ) : (
        <p className="mt-4 leading-relaxed text-text-soft">
          {nickname}님, 마음이 흔들리는 순간이 있나요? 당신의 결과 오늘의 기운을 이어, 함께 생각해드릴게요.
        </p>
      )}

      {(
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {CONCERN_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`active:scale-[0.97] motion-reduce:active:scale-100 rounded-full px-4 py-2 text-sm transition ${
                  category === c
                    ? "bg-selected text-on-selected"
                    : "bg-warm-surface text-text-soft"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={CONCERN_MAX_LENGTH}
            placeholder="어떤 고민이든 편하게 들려주세요…"
            className="w-full resize-none rounded-card border border-text-soft/30 bg-warm-surface px-4 py-3 leading-relaxed outline-none focus:border-primary-green"
          />
          {error && <p role="alert" className="text-sm text-accent-coral">{error}</p>}
          <button
            onClick={() => void submit()}
            disabled={pending || !text.trim()}
            className="press w-full rounded-card bg-accent-coral py-3.5 font-medium text-on-accent disabled:opacity-40"
          >
            {pending ? "당신의 결을 살피는 중이에요…" : "함께 생각해보기"}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
              지난 고민들
            </h2>
            <button
              onClick={() => void removeAll()}
              className="press text-xs text-text-soft underline underline-offset-4"
            >
              전체 삭제
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {history.map((p) => (
              <details key={p.id} className="group rounded-card bg-warm-surface p-4">
                <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm text-text-main">
                  <span>
                    <span className="text-text-soft">{p.date}</span>
                    {"  "}
                    {p.sections.find((s) => s.title === "고민")?.body.slice(0, 30) ?? "고민 이야기"}
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); void removeOne(p.id); }}
                    aria-label="이 고민 기록 삭제"
                    className="delete-btn shrink-0 rounded-full p-1 text-xs text-text-soft"
                  >
                    ✕
                  </button>
                </summary>
                <AdviceCard sections={p.sections} compact />
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function AdviceCard({ sections, compact }: { sections: InterpretationSection[]; compact?: boolean }) {
  return (
    <div className={compact ? "mt-3 space-y-3" : "mt-6 space-y-4"}>
      {sections.map((s) =>
        s.title === "고민" ? (
          <blockquote
            key={s.title}
            className="border-l-2 border-accent-coral/60 pl-3 text-sm italic text-text-soft"
          >
            {s.body}
          </blockquote>
        ) : (
          <section key={s.title} className={compact ? "" : "rounded-card bg-warm-surface p-5"}>
            <h3 className="font-[family-name:var(--font-serif-kr)] text-base text-primary-green">
              {s.title}
            </h3>
            <p className="mt-1.5 leading-relaxed text-text-main">{s.body}</p>
          </section>
        ),
      )}
    </div>
  );
}
