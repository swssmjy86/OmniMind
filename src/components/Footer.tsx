import Link from "next/link";

// 전역 푸터(§9.1) — 모든 화면 하단. 사업자 정보는 넣지 않는다(개발 단계 — 빈 자리를
// 만들어 두면 빈칸이 노출된다). 정식 오픈 체크리스트는 설계서 §9.4.
const LINKS = [
  { href: "/contact", label: "문의하기" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/sources", label: "출처" },
  { href: "/faq", label: "Q&A" },
] as const;

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-text-soft/15 px-6 pb-24 pt-6 text-center">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-text-soft">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="underline-offset-2 hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-[11px] leading-relaxed text-text-soft/80">
        옴니마인드의 풀이는 마음을 돌보는 참고용이에요 — 의료·법률·투자 판단의 근거로 삼지
        말아 주세요.
      </p>
    </footer>
  );
}
