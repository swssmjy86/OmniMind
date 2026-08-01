"use client";

import { useEffect, useState } from "react";
import { recentCheers, submitCheer, type Cheer } from "@/lib/cheer/actions";
import { CHEER_MAX } from "@/lib/cheer/validate";

/**
 * 익명 응원 벽 — 로그인 없이 서로에게 짧은 응원을 남기고 최근 응원을 함께 본다.
 * 완전 익명 앱에서 유일하게 서버에 남는 상호작용(계정·식별 없음). Supabase가 없으면
 * 목록이 비고 등록이 조용히 실패해도, 이 섹션만 조용히 접힌다(§폴백 정신).
 */
export default function CheerWall() {
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    recentCheers().then(setCheers).catch(() => {});
  }, []);

  async function send() {
    const message = text.trim();
    if (!message || pending) return;
    setPending(true);
    const res = await submitCheer(message);
    setPending(false);
    if (res.ok) {
      setCheers((c) => [res.cheer, ...c]);
      setText("");
      setThanks(true);
    }
  }

  return (
    <section className="mt-10" aria-label="익명 응원">
      <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
        익명 응원 한마디
      </h2>
      <p className="mt-1 text-sm text-text-soft">
        이름 없이, 서로에게 따뜻한 말 한마디를 남겨요. 오늘 누군가에게 등불이 될 거예요.
      </p>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setThanks(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
          }}
          rows={1}
          maxLength={CHEER_MAX}
          placeholder="응원 한마디를 남겨 주세요…"
          className="max-h-24 flex-1 resize-none rounded-card border border-text-soft/30 bg-warm-surface px-4 py-2.5 outline-none focus:border-primary-green"
        />
        <button
          onClick={() => void send()}
          disabled={pending || !text.trim()}
          className="press shrink-0 rounded-card bg-accent-coral px-4 py-2.5 font-medium text-on-accent disabled:opacity-40"
        >
          남기기
        </button>
      </div>
      {thanks && (
        <p role="status" className="mt-2 text-xs text-primary-green">
          응원을 남겼어요. 고마워요 🌿
        </p>
      )}

      {cheers.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {cheers.map((c) => (
            <li
              key={c.id}
              className="rounded-card bg-warm-surface px-4 py-3 text-sm leading-relaxed text-text-main"
            >
              <span aria-hidden className="mr-1.5 text-accent-coral">🌿</span>
              {c.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
