"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PersonaIntro from "@/components/persona/PersonaIntro";
import TodayInputSheet from "./TodayInputSheet";
import { TODAY_BIRTH_KEY, parseTodayBirth, type TodayBirth } from "@/lib/today/birth-store";
import { computeGuestDailyExtras, type GuestDailyExtras } from "@/lib/today/actions";
import type { AstroEvent } from "@/lib/kasi/astro-events";

/** 개인화 결과 하루 캐시 — LLM(무료 쿼터)을 기기당 하루 1회로 줄인다(2026-07-24 블러 해제). */
const EXTRAS_KEY = "om-today-extras";

/** KST 오늘 날짜(YYYY-MM-DD) — KST는 고정 UTC+9(서머타임 없음)라 클라이언트 산술로 충분. */
function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

function loadCachedExtras(birth: TodayBirth): GuestDailyExtras | null {
  try {
    const raw = window.localStorage.getItem(EXTRAS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as {
      birthDate?: string; birthTime?: string; extras?: GuestDailyExtras;
    };
    if (
      c.birthDate === birth.birthDate && c.birthTime === birth.birthTime &&
      c.extras?.date === kstToday()
    )
      return c.extras;
    return null;
  } catch {
    return null;
  }
}

function saveCachedExtras(birth: TodayBirth, extras: GuestDailyExtras): void {
  try {
    window.localStorage.setItem(
      EXTRAS_KEY,
      JSON.stringify({ birthDate: birth.birthDate, birthTime: birth.birthTime, extras }),
    );
  } catch {
    // 저장 불가(시크릿 모드 등)여도 이번 화면은 계속
  }
}

/**
 * 비로그인 오늘의운세 흐름(스펙 §3, 2026-07-24 개정): 저장된 입력이 없으면 바텀시트가 뜨고,
 * 저장되면 무료 공통 일진에 더해 개인화 세 가지 — 내 일간으로 본 오늘·내 띠와 오늘·AI가
 * 다듬은 오늘의 이야기 — 를 **블러 없이 전부** 보여준다(예전 블러 티저 3장 삭제).
 * 공통 일진(헤드라인·마음가짐·색·키워드·행운)은 서버 컴포넌트가 날짜만으로 계산해 props로
 * 내려주고, 개인화는 서버 액션(computeGuestDailyExtras)이 계산한다 — 엔진·LLM은 서버에만.
 * localStorage는 마운트 후(useEffect)에만 읽는다 — 시트 표시 여부는 구조 차이라
 * 초기화식에서 읽으면 하이드레이션 불일치가 난다.
 * intro가 있으면 페르소나 인트로 영상을 이 컴포넌트가 직접 띄운다 — 입력 시트를
 * 영상과 겹쳐 깔지 않고, 영상이 걷힌 다음(완주·건너뛰기 무관)에 팝업으로 띄우기 위한
 * 조율이 필요해서다(페이지는 서버 컴포넌트라 콜백을 넘길 수 없다).
 */
export default function TodayFreeFlow({
  headline,
  mind,
  color,
  keyword,
  lucky,
  sky,
  astroEvents,
  intro,
  forceInput,
}: {
  headline: string;
  mind: string;
  color: string;
  keyword: string;
  lucky: string;
  sky: { moon: string; riseSet: string; altitude: string };
  astroEvents?: AstroEvent[] | null;
  intro?: { personaId: string; eyebrow: string; line: string; src: string };
  /** 홈 "나를 알아보기" 경유 — 저장된 생년월일이 있어도 입력 시트를 띄운다(저장하면 닫힘). */
  forceInput?: boolean;
}) {
  const [ready, setReady] = useState(false);
  // 인트로가 있으면 그 오버레이가 걷힌 뒤에야 입력 시트를 띄운다.
  const [introDone, setIntroDone] = useState(!intro);
  const [forcedOpen, setForcedOpen] = useState(Boolean(forceInput));
  const [birth, setBirth] = useState<TodayBirth | null>(null);
  const [extras, setExtras] = useState<GuestDailyExtras | null>(null);
  // 입력 직후 개인화(서버 계산 + LLM)를 기다리는 동안 — 카드 대신 버퍼링 화면을 띄운다.
  const [loadingExtras, setLoadingExtras] = useState(false);
  useEffect(() => {
    // 마운트 후 1회만 localStorage를 읽어 시트 표시 여부를 정한다(위 주석 참고) —
    // 외부 스토어를 구독하는 게 아니라 최초 1회 동기화라 set-state-in-effect 휴리스틱의
    // 대상이 아니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBirth(parseTodayBirth(window.localStorage.getItem(TODAY_BIRTH_KEY)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!birth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExtras(null);
      return;
    }
    // 같은 날짜·같은 생일이면 저장분 재사용 — LLM 재호출 없음(무료 쿼터 보호), 버퍼링도 없음.
    const cached = loadCachedExtras(birth);
    if (cached) {
      setExtras(cached);
      return;
    }
    let cancelled = false;
    setLoadingExtras(true);
    computeGuestDailyExtras(birth.birthDate, birth.birthTime)
      .then((e) => {
        if (cancelled || !e) return;
        setExtras(e);
        saveCachedExtras(birth, e);
      })
      .finally(() => {
        // 실패해도 공통 카드로 진행한다(개인화만 조용히 생략 — §8 폴백 정신).
        if (!cancelled) setLoadingExtras(false);
      });
    return () => {
      cancelled = true;
    };
  }, [birth]);

  // 인트로 영상은 완주·건너뛰기 뒤 마지막 프레임을 배경으로 유지하고(holdOnEnd), 그 위로
  // 입력 시트가 뜬다(2026-07-24 워크플로우). 입력이 저장되면(시트가 닫히면) 배경을 걷는다.
  const introProps = {
    holdOnEnd: true,
    release: introDone && Boolean(birth) && !forcedOpen,
    onClose: () => setIntroDone(true),
  };

  // 버퍼링 화면 — 입력 완료 직후 개인화가 준비되는 동안 카드 자리를 대신한다.
  // forcedOpen(홈 "나를 알아보기" 경유)일 땐 입력 시트가 우선이라 버퍼링으로 가리지 않는다.
  if (birth && loadingExtras && !forcedOpen) {
    return (
      <>
        {intro && <PersonaIntro {...intro} {...introProps} />}
        <section
          role="status"
          className="persona-card mt-5 rounded-card bg-warm-surface p-8 text-center"
        >
          <span aria-hidden className="persona-star" style={{ top: "16%", right: "14%" }} />
          <span aria-hidden className="persona-star" style={{ top: "30%", right: "30%" }} />
          <span aria-hidden className="persona-star" style={{ top: "20%", left: "16%" }} />
          <p aria-hidden className="animate-pulse text-4xl">🏮</p>
          <p className="mt-4 font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
            달지기가 오늘의 기운을 읽고 있어요…
          </p>
          <p className="mt-1 text-sm text-text-soft">
            당신의 여덟 글자에 등불을 비추는 중이에요. 잠시만 기다려 주세요.
          </p>
          <div aria-hidden className="mt-6 space-y-2">
            <div className="teaser-bar h-3 w-11/12 mx-auto animate-pulse rounded-full bg-text-soft/15" />
            <div className="teaser-bar h-3 w-4/5 mx-auto animate-pulse rounded-full bg-text-soft/15" />
            <div className="teaser-bar h-3 w-2/3 mx-auto animate-pulse rounded-full bg-text-soft/15" />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {intro && <PersonaIntro {...intro} {...introProps} />}
      <section className="persona-card fade-rise mt-5 rounded-card bg-warm-surface p-6">
        <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
        <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
        <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
        <p className="text-xs text-text-soft">
          <span aria-hidden>🏮</span> 달지기 · 오늘의운세
        </p>
        <p className="mt-2 font-[family-name:var(--font-serif-kr)] text-lg leading-relaxed text-primary-green">
          {headline}
        </p>
        <p className="mt-3 leading-relaxed text-text-main">{mind}</p>
        {birth && extras?.personal && (
          <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
            {extras.personal}
          </p>
        )}
        {birth && extras?.zodiac && (
          <p className="mt-3 rounded-card bg-warm-base p-3 text-sm leading-relaxed text-text-main">
            <span className="text-text-soft">{extras.zodiac.animal}띠인 당신에게 — </span>
            {extras.zodiac.line}
          </p>
        )}
        {birth && extras?.story && (
          <p className="mt-3 rounded-card border border-primary-green/20 bg-warm-base p-3 text-sm leading-relaxed text-text-main">
            🌿 {extras.story}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
            오늘의 색 · {color}
          </span>
          <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">{keyword}</span>
        </div>
        <p className="mt-4 text-sm text-text-soft">🍀 행운 포인트 — {lucky}</p>
        <div className="mt-4 rounded-card bg-warm-base p-3 text-xs leading-relaxed text-text-soft">
          <p>🌙 {sky.moon}</p>
          <p className="mt-1">☀️ {sky.riseSet}</p>
          <p className="mt-1">{sky.altitude}</p>
        </div>
        {astroEvents && astroEvents.length > 0 && (
          <div className="mt-3 rounded-card bg-warm-base p-3 text-xs leading-relaxed text-text-soft">
            <p className="text-text-main">✨ 오늘의 천문현상</p>
            {astroEvents.map((e, i) => (
              <p key={i} className="mt-1">
                {e.title}
                {e.time ? ` (${e.time})` : ""}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* 예전 블러 티저 자리 — 이제 위 카드로 전부 공개. 로그인은 저장 보너스로만 유도. */}
      <p className="mt-4 text-center text-xs text-text-soft">
        <Link href="/login" className="underline">로그인</Link>하면 오늘의 기록이 보관함에 차곡차곡 쌓여요.
      </p>

      {ready && introDone && (forcedOpen || !birth) && (
        <TodayInputSheet
          onSaved={(b) => {
            setBirth(b);
            setForcedOpen(false);
          }}
        />
      )}
      {ready && birth && (
        <button
          type="button"
          onClick={() => setBirth(null)}
          className="mt-3 block w-full text-center text-xs text-text-soft underline"
        >
          태어난 정보 다시 입력하기
        </button>
      )}
    </>
  );
}
