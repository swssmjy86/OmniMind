"use client";

import { useEffect, useState } from "react";
import TodayInputSheet from "./TodayInputSheet";
import TodayTeaser from "./TodayTeaser";
import { TODAY_BIRTH_KEY, parseTodayBirth, type TodayBirth } from "@/lib/today/birth-store";

/**
 * 비로그인 오늘의운세 흐름(스펙 §3): 저장된 입력이 없으면 바텀시트가 뜨고,
 * 저장되면 무료 공통 일진 + 블러 티저를 보여준다. 공통 일진은 서버가 계산해 props로 내려준다
 * — 이 컴포넌트는 엔진을 모른다(클라이언트 번들 보호).
 * localStorage는 마운트 후(useEffect)에만 읽는다 — 시트 표시 여부는 구조 차이라
 * 초기화식에서 읽으면 하이드레이션 불일치가 난다.
 */
export default function TodayFreeFlow({
  headline,
  mind,
  color,
  keyword,
  lucky,
}: {
  headline: string;
  mind: string;
  color: string;
  keyword: string;
  lucky: string;
}) {
  const [ready, setReady] = useState(false);
  const [birth, setBirth] = useState<TodayBirth | null>(null);
  useEffect(() => {
    // 마운트 후 1회만 localStorage를 읽어 시트 표시 여부를 정한다(위 주석 참고) —
    // 외부 스토어를 구독하는 게 아니라 최초 1회 동기화라 set-state-in-effect 휴리스틱의
    // 대상이 아니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBirth(parseTodayBirth(window.localStorage.getItem(TODAY_BIRTH_KEY)));
    setReady(true);
  }, []);

  return (
    <>
      <section className="persona-card mt-5 rounded-card bg-warm-surface p-6">
        <span aria-hidden className="persona-star" style={{ top: "12%", right: "10%" }} />
        <span aria-hidden className="persona-star" style={{ top: "26%", right: "24%" }} />
        <span aria-hidden className="persona-star" style={{ top: "16%", right: "38%" }} />
        <p className="text-xs text-text-soft">
          <span aria-hidden>🏮</span> 달지기 · 오늘의운세 — 누구나 무료
        </p>
        <p className="mt-2 font-[family-name:var(--font-serif-kr)] text-lg leading-relaxed text-primary-green">
          {headline}
        </p>
        <p className="mt-3 leading-relaxed text-text-main">{mind}</p>
        <div className="mt-5 flex gap-2">
          <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">
            오늘의 색 · {color}
          </span>
          <span className="rounded-full bg-warm-base px-3 py-1.5 text-sm text-text-soft">{keyword}</span>
        </div>
        <p className="mt-4 text-sm text-text-soft">🍀 행운 포인트 — {lucky}</p>
      </section>

      <TodayTeaser />

      {ready && !birth && <TodayInputSheet onSaved={setBirth} />}
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
