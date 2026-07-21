import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "풀이의 근거 — 옴니마인드",
  description: "옴니마인드의 사주 계산이 어디에 근거하는지, 검증 방법과 함께 공개해요.",
};

// §7 출처 — 신뢰 축은 지어낸 권위가 아니라 검증 가능한 계산이다.
// 이 페이지는 마케팅 카피가 아니라 사실의 공개이며, 사실이기 때문에 강하다.
export default function SourcesPage() {
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        풀이의 근거
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-text-soft">
        옴니마인드의 계산이 무엇에 근거하고 어떻게 검증되는지, 있는 그대로 공개해요.
      </p>

      <section className="mt-6 rounded-card bg-warm-surface p-5">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          계산 — 검증할 수 있어요
        </h2>
        <ul className="mt-3 list-disc space-y-3 pl-4 text-sm leading-relaxed text-text-main">
          <li>
            <strong>절기</strong> — 태양의 겉보기 위치(황경)를 천문 계산으로 구해 1900~2100년
            범위를 초 단위로 저장해요. 미국 해군천문대(USNO)가 공표한 분점·지점 시각과
            자동 대조하는 검사가 코드에 상시 포함되어 있어요.
          </li>
          <li>
            <strong>일진</strong> — 2000년 1월 7일(갑자일)을 기준으로 한 날짜 산술로 구하고,
            한국천문연구원(KASI)이 공표한 일진 467건(1900~2050)과 대조해 확정했어요.
          </li>
          <li>
            <strong>시간 보정</strong> — 서머타임 시행 기간(−1시간), 표준시가 UTC+8:30이던
            시대(+30분), 밤 11시 이후의 야자시 경계까지 출생 시각 그대로 반영해요.
          </li>
        </ul>
      </section>

      <section className="mt-4 rounded-card bg-warm-surface p-5">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          해석 — 정직하게 알려드려요
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-main">
          풀이는 전통 명리 이론의 체계(일간·오행·십성·대운·12운성)에 기반하지만,
          문장은 옴니마인드가 써요. 특정 고전 문헌을 문장별 전거로 표기하지 않아요 —
          그렇게 보이도록 지어낸 인용은 이 페이지의 존재 이유를 무너뜨리니까요.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-text-main">
          다만 이 체계 자체가 어디서 왔는지는 알려드릴 수 있어요. 오행·음양 사상은
          여씨춘추(呂氏春秋)·회남자(淮南子) 같은 고전에 뿌리를 둔, 이천 년 넘게 이어온
          동양 철학이에요. 그 위에서 옴니마인드가 오늘의 언어로 새로 옮겨 쓴 것뿐이에요.
        </p>
      </section>

      <section className="mt-4 rounded-card bg-warm-surface p-5">
        <h2 className="font-[family-name:var(--font-serif-kr)] text-lg text-primary-green">
          AI에 대하여
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-main">
          계산에는 AI가 관여하지 않아요. 사주를 세우는 일은 전부 규칙 기반 코드가 하고,
          AI는 이미 계산된 결과를 당신에게 맞는 문장으로 다듬는 일만 해요.
        </p>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-text-soft">
        옴니마인드의 풀이는 참고용이에요 — 의료·법률·투자 판단의 근거로 삼지 말아 주세요.
      </p>
    </main>
  );
}
