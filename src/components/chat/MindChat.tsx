"use client";

import { useEffect, useRef, useState } from "react";
import { sendMessage } from "@/lib/chat/actions";
import { loadLog, saveLog, localId } from "@/lib/local-log";
import type { ProfileContext } from "@/lib/engine";

const CHAT_KEY = "om_chat_log";
// respond()에 넘길 최근 맥락 길이 — 너무 길면 무료 모델 토큰을 초과한다.
const HISTORY_LIMIT = 10;
// localStorage에 무한정 쌓이지 않도록 최근 N개만 보관한다(용량 초과로 저장이 조용히
// 실패해 이후 대화가 통째로 사라지는 것을 막는다). 화면엔 보관분 전체를 보여준다.
const STORE_LIMIT = 300;

interface Msg {
  id: string | null; // 낙관적(전송 중) 메시지는 null — 삭제 버튼은 저장된 뒤에만
  role: "user" | "assistant";
  content: string;
}

/**
 * 마음 챗 — 익명 로컬. 기록은 이 기기(localStorage)에만 쌓이고, 전송 시 프로필 맥락과
 * 최근 대화를 서버 액션(LLM 프록시)에 보내 답을 받는다. 계정·쿼터·서버 저장 없음.
 */
export default function MindChat({
  nickname,
  profile,
}: {
  nickname: string;
  profile: ProfileContext;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // 전송 대기 중 삭제(전체/개별)가 일어나도 응답 병합이 '최신' 목록 위에서 이뤄지도록,
  // 렌더된 messages를 ref로 따라간다 — await 전 클로저의 옛 messages를 쓰면 지운 기록이
  // 되살아난다(코드리뷰 스테일 클로저 수정).
  const messagesRef = useRef<Msg[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 마운트 후 1회 localStorage에서 기록을 읽는다(최초 동기화).
  useEffect(() => {
    const stored = loadLog<Msg>(CHAT_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored.length) setMessages(stored);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function persist(next: Msg[]) {
    setMessages(next);
    // 저장은 확정 메시지(id 있는 것)만, 최근 STORE_LIMIT개로 제한.
    saveLog(CHAT_KEY, next.filter((m) => m.id !== null).slice(-STORE_LIMIT));
  }

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    setMessages((cur) => [...cur, { id: null, role: "user", content: text }]);
    setPending(true);
    const history = messagesRef.current
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }));
    const res = await sendMessage({ profile, nickname, history, message: text });
    setPending(false);
    if (res.ok) {
      // 낙관적(id null) 항목을 걷어낸 '현재' 목록 위에 확정 메시지를 붙인다 — 대기 중
      // 삭제가 있었다면 그 삭제 결과가 base에 반영돼 있어 지운 기록이 되살아나지 않는다.
      const base = messagesRef.current.filter((m) => m.id !== null);
      persist([
        ...base,
        { id: localId(), role: "user", content: text },
        { id: localId(), role: "assistant", content: res.reply },
      ]);
    } else {
      setMessages((m) => [
        ...m,
        { id: null, role: "assistant", content: "잠시 길을 잃었어요. 조금 뒤에 다시 이야기 나눠요." },
      ]);
    }
  }

  function removeOne(id: string) {
    persist(messages.filter((msg) => msg.id !== id));
  }

  function removeAll() {
    if (!window.confirm("마음 대화 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    persist([]);
  }

  return (
    // (tabs)/layout.tsx가 pt-14(3.5rem)·pb-20(5rem)로 상단 토글·하단 탭 공간을 이미
    // 예약한다. 여기서 h-dvh(100dvh)를 그대로 쓰면 컬럼이 그만큼 뷰포트 아래로 밀려
    // 입력 바가 하단 탭 뒤로 숨는다 — 예약된 패딩을 뺀 높이로 정확히 채운다.
    <div className="flex h-[calc(100dvh-3.5rem-5rem)] flex-col">
      <header className="flex items-start justify-between px-6 pt-6 pb-3">
        <div>
          <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">마음</h1>
          <p className="mt-1 text-xs text-text-soft">
            마음 이야기를 마음껏 나눌 수 있어요 ✨
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={removeAll}
            className="press mt-1 shrink-0 text-xs text-text-soft underline underline-offset-4"
          >
            전체 삭제
          </button>
        )}
      </header>

      {/* 새 응답·"살피는 중" 상태를 스크린리더가 읽도록 라이브 리전으로. */}
      <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-4" aria-live="polite" aria-atomic="false">
        {messages.length === 0 && (
          <Bubble role="assistant">안녕하세요, {nickname}님. 오늘 마음은 어떠세요?</Bubble>
        )}
        {messages.map((m, i) => (
          <Bubble key={m.id ?? `pending-${i}`} role={m.role} onDelete={m.id ? () => removeOne(m.id!) : undefined}>
            {m.content}
          </Bubble>
        ))}
        {pending && <Bubble role="assistant"><span className="animate-pulse">마음을 살피는 중이에요…</span></Bubble>}
        <div ref={endRef} />
      </div>

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
          className="press rounded-card bg-primary-green px-4 py-2.5 font-medium text-on-primary disabled:opacity-40"
        >
          보내기
        </button>
      </div>
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
          mine ? "bg-accent-coral text-on-accent" : "bg-warm-surface text-text-main"
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
