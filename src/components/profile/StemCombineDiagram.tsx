import type { ProfileContext } from "@/lib/engine";
import { stemCombinePairs, type PillarKey } from "@/lib/engine/stem-combine";
import { STEM_HANJA } from "./SajuChart";

// 천간합 원형 다이어그램 — 네 기둥(년·월·일·시)을 원 둘레 네 점으로 놓고, 서로 합을 이루는
// 쌍만 실선으로 잇는다. 계산은 stemCombinePairs(엔진, 순수)가 전부 하고 이 컴포넌트는 그 결과를
// 그리기만 한다. 합이 하나도 없으면 조용히 생략 — 없는 걸 있는 것처럼 꾸미지 않는다(§5.4 정신).

const POS: Record<PillarKey, { x: number; y: number; label: string }> = {
  year: { x: 60, y: 14, label: "년" },
  month: { x: 106, y: 60, label: "월" },
  day: { x: 60, y: 106, label: "일" },
  hour: { x: 14, y: 60, label: "시" },
};

export default function StemCombineDiagram({ ctx }: { ctx: ProfileContext }) {
  const pairs = stemCombinePairs(ctx.pillars);
  if (pairs.length === 0) return null;

  const stemChar: Partial<Record<PillarKey, string>> = {
    year: ctx.pillars.year[0],
    month: ctx.pillars.month[0],
    day: ctx.pillars.day[0],
    hour: ctx.pillars.hour ? ctx.pillars.hour[0] : undefined,
  };
  const linked = new Set(pairs.flatMap((p) => [p.a, p.b]));
  const caption = pairs.map((p) => `${POS[p.a].label}·${POS[p.b].label}`).join(", ");

  return (
    <div className="mt-4 rounded-card bg-warm-surface p-4">
      <p className="mb-2 text-sm text-text-soft">천간합 — 네 기둥이 맺는 인연</p>
      <svg viewBox="0 0 120 120" className="mx-auto block w-36" role="img" aria-label="천간합 다이어그램">
        {pairs.map((p) => (
          <line
            key={`${p.a}-${p.b}`}
            x1={POS[p.a].x} y1={POS[p.a].y}
            x2={POS[p.b].x} y2={POS[p.b].y}
            stroke="var(--accent-coral)"
            strokeWidth={2}
          />
        ))}
        {(Object.keys(POS) as PillarKey[]).map((key) => {
          const ch = stemChar[key];
          const on = linked.has(key);
          return (
            <g key={key}>
              <circle
                cx={POS[key].x} cy={POS[key].y} r={on ? 14 : 9}
                fill={on ? "var(--accent-coral)" : "var(--warm-base)"}
                stroke="var(--text-soft)"
                strokeWidth={on ? 0 : 1}
              />
              {ch && (
                <text
                  x={POS[key].x} y={POS[key].y + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill={on ? "#ffffff" : "var(--text-soft)"}
                  className="font-[family-name:var(--font-serif-kr)]"
                >
                  {STEM_HANJA[ch]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-center text-[11px] text-text-soft">
        {caption} 기둥의 천간이 서로 합을 이루고 있어요.
      </p>
    </div>
  );
}
