"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage } from "@/lib/chat/actions";
import type { ChatMsg } from "@/lib/interpret/provider";

export default function MindChat({
  nickname, initialMessages, remaining: initialRemaining,
}: { nickname: string; initialMessages: ChatMsg[]; remaining: number }) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const exhausted = remaining <= 0;

  async function send() {
    const text = input.trim();
    if (!text || pending || exhausted) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setPending(true);
    const res = await sendMessage(text);
    setPending(false);
    if (res.ok) {
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setRemaining(res.remaining);
    } else if (res.reason === "limit") {
      setRemaining(0);
    } else {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "잠시 길을 잃었어요. 조금 뒤에 다시 이야기 나눠요." },
      ]);
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-[480px] flex-col">
      <header className="px-6 pt-6 pb-3">
        <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">마음</h1>
        <p className="mt-1 text-xs text-text-soft">
          {exhausted
            ? "오늘 이야기는 여기까지예요 🌙"
            : `오늘 나눌 수 있는 이야기가 ${remaining}번 남았어요`}
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-4">
        {messages.length === 0 && (
          <Bubble role="assistant">안녕하세요, {nickname}님. 오늘 마음은 어떠세요?</Bubble>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>{m.content}</Bubble>
        ))}
        {pending && <Bubble role="assistant"><span className="animate-pulse">마음을 살피는 중이에요…</span></Bubble>}
        <div ref={endRef} />
      </div>

      {exhausted ? (
        <div className="border-t border-text-soft/15 px-6 py-4 text-center">
          <p className="text-sm text-text-soft">내일 아침, 새로운 기운과 함께 기다릴게요.</p>
        </div>
      ) : (
        <div className="flex items-end gap-2 border-t border-text-soft/15 px-4 py-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
            }}
            rows={1}
            placeholder="마음을 들려주세요…"
            className="max-h-28 flex-1 resize-none rounded-card border border-text-soft/30 bg-warm-surface px-4 py-2.5 outline-none focus:border-primary-green"
          />
          <button
            onClick={() => void send()}
            disabled={pending || !input.trim()}
            className="rounded-card bg-primary-green px-4 py-2.5 font-medium text-white disabled:opacity-40"
          >
            보내기
          </button>
        </div>
      )}
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-card px-4 py-2.5 leading-relaxed ${
          mine ? "bg-accent-coral text-white" : "bg-warm-surface text-text-main"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
