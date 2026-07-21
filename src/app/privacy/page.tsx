import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침 — 옴니마인드" };

// §9.3 개인정보처리방침 — 실제 코드 실사 기준 초안. 국외이전 항목이 핵심이다:
// 고민 텍스트·사주 프로필 맥락이 LLM 제공자(미국)로 실제로 전송된다
// (openrouter-provider.ts, gemini-provider.ts). 일반 템플릿에는 이 항목이 통째로 빠진다.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 수집하는 정보",
    body: [
      "프로필 생성 시: 생년월일시, 성별(선택), 닉네임.",
      "소셜 로그인 시: 카카오 또는 Google 계정의 닉네임·프로필 사진·이메일.",
      "서비스 이용 시: 고민·채팅으로 입력한 텍스트, 결제 기록(주문번호·상품·금액).",
    ],
  },
  {
    title: "2. 처리 위탁",
    body: [
      "데이터베이스·인증: Supabase (서울 리전). 프로필과 이용 기록이 저장됩니다.",
      "결제: 토스페이먼츠. 결제 처리 과정에서 결제 정보가 전달됩니다.",
    ],
  },
  {
    title: "3. 국외 이전",
    body: [
      "AI 문장 생성: OpenRouter(미국), Google Gemini(미국). 고민·채팅 텍스트와 사주 프로필 맥락이 문장 생성을 위해 전송됩니다. 전송된 데이터는 문장 생성 목적으로만 사용됩니다.",
      "소셜 로그인(Google): Google 인증 절차가 Google(미국) 서버를 경유합니다.",
      "호스팅: Vercel(미국). 서비스 요청이 Vercel 인프라를 경유합니다.",
    ],
  },
  {
    title: "4. 이용자의 권리",
    body: [
      "이용자는 자신의 정보에 대해 열람·정정·삭제를 요청할 수 있습니다.",
      "마음(채팅)·고민 기록은 서비스 내 삭제 기능으로 직접, 즉시 삭제할 수 있습니다.",
    ],
  },
  {
    title: "5. 보유 기간과 파기",
    body: [
      "수집한 정보는 회원 탈퇴 또는 삭제 요청 시 지체 없이 파기합니다. 단, 결제 기록 등 관련 법령이 보존을 요구하는 정보는 해당 기간 동안 분리 보관 후 파기합니다.",
    ],
  },
  {
    title: "6. 쿠키",
    body: [
      "로그인 세션 유지와 초대 링크 유입 경로 확인을 위한 최소한의 쿠키를 사용합니다. 광고 목적의 제3자 추적 쿠키는 사용하지 않습니다.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        개인정보처리방침
      </h1>
      <p className="mt-2 rounded-card bg-warm-surface p-3 text-xs text-text-soft">
        개발 단계 초안 — 정식 오픈 전 법률 검토 예정
      </p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="mt-5">
          <h2 className="text-base font-medium text-text-main">{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-text-soft">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
