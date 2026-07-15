import type { ProfileContext } from "@/lib/engine";
import {
  HEAVENLY_STEMS, EARTHLY_BRANCHES, ELEMENTS,
  stemElement, branchElement, branchHiddenStems,
} from "@/lib/engine/constants";
import { twelveStageByChar } from "@/lib/engine/twelve-stages";

// 한자 표기 — 전통 명식표 느낌.
const STEM_HANJA: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
};
const BRANCH_HANJA: Record<string, string> = {
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
};

// 오행색(전통 배색을 브랜드에 맞게 절제). 목=녹, 화=코랄, 토=흙, 금=회, 수=슬레이트.
const EL_COLOR: Record<string, { bg: string; fg: string }> = {
  목: { bg: "#3E7D5A", fg: "#ffffff" },
  화: { bg: "#D97757", fg: "#ffffff" },
  토: { bg: "#C9A86A", fg: "#3E3A36" },
  금: { bg: "#A7A093", fg: "#3E3A36" },
  수: { bg: "#3B4A57", fg: "#ffffff" },
};

function stemEl(ch: string): string {
  const i = HEAVENLY_STEMS.indexOf(ch as (typeof HEAVENLY_STEMS)[number]);
  return i >= 0 ? ELEMENTS[stemElement(i)] : "토";
}
function branchEl(ch: string): string {
  const i = EARTHLY_BRANCHES.indexOf(ch as (typeof EARTHLY_BRANCHES)[number]);
  return i >= 0 ? ELEMENTS[branchElement(i)] : "토";
}
/** 지지 글자 → 지장간(여기·중기·정기) 한글 나열 "무·병·갑" */
function hiddenStemsOf(branchCh: string): string {
  const i = EARTHLY_BRANCHES.indexOf(branchCh as (typeof EARTHLY_BRANCHES)[number]);
  if (i < 0) return "";
  return branchHiddenStems(i).map((s) => HEAVENLY_STEMS[s]).join("·");
}

function GanjiCell({ ch, hanja, el }: { ch: string; hanja: string; el: string }) {
  const c = EL_COLOR[el];
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg py-2.5"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      <span className="text-lg leading-none font-[family-name:var(--font-serif-kr)]">{hanja}</span>
      <span className="mt-0.5 text-[10px] leading-none opacity-80">{ch} · {el}</span>
    </div>
  );
}

export default function SajuChart({ ctx }: { ctx: ProfileContext }) {
  const cols = [
    { label: "시주", pillar: ctx.pillars.hour, stemGod: ctx.tenGods.hourStem, branchGod: ctx.tenGods.hourBranch },
    { label: "일주", pillar: ctx.pillars.day, stemGod: "일원", branchGod: ctx.tenGods.dayBranch },
    { label: "월주", pillar: ctx.pillars.month, stemGod: ctx.tenGods.monthStem, branchGod: ctx.tenGods.monthBranch },
    { label: "년주", pillar: ctx.pillars.year, stemGod: ctx.tenGods.yearStem, branchGod: ctx.tenGods.yearBranch },
  ];

  return (
    <div className="rounded-card bg-warm-surface p-4">
      <p className="mb-3 text-sm text-text-soft">사주 명식</p>

      {/* 열 라벨 */}
      <div className="grid grid-cols-4 gap-2 text-center text-[11px] text-text-soft">
        {cols.map((c) => <div key={c.label}>{c.label}</div>)}
      </div>

      {/* 천간 십성 */}
      <div className="mt-1 grid grid-cols-4 gap-2 text-center text-[10px] text-text-soft">
        {cols.map((c) => <div key={c.label}>{c.pillar ? c.stemGod : ""}</div>)}
      </div>

      {/* 천간 */}
      <div className="mt-1 grid grid-cols-4 gap-2">
        {cols.map((c) =>
          c.pillar ? (
            <GanjiCell key={c.label} ch={c.pillar[0]} hanja={STEM_HANJA[c.pillar[0]]} el={stemEl(c.pillar[0])} />
          ) : (
            <div key={c.label} className="rounded-lg bg-warm-base py-2.5 text-center text-xs text-text-soft">모름</div>
          ),
        )}
      </div>

      {/* 지지 */}
      <div className="mt-1.5 grid grid-cols-4 gap-2">
        {cols.map((c) =>
          c.pillar ? (
            <GanjiCell key={c.label} ch={c.pillar[1]} hanja={BRANCH_HANJA[c.pillar[1]]} el={branchEl(c.pillar[1])} />
          ) : (
            <div key={c.label} className="rounded-lg bg-warm-base py-2.5 text-center text-xs text-text-soft">—</div>
          ),
        )}
      </div>

      {/* 지장간 (여기·중기·정기) — 전통 명식표 관행 */}
      <div className="mt-1 grid grid-cols-4 gap-2 text-center text-[10px] text-text-soft/80">
        {cols.map((c) => (
          <div key={c.label}>{c.pillar ? hiddenStemsOf(c.pillar[1]) : ""}</div>
        ))}
      </div>

      {/* 지지 십성 */}
      <div className="mt-1 grid grid-cols-4 gap-2 text-center text-[10px] text-text-soft">
        {cols.map((c) => <div key={c.label}>{c.pillar ? c.branchGod : ""}</div>)}
      </div>

      {/* 12운성 — 일간 기운의 생멸 단계(장생~양), 전통 명식표 관행 */}
      <div className="mt-1 grid grid-cols-4 gap-2 text-center text-[10px] text-text-soft/80">
        {cols.map((c) => (
          <div key={c.label}>
            {c.pillar ? (twelveStageByChar(ctx.pillars.day[0], c.pillar[1]) ?? "") : ""}
          </div>
        ))}
      </div>

      {/* 시주 미상 안내 */}
      {!ctx.pillars.hour && (
        <p className="mt-3 text-center text-[11px] text-text-soft">
          태어난 시간을 알게 되면, 비어 있는 두 글자(시주)도 채워드려요.
        </p>
      )}

      {/* 오행 분포 */}
      <div className="mt-4 flex items-center justify-between gap-1.5">
        {ELEMENTS.map((e) => {
          const c = EL_COLOR[e];
          const n = ctx.elements.counts[e];
          return (
            <div key={e} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="flex h-8 w-full items-center justify-center rounded-lg text-sm font-medium"
                style={{ backgroundColor: n > 0 ? c.bg : "transparent", color: n > 0 ? c.fg : "var(--text-soft)", border: n > 0 ? "none" : "1px dashed color-mix(in srgb, var(--text-soft) 30%, transparent)" }}
              >
                {n}
              </div>
              <span className="text-[11px] text-text-soft">{e}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
