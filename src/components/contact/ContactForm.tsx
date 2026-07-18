"use client";

import { useState, useTransition } from "react";
import { submitInquiry } from "@/app/contact/actions";
import { BODY_MAX, SUBJECT_MAX } from "@/lib/inquiry/validate";

/** 문의 폼(§9.2) — 제출 성공 시 폼 대신 감사 안내를 보여준다. */
export default function ContactForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-card bg-warm-surface p-5 text-center">
        <p className="text-text-main">잘 받았어요. 남겨 주신 이메일로 곧 답장을 드릴게요. 💌</p>
      </div>
    );
  }

  const canSubmit = email.trim() && subject.trim() && body.trim() && !pending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await submitInquiry({ email, subject, body });
      if (r.ok) setDone(true);
      else if (r.reason === "invalid")
        setError("입력을 다시 확인해 주실래요? 이메일 형식과 글자 수를 봐주세요.");
      else setError("지금은 접수가 어려워요. 잠시 뒤 다시 시도해 주시면 고마워요.");
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-sm text-text-soft">
        회신 받을 이메일
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-card border border-text-soft/25 bg-warm-surface p-3 text-text-main"
        />
      </label>
      <label className="text-sm text-text-soft">
        제목
        <input
          type="text"
          value={subject}
          maxLength={SUBJECT_MAX}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-card border border-text-soft/25 bg-warm-surface p-3 text-text-main"
        />
      </label>
      <label className="text-sm text-text-soft">
        내용
        <textarea
          value={body}
          maxLength={BODY_MAX}
          rows={6}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 w-full rounded-card border border-text-soft/25 bg-warm-surface p-3 text-text-main"
        />
      </label>
      {error && <p className="text-sm text-accent-coral">{error}</p>}
      <button
        type="submit"
        disabled={!canSubmit}
        className="press rounded-card bg-accent-coral py-3.5 font-medium text-white disabled:opacity-40"
      >
        {pending ? "보내는 중…" : "보내기"}
      </button>
    </form>
  );
}
