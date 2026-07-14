"use client";

import { useEffect } from "react";
import { recordTodayDaily } from "@/lib/daily/actions";

/** 홈 방문 시 오늘의 데일리를 백그라운드로 1회 캐시(best-effort). 렌더 없음. */
export default function DailyRecorder() {
  useEffect(() => {
    void recordTodayDaily();
  }, []);
  return null;
}
