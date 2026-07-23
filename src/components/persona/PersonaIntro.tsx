"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  /** 세션 노출 키 구분자 — "dalzigi" 등 페르소나 id */
  personaId: string;
  /** 카드 상단 라벨 — "🏮 달지기 · 오늘의운세" */
  eyebrow: string;
  /** 페르소나의 한마디 — 영상은 음소거로 시작하므로 자막으로 함께 보여준다 */
  line: string;
  /** 영상 경로 — public/ 아래 mp4 */
  src: string;
}

const seenKey = (personaId: string) => `persona-intro-seen:${personaId}`;

/**
 * 페르소나 인트로 영상 오버레이 — 오늘의운세/온보딩 진입 시 짧은 홍보 컷을 한 번 보여준다.
 * 원칙: 홍보는 한 번이면 족하다(세션당 1회, sessionStorage). 모바일 자동재생 정책에 따라
 * 음소거로 시작하고 소리 켜기 버튼을 준다. 움직임 줄이기 설정 사용자에겐 아예 띄우지 않는다.
 * 영상이 끝나거나, 건너뛰기를 누르거나, 영상 로드에 실패하면 조용히 사라진다.
 */
export default function PersonaIntro({ personaId, eyebrow, line, src }: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // 페이지가 한 프레임 먼저 그려진 뒤 오버레이를 띄운다(동기 setState 금지 규칙과도 맞다).
    const t = setTimeout(() => {
      try {
        if (sessionStorage.getItem(seenKey(personaId))) return;
        // 접근성 — 움직임을 줄이고 싶은 사용자에게 자동재생 영상을 들이밀지 않는다.
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        sessionStorage.setItem(seenKey(personaId), "1");
        setVisible(true);
      } catch {
        // sessionStorage 접근 불가(사생활 보호 모드 등) — 홍보는 조용히 포기한다.
      }
    }, 200);
    return () => clearTimeout(t);
  }, [personaId]);

  // 영상이 멈춰버려도 오버레이가 화면을 계속 덮지 않도록 상한을 둔다(영상 8초 + 여유).
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(close, 15_000);
    return () => clearTimeout(t);
  }, [visible]);

  function close() {
    setClosing(true);
    setTimeout(() => setVisible(false), 300);
  }

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
  }

  if (!visible) return null;

  // 페이지 컨테이너(fade-rise)의 transform이 스태킹 컨텍스트를 만들어 그 안에서는 z-index를
  // 아무리 올려도 포털 시트(입력 팝업) 아래 깔린다 — 같은 body 레벨로 포털해 확실히 위에 얹는다.
  return createPortal(
    <div
      role="dialog"
      aria-label={`${eyebrow} 인사 영상`}
      onClick={close}
      // 입력 시트(z-50)보다 위 — Tailwind 임의값 클래스 대신 인라인로 확실히 얹는다.
      style={{ zIndex: 60 }}
      className={`fixed inset-y-0 left-1/2 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 items-center justify-center bg-black/70 p-6 transition-opacity duration-300 lg:max-w-[var(--shell-width-lg)] ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-rise w-full max-w-xs overflow-hidden rounded-card bg-warm-surface shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-xs text-text-soft">{eyebrow}</p>
          <button
            onClick={close}
            className="press text-xs text-text-soft underline"
            aria-label="인사 영상 건너뛰기"
          >
            건너뛰기
          </button>
        </div>
        <div className="relative">
          <video
            ref={videoRef}
            src={src}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={close}
            onError={close}
            className="aspect-[9/16] w-full object-cover"
          />
          <button
            onClick={toggleSound}
            className="press absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white"
          >
            {muted ? "🔇 소리 켜기" : "🔊 소리 끄기"}
          </button>
        </div>
        <p className="px-4 py-3 text-center text-sm leading-relaxed text-text-main">{line}</p>
      </div>
    </div>,
    document.body,
  );
}
