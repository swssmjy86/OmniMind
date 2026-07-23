"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  /** 페르소나 id — "dalzigi" 등 (노출 추적·키 구분용) */
  personaId: string;
  /** 카드 상단 라벨 — "🏮 달지기 · 오늘의운세" */
  eyebrow: string;
  /** 페르소나의 한마디 — 영상은 음소거로 시작하므로 자막으로 함께 보여준다 */
  line: string;
  /** 영상 경로 — public/ 아래 mp4 */
  src: string;
}

/**
 * 페르소나 인트로 영상 오버레이 — 오늘의운세/온보딩에 들어올 때마다 짧은 홍보 컷을 보여준다
 * (홈에 갔다가 다시 들어와도 재생 — 라우트 이동으로 컴포넌트가 새로 마운트될 때마다).
 * 모바일 자동재생 정책에 따라 음소거로 시작하고 소리 켜기 버튼을 준다. 움직임 줄이기 설정
 * 사용자에겐 자동재생하지 않고 첫 프레임 정지 화면 + ▶ 버튼을 보여준다(자동재생이
 * 차단된 환경 — iOS 저전력 모드 등 — 도 같은 경로). 영상이 끝나거나, 건너뛰기를
 * 누르거나, 영상 로드에 실패하면 조용히 사라진다.
 */
export default function PersonaIntro({ personaId, eyebrow, line, src }: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(true);
  // 자동재생 대신 ▶ 버튼을 보여줘야 하는 상태 — 움직임 줄이기 설정 또는 자동재생 차단.
  const [needsTap, setNeedsTap] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // 페이지가 한 프레임 먼저 그려진 뒤 오버레이를 띄운다(동기 setState 금지 규칙과도 맞다).
    const t = setTimeout(() => {
      // 접근성 — 움직임을 줄이고 싶은 사용자에게 자동재생을 들이밀지 않는다(직접 ▶는 가능).
      setNeedsTap(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
      setVisible(true);
    }, 200);
    return () => clearTimeout(t);
  }, [personaId]);

  // 자동재생 — autoPlay 속성 대신 직접 호출해 실패(저전력 모드 등)를 감지, ▶ 버튼으로 전환한다.
  useEffect(() => {
    if (!visible || needsTap) return;
    try {
      videoRef.current?.play?.()?.catch?.(() => setNeedsTap(true));
    } catch {
      // jsdom 등 play() 미구현 환경 — 실제 브라우저의 play()는 동기로 던지지 않는다.
    }
  }, [visible, needsTap]);

  // 영상이 멈춰버려도 오버레이가 화면을 계속 덮지 않도록 상한을 둔다(영상 8초 + 여유).
  // 재생이 시작된 뒤부터 잰다 — ▶ 버튼을 기다리는 정지 화면은 사용자가 직접 닫을 때까지 유지.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(close, 15_000);
    return () => clearTimeout(t);
  }, [playing]);

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
      className={`fixed inset-y-0 left-1/2 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 items-center justify-center bg-black/70 p-4 transition-opacity duration-300 lg:max-w-[var(--shell-width-lg)] ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* 스토리 뷰 — 카드 전체가 영상이고 헤더·자막은 그라데이션 위에 겹쳐 올린다.
          카드 폭 = 화면 폭·높이 중 작은 쪽에 9:16으로 맞춰 화면을 거의 꽉 채운다.
          dvh를 모르는 구형 브라우저는 인라인 width를 무시하고 max-w-[32rem]로 동작한다. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(100%, calc((100dvh - 32px) * 9 / 16))" }}
        className="fade-rise relative w-full max-w-[32rem] overflow-hidden rounded-card bg-warm-surface shadow-xl"
      >
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="auto"
          onPlay={() => {
            setPlaying(true);
            setNeedsTap(false);
          }}
          onEnded={close}
          onError={close}
          className="aspect-[9/16] w-full object-cover"
        />
        {needsTap && (
          <button
            onClick={() => {
              try {
                videoRef.current?.play?.()?.catch?.(() => {});
              } catch {
                // play() 미구현 환경 무시
              }
            }}
            aria-label="인사 영상 재생"
            className="press absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-2xl text-white"
          >
            ▶
          </button>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-8 pt-3">
          <p className="text-xs text-white/80">{eyebrow}</p>
          <button
            onClick={close}
            className="press text-xs text-white/80 underline"
            aria-label="인사 영상 건너뛰기"
          >
            건너뛰기
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
          <button
            onClick={toggleSound}
            className="press rounded-full bg-black/50 px-3 py-1.5 text-xs text-white"
          >
            {muted ? "🔇 소리 켜기" : "🔊 소리 끄기"}
          </button>
          <p className="text-center text-sm leading-relaxed text-white">{line}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
