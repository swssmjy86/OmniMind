"use client";

import { useState } from "react";
import { deleteAllDailyLogs, deleteDailyLog } from "@/lib/archive/actions";
import type { ArchiveEntry } from "./ArchiveView";

/**
 * 오늘의운세 기록 목록 + 개별·전체 삭제 — ConcernRoom의 로그 삭제 UX와 같은 결
 * (낙관적 제거·실패 롤백·confirm). 삭제 범위는 데일리 기록뿐(유료 풀이 캐시는 보호).
 */
export default function ArchiveLogList({ entries: initial }: { entries: ArchiveEntry[] }) {
  const [entries, setEntries] = useState(initial);

  async function removeOne(id: string) {
    // 실패 시 그 항목만 제자리에 되살린다 — 전체 스냅샷 복원은 응답을 기다리는 동안
    // 지워진 다른 항목까지 되살릴 수 있다(MindChat·ConcernRoom과 같은 규칙, 리뷰 반영).
    const index = entries.findIndex((e) => e.id === id);
    const removed = entries[index];
    if (!removed) return;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    const res = await deleteDailyLog(id);
    if (!res.ok) {
      setEntries((cur) => {
        const next = [...cur];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
    }
  }

  async function removeAll() {
    if (!window.confirm("오늘의운세 기록을 모두 지울까요? 되돌릴 수 없어요.")) return;
    const before = entries;
    setEntries([]);
    const res = await deleteAllDailyLogs();
    if (!res.ok) setEntries(before);
  }

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          오늘의운세 기록
        </h2>
        {entries.length > 0 && (
          <button
            onClick={() => void removeAll()}
            className="press text-xs text-text-soft underline underline-offset-4"
          >
            전체 삭제
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-text-soft">
          아직 쌓인 기록이 없어요. 오늘의운세에 매일 들르면 하나씩 모여요 🌱
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="group flex items-start gap-2 rounded-card bg-warm-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-soft">{e.date}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-main">{e.headline}</p>
              </div>
              <button
                onClick={() => void removeOne(e.id)}
                aria-label="이 기록 삭제"
                className="delete-btn shrink-0 rounded-full p-1 text-xs text-text-soft"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
