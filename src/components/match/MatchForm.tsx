"use client";

import { useState } from "react";
import {
  computeMatch, MATCH_MODES,
  type MatchMe, type MatchMode, type MatchContext,
} from "@/lib/engine/match";
import { assembleMatch } from "@/lib/interpret/content/match";
import { recordClientEvent } from "@/lib/metrics/actions";
import type { InterpretationSection } from "@/lib/interpret/types";
import type { Mbti } from "@/lib/engine/types";

const MBTIS: Mbti[] = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];

// 유입 파라미터는 ASCII 토큰만 허용(ref.ts TOKEN 규칙) — 모드를 슬러그로.
const MODE_SLUG: Record<MatchMode, string> = { 연인: "lover", 친구: "friend", 동료: "coworker" };

export default function MatchForm({ me, nickname }: { me: MatchMe; nickname: string }) {
  const [mode, setMode] = useState<MatchMode>("연인");
  const [birthDate, setBirthDate] = useState("");
  const [mbti, setMbti] = useState<"" | Mbti>("");
  const [result, setResult] = useState<{ match: MatchContext; sections: InterpretationSection[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function compute() {
    setError(null);
    try {
      const match = computeMatch(me, { birthDate, mbti: mbti || undefined }, mode);
      const sections = assembleMatch({ match, myElement: me.element, nickname });
      setResult({ match, sections });
      void recordClientEvent("match_compute", { mode: MODE_SLUG[mode], hasMbti: !!mbti });
    } catch {
      setError("생년월일을 다시 한번 확인해주실래요?");
    }
  }

  async function copyInvite() {
    const url = `${window.location.origin}/?ref=match&via=${MODE_SLUG[mode]}`;
    try {
      if (navigator.share) {
        await navigator.share({ text: "우리의 조합이 궁금하다면", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      void recordClientEvent("match_copy_link", { mode: MODE_SLUG[mode] });
    } catch {
      // 사용자가 공유를 닫아도 조용히
    }
  }

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        {MATCH_MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              mode === m ? "bg-primary-green text-white" : "bg-warm-surface text-text-soft"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 rounded-card bg-warm-surface p-5">
        <label className="block">
          <span className="text-sm text-text-soft">상대가 세상에 온 날</span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="mt-1.5 w-full rounded-card border border-text-soft/30 bg-warm-base px-4 py-2.5 outline-none focus:border-primary-green"
          />
        </label>
        <label className="block">
          <span className="text-sm text-text-soft">상대의 MBTI (알고 있다면)</span>
          <select
            value={mbti}
            onChange={(e) => setMbti(e.target.value as "" | Mbti)}
            className="mt-1.5 w-full rounded-card border border-text-soft/30 bg-warm-base px-4 py-2.5 outline-none focus:border-primary-green"
          >
            <option value="">아직 몰라요</option>
            {MBTIS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-accent-coral">{error}</p>}
        <button
          onClick={compute}
          disabled={!birthDate}
          className="w-full rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
        >
          우리의 조합 잇기 ✨
        </button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {result.sections.map((s) => (
            <section key={s.title} className="rounded-card bg-warm-surface p-5">
              <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
                {s.title}
              </h2>
              <p className="mt-2 leading-relaxed text-text-main">{s.body}</p>
            </section>
          ))}

          {/* 초대 루프(§6.5) — 상대가 직접 가입해 연결하면 양방향 심층 궁합으로 */}
          <div className="rounded-card border border-accent-coral/40 bg-warm-surface p-5 text-center">
            <p className="text-sm leading-relaxed text-text-soft">
              상대도 옴니마인드에서 자신의 결을 알게 되면,
              <br />
              두 분의 이야기를 더 깊이 이어드릴 수 있어요.
            </p>
            <button
              onClick={() => void copyInvite()}
              className="mt-3 w-full rounded-card bg-primary-green py-3 font-medium text-white"
            >
              {copied ? "복사했어요 ✓" : "상대에게 건네주기 🍃"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
