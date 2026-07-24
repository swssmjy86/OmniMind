"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  /** 페르소나 id — "dalzigi" 등 (노출 추적·키 구분용) */
  personaId: string;
  /** 카드 상단 라벨 — "🏮 달지기 · 오늘의운세" */
  eyebrow: string;
  /** 페르소나의 한마디 — 음소거 폴백 재생에 대비해 자막으로 함께 보여준다 */
  line: string;
  /** 영상 경로 — public/ 아래 mp4 */
  src: string;
  /** 영상이 끝까지 재생됐을 때 호출 — 건너뛰기·로드 실패에는 부르지 않는다 */
  onComplete?: () => void;
  /** 오버레이가 사라질 때(또는 holdOnEnd로 배경이 될 때) 호출 — 완주·건너뛰기·로드 실패·
   *  타임아웃 등 사유 무관. "영상이 걷힌 다음에 보여줄 것"(입력 팝업 등)을 여는 용도. */
  onClose?: () => void;
  /** 완주·건너뛰기 시 사라지는 대신 마지막 프레임을 **뒷 배경으로 유지**한다(2026-07-24
   *  오늘의운세 워크플로우 — 영상 위로 입력 팝업이 뜬다). 배경이 된 뒤 release가 참이
   *  되면 그때 페이드아웃한다. 로드 실패·재생 정지 타임아웃은 배경으로 남길 프레임이
   *  없거나 어긋난 상태라 이 옵션과 무관하게 그냥 닫힌다. */
  holdOnEnd?: boolean;
  /** holdOnEnd로 배경이 된 오버레이를 걷어낼 신호 — 입력 팝업이 닫힌 뒤 참으로. */
  release?: boolean;
}

/**
 * 페르소나 인트로 영상 오버레이 — 오늘의운세/온보딩에 들어올 때마다 짧은 홍보 컷을 보여준다
 * (홈에 갔다가 다시 들어와도 재생 — 라우트 이동으로 컴포넌트가 새로 마운트될 때마다).
 * 자동재생은 선언적 autoplay+muted+playsinline 속성에 맡긴다 — 모바일 포함 모든
 * 브라우저가 가장 확실하게 허용하는 경로다. 그 위에서 소리 승격을 시도한다:
 * ①소리 켠 play()가 허용되면 소리 ON → ②거부되면 음소거 재생 유지 + 소리 켜기 버튼 →
 * ③무음 자동재생마저 차단된 환경(인앱 브라우저·iOS 저전력 모드 등)은 첫 프레임 정지
 * 화면 + ▶ 버튼(탭은 사용자 제스처라 소리 켠 재생 가능). 인트로는 장식이 아닌 핵심
 * 콘텐츠라 움직임 줄이기(prefers-reduced-motion) 설정과 무관하게 자동재생한다 — 모바일
 * 접근성 설정(애니메이션 제거·배터리 세이버)이 켜진 기기에서 자동재생이 막히던 원인.
 * 영상이 끝나거나, 건너뛰기를 누르거나, 영상 로드에 실패하면 조용히 사라진다 —
 * 끝까지 본 경우에만 onComplete를 부른다.
 */
export default function PersonaIntro({
  personaId, eyebrow, line, src, onComplete, onClose, holdOnEnd, release,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  // holdOnEnd: 완주·건너뛰기 뒤 마지막 프레임이 배경으로 남은 상태 — 컨트롤은 숨고,
  // z-index가 입력 시트 아래로 내려가며, 포인터도 통과시킨다.
  const [held, setHeld] = useState(false);
  // 무음 자동재생이 기본이므로 음소거로 시작 — 소리 승격이 허용되는 환경에서만 켠다.
  const [muted, setMuted] = useState(true);
  // 자동재생 대신 ▶ 버튼을 보여줘야 하는 상태 — 무음 재생까지 거부된 환경에서만.
  const [needsTap, setNeedsTap] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // onClose 최신값은 ref로 든다 — close가 prop에 반응적이 되면 15초 워치독 이펙트가
  // close를 의존성으로 요구해, 부모 리렌더마다 타이머가 리셋되기 때문.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // 페이지가 한 프레임 먼저 그려진 뒤 오버레이를 띄운다(동기 setState 금지 규칙과도 맞다).
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, [personaId]);

  // 소리 승격 — 무음 자동재생(선언적 autoplay+muted)은 브라우저가 알아서 시작하므로,
  // 여기서는 소리 켠 재생이 허용되는 환경인지만 시도한다. 거부되면 음소거로 되돌려
  // 재생을 잇고, 무음 재생마저 거부되는 환경이면 ▶ 버튼으로 전환한다.
  useEffect(() => {
    if (!visible || needsTap) return;
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false;
      v.play?.()?.then?.(() => setMuted(false))?.catch?.(() => {
        // 정책상 소리 자동재생 차단(모바일 기본) — 음소거 재생으로 되돌린다.
        v.muted = true;
        setMuted(true);
        v.play?.()?.catch?.(() => setNeedsTap(true));
      });
    } catch {
      // jsdom 등 play() 미구현 환경 — 실제 브라우저의 play()는 동기로 던지지 않는다.
    }
  }, [visible, needsTap]);

  // 영상이 멈춰버려도 오버레이가 화면을 계속 덮지 않도록 상한을 둔다(영상 8초 + 여유).
  // 재생이 시작된 뒤부터 잰다 — ▶ 버튼을 기다리는 정지 화면은 사용자가 직접 닫을 때까지 유지.
  // 배경 모드(held)로 넘어간 뒤에는 의도적으로 남아 있는 것이므로 타임아웃을 걸지 않는다.
  useEffect(() => {
    if (!playing || held) return;
    const t = setTimeout(close, 15_000);
    return () => clearTimeout(t);
  }, [playing, held]);

  // 배경으로 남은 오버레이는 부모가 release로 걷어낸다(입력 팝업이 닫힌 뒤).
  useEffect(() => {
    if (held && release) close();
  }, [held, release]);

  function close() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      onCloseRef.current?.();
    }, 300);
  }

  /** 완주·건너뛰기 종착 — holdOnEnd면 현재 프레임에서 멈춰 배경이 되고, 아니면 닫힌다. */
  function finish() {
    if (!holdOnEnd) {
      close();
      return;
    }
    try {
      videoRef.current?.pause?.();
    } catch {
      // jsdom 등 pause() 미구현 환경 무시
    }
    setHeld(true);
    onCloseRef.current?.(); // 입력 팝업 등 "다음 것"은 배경 위로 바로 뜬다
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
      // 배경 모드에서는 대화상자가 아니라 장식 — 역할·클릭 닫기를 걷고 포인터를 통과시킨다.
      {...(held ? { "aria-hidden": true } : { role: "dialog", "aria-label": `${eyebrow} 인사 영상` })}
      onClick={held ? undefined : finish}
      // 재생 중엔 입력 시트(z-50)보다 위, 배경 모드에선 시트 아래(z-40) —
      // Tailwind 임의값 클래스 대신 인라인로 확실히 얹는다.
      style={{ zIndex: held ? 40 : 60 }}
      className={`fixed inset-y-0 left-1/2 flex w-full max-w-[var(--shell-width)] -translate-x-1/2 items-center justify-center bg-black/70 p-4 transition-opacity duration-300 lg:max-w-[var(--shell-width-lg)] ${
        closing ? "opacity-0" : "opacity-100"
      } ${held ? "pointer-events-none" : ""}`}
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
          ref={(el) => {
            videoRef.current = el;
            // React는 muted를 프로퍼티로만 세워 콘텐츠 속성이 DOM에 안 생긴다 —
            // 자동재생 정책이 속성을 요구하는 브라우저를 위해 defaultMuted(속성 반영)를 세운다.
            if (el) el.defaultMuted = true;
          }}
          src={src}
          // 무음 자동재생은 선언적 속성 조합이 가장 확실하다. 음소거 해제는 프로퍼티로만
          // 다루고 이 prop은 상수로 둔다(React가 되돌리지 않도록).
          autoPlay
          muted
          playsInline
          preload="auto"
          onPlay={() => {
            setPlaying(true);
            setNeedsTap(false);
          }}
          onEnded={() => {
            onComplete?.();
            finish();
          }}
          onError={close}
          className="aspect-[9/16] w-full object-cover"
        />
        {!held && needsTap && (
          <button
            onClick={() => {
              // 탭은 사용자 제스처 — 소리 켠 재생이 허용된다.
              const v = videoRef.current;
              if (!v) return;
              v.muted = false;
              setMuted(false);
              try {
                v.play?.()?.catch?.(() => {});
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
        {!held && (
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-8 pt-3">
            <p className="text-xs text-white/80">{eyebrow}</p>
            <button
              onClick={finish}
              className="press text-xs text-white/80 underline"
              aria-label="인사 영상 건너뛰기"
            >
              건너뛰기
            </button>
          </div>
        )}
        {!held && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
            <button
              onClick={toggleSound}
              className="press rounded-full bg-black/50 px-3 py-1.5 text-xs text-white"
            >
              {muted ? "🔇 소리 켜기" : "🔊 소리 끄기"}
            </button>
            <p className="text-center text-sm leading-relaxed text-white">{line}</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
