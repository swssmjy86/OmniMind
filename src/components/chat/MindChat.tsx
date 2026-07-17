"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sendMessage, deleteChatMessage, deleteAllChatMessages } from "@/lib/chat/actions";

interface Msg {
  id: string | null; // 서버 응답 전 낙관적 메시지는 null — 삭제 버튼은 id가 있을 때만 노출
  role: "user" | "assistant";
  content: string;
}

export default function MindChat({
  nickname, initialMessages, remaining: initialRemaining,
}: { nickname: string; initialMessages: Msg[]; remaining: number }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  // remaining < 0 = 무제한(레거시 프리미엄, consult/quota.ts UNLIMITED 센티널)
  const unlimited = remaining < 0;
  const exhausted = !unlimited && remaining <= 0;

  async function send() {
    const text = input.trim();
    if (!text || pending || exhausted) return;
    setInput("");
    setMessages((m) => [...m, { id: null, role: "user", content: text }]);
    setPending(true);
    const res = await sendMessage(text);
    setPending(false);
    if (res.ok) {
      setMessages((m) => {
        const withoutOptimistic = m.slice(0, -1);
        return [
          ...withoutOptimistic,
          { id: res.userMessageId, role: "user", content: text },
          { id: res.assistantMessageId, role: "assistant", content: res.reply },
        ];
      });
      setRemaining(res.remaining);
    } else if (res.reason === "limit") {
      setRemaining(0);
    } else {
      setMessages((m) => [
        ...m,
        { id: null, role: "assistant", content: "잠시 길을 잃었어요. 조금 뒤에 다시 이야기 나눠요." },
      ]);
    }
  }

  async function removeOne(id: string) {
    // 실패 시 원래 자리에 되돌려야 하므로, 마운트 시점의 initialMessages가 아니라
    // 지금 살아있는 messages에서 위치와 내용을 붙잡아둔다(세션 중 보낸 메시지도 복구되도록).
    const index = messages.findIndex((msg) => msg.id === id);
    if (index === -1) return;
    const removed = messages[index];
    setMessages((m) => m.filter((msg) => msg.id !== id));
    const res = await deleteChatMessage(id);
    if (!res.ok) {
      setMessages((m) => {
        const next = [...m];
        next.splice(index, 0, removed);
        return next;
      });
    }
  }

  async function removeAll() {
    if (!window.confirm("마음 대화 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    const before = messages;
    setMessages([]);
    const res = await deleteAllChatMessages();
    if (!res.ok) setMessages(before);
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-start justify-between px-6 pt-6 pb-3">
        <div>
          <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">마음</h1>
          <p className="mt-1 text-xs text-text-soft">
            {unlimited
              ? "마음 이야기를 마음껏 나눌 수 있어요 ✨"
              : exhausted
                ? "오늘 이야기는 여기까지예요 🌙"
                : `오늘 나눌 수 있는 이야기가 ${remaining}번 남았어요`}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => void removeAll()}
            className="press mt-1 shrink-0 text-xs text-text-soft underline underline-offset-4"
          >
            전체 삭제
          </button>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-4">
        {messages.length === 0 && (
          <Bubble role="assistant">안녕하세요, {nickname}님. 오늘 마음은 어떠세요?</Bubble>
        )}
        {messages.map((m, i) => (
          <Bubble key={m.id ?? `pending-${i}`} role={m.role} onDelete={m.id ? () => void removeOne(m.id!) : undefined}>
            {m.content}
          </Bubble>
        ))}
        {pending && <Bubble role="assistant"><span className="animate-pulse">마음을 살피는 중이에요…</span></Bubble>}
        <div ref={endRef} />
      </div>

      {exhausted ? (
        <div className="border-t border-text-soft/15 px-6 py-4 text-center">
          <p className="text-sm text-text-soft">내일 아침, 새로운 기운과 함께 기다릴게요.</p>
          {/* §6.4 — 제한이 프리미엄 판매 포인트가 되는 자리 (P8 상담 크레딧으로 연결) */}
          <Link
            href="/premium"
            className="mt-2 inline-block text-sm text-accent-coral underline underline-offset-4"
          >
            마음 이야기, 상담 크레딧으로 이어가기 🌙
          </Link>
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
            className="press rounded-card bg-primary-green px-4 py-2.5 font-medium text-white disabled:opacity-40"
          >
            보내기
          </button>
        </div>
      )}
    </div>
  );
}

function Bubble({
  role, children, onDelete,
}: { role: "user" | "assistant"; children: React.ReactNode; onDelete?: () => void }) {
  const mine = role === "user";
  return (
    <div className={`group bubble-in flex items-center gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && onDelete && <DeleteButton onClick={onDelete} />}
      <div
        className={`max-w-[80%] rounded-card px-4 py-2.5 leading-relaxed ${
          mine ? "bg-accent-coral text-white" : "bg-warm-surface text-text-main"
        }`}
      >
        {children}
      </div>
      {mine && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="이 메시지 삭제"
      className="delete-btn shrink-0 rounded-full p-1 text-xs text-text-soft"
    >
      ✕
    </button>
  );
}
