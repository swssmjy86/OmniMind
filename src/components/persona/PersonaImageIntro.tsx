"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface Props {
  /** 페르소나 id — 노출 추적·키 구분용 */
  personaId: string;
  /** 카드 상단 라벨 — "📜 서온 · 총운" */
  eyebrow: string;
  /** 페르소나의 한마디 — 카드 하단 자막 */
  line: string;
  /** 전신 일러스트 경로(PERSONA_IMAGES[id].full) — public/ 아래 webp */
  image: string;
  /** 전신컷 크롭 기준점(PERSONA_IMAGES[id].fullPosition) */
  imagePosition?: string;
  /** 오버레이가 사라질 때(자동 종료·건너뛰기·탭 닫기 전부) 호출 */
  onClose?: () => void;
}

/** 정지 화면이라 영상처럼 "다 봤다"는 신호가 없다 — 한마디를 읽을 시간만 붙잡아 둔다. */
const HOLD_MS = 2600;
const FADE_MS = 300;

/**
 * 페르소나 인사 오버레이 — PersonaIntro(영상)와 같은 스토리 뷰 톤을, 아직 인트로
 * 영상이 제작되지 않은 페르소나를 위해 전신 일러스트 정지 화면으로 보여준다.
 * 상품 페이지에 진입할 때마다(라우트 이동으로 재마운트될 때마다) 다시 뜨고,
 * 일정 시간 뒤 스스로 사라지거나 탭·건너뛰기로 바로 닫을 수 있다.
 */
export default function PersonaImageIntro({
  personaId, eyebrow, line, image, imagePosition, onClose,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  // onClose 최신값은 ref로 든다 — PersonaIntro와 같은 이유: close가 prop에 반응적이면
  // 홀드 타이머가 부모 리렌더마다 리셋된다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, [personaId]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(close, HOLD_MS);
    return () => clearTimeout(t);
  }, [visible]);

  function close() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      onCloseRef.current?.();
    }, FADE_MS);
  }

  if (!visible) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label={`${eyebrow} 인사`}
      onClick={close}
      style={{ zIndex: 60 }}
      className={`fixed inset-y-0 left-1/2 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 items-center justify-center bg-black/70 p-4 transition-opacity duration-300 lg:max-w-[var(--shell-width-lg)] ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(100%, calc((100dvh - 32px) * 9 / 16))" }}
        className="fade-rise relative aspect-[9/16] w-full max-w-[32rem] overflow-hidden rounded-card bg-warm-surface shadow-xl"
      >
        <Image
          src={image}
          alt=""
          fill
          unoptimized
          className="object-cover"
          style={{ objectPosition: imagePosition ?? "50% 45%" }}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-8 pt-3">
          <p className="text-xs text-white/80">{eyebrow}</p>
          <button
            onClick={close}
            className="press text-xs text-white/80 underline"
            aria-label="인사 건너뛰기"
          >
            건너뛰기
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
          <p className="text-center text-sm leading-relaxed text-white">{line}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
