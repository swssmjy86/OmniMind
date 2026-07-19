import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자주 묻는 질문 — 옴니마인드",
  description: "사주 계산의 정확성, 무료 범위, 크레딧, 개인정보까지 — 자주 받는 질문에 답해요.",
};

// §8 Q&A — <details> 기반(JS 0KB) + FAQPage JSON-LD(검색 노출).
// 답변은 UI와 JSON-LD가 같은 데이터를 공유한다 — 두 벌로 어긋나지 않게.
export const FAQ_ITEMS: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: "사주 계산은 정확한가요?",
    a: "계산은 100% 규칙 기반 코드로 해요. 절기는 천문 계산으로 구해 미국 해군천문대(USNO) 공표값과, 일진은 한국천문연구원(KASI) 공표값 467건과 대조해 확인했어요.",
    link: { href: "/sources", label: "풀이의 근거 보기" },
  },
  {
    q: "태어난 시간을 모르면 어떻게 되나요?",
    a: "시주를 비워 두고 년·월·일 세 기둥으로 풀어드려요. 시간을 알면 더 깊어지지만, 몰라도 풀이는 온전히 동작해요.",
  },
  {
    q: "무료는 어디까지인가요?",
    a: "오늘의운세는 누구나 무료예요. 로그인하면 내 사주 풀이와 하루 1회 마음·고민 이야기까지 무료로 열려요. 더 깊은 풀이는 상담 크레딧으로 만나요.",
  },
  {
    q: "크레딧은 어떻게 쓰나요?",
    a: "크레딧은 직업·연애·재물·결혼 같은 심층 풀이를 열 때, 그리고 하루 1회 무료를 넘어 마음·고민 이야기를 이어갈 때 쓰여요. 한 번 연 풀이는 다시 볼 때 크레딧이 들지 않아요.",
  },
  {
    q: "AI가 보는 건가요?",
    a: "사주 계산에는 AI가 관여하지 않아요. 계산은 전부 규칙 기반 코드가 하고, AI는 이미 계산된 결과를 당신에게 맞는 문장으로 다듬는 일만 해요.",
  },
  {
    q: "내 정보는 안전한가요?",
    a: "꼭 필요한 정보만 받고, 처리 방식을 개인정보처리방침에 그대로 적어 두었어요. 마음·고민 기록은 언제든 직접 지울 수 있어요.",
    link: { href: "/privacy", label: "개인정보처리방침 보기" },
  },
  {
    q: "MBTI·혈액형은 왜 물어보나요?",
    a: "풀이의 뼈대는 사주가 세워요. MBTI와 혈액형은 그 기운이 당신에게 어떻게 드러나는지 설명하는 보조 지표로만 쓰고, 없어도 풀이는 동작해요.",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <main className="fade-rise p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        자주 묻는 질문
      </h1>
      <div className="mt-5 flex flex-col gap-3">
        {FAQ_ITEMS.map((item) => (
          <details key={item.q} className="rounded-card bg-warm-surface p-4">
            <summary className="cursor-pointer text-sm font-medium text-text-main">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-text-soft">{item.a}</p>
            {item.link && (
              <Link
                href={item.link.href}
                className="mt-2 inline-block text-sm text-moon-gold underline underline-offset-2"
              >
                {item.link.label}
              </Link>
            )}
          </details>
        ))}
      </div>
    </main>
  );
}
