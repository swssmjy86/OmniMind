"use client";

import { useEffect, useRef } from "react";

const UNIT = process.env.NEXT_PUBLIC_ADFIT_UNIT;

/**
 * 카카오 AdFit 슬롯 (P4-4) — 비침습 위치(데일리 하단) 전용.
 * NEXT_PUBLIC_ADFIT_UNIT이 없으면 아무것도 렌더하지 않는다(단위 발급 전 무해).
 */
export default function AdSlot() {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!UNIT || !ref.current) return;
    if (document.querySelector("script[src*='kas/static/ba.min.js']")) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://t1.daumcdn.net/kas/static/ba.min.js";
    ref.current.parentElement?.appendChild(s);
  }, []);

  if (!UNIT) return null;

  return (
    <div className="mt-6 flex justify-center">
      <ins
        ref={ref}
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit={UNIT}
        data-ad-width="320"
        data-ad-height="100"
      />
    </div>
  );
}
