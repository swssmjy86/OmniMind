"use client";

import { useEffect } from "react";
import { REF_COOKIE, REF_MAX_AGE_DAYS, parseRef, refCookieValue } from "@/lib/share/ref";

/** 공유 링크 유입(?ref=)을 쿠키로 보존. 최초 유입을 우선하고 렌더는 없다. */
export default function RefTracker() {
  useEffect(() => {
    const info = parseRef(window.location.search);
    if (!info) return;
    if (document.cookie.split("; ").some((c) => c.startsWith(`${REF_COOKIE}=`))) return;
    document.cookie =
      `${REF_COOKIE}=${encodeURIComponent(refCookieValue(info))}` +
      `; path=/; max-age=${REF_MAX_AGE_DAYS * 86400}; samesite=lax`;
  }, []);
  return null;
}
