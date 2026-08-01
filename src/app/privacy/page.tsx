import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침 — 옴니마인드" };

// 개인정보처리방침 — 실제 코드 실사 기준. 완전 익명 전환(2026-08-01) 반영:
// 계정·로그인·결제가 없고, 프로필·기록은 이용자 기기(localStorage)에만 저장된다.
// 서버로 나가는 개인정보는 (1) AI 문장 생성을 위해 전송되는 고민·채팅 텍스트와 사주
// 프로필 맥락(국외이전 핵심), (2) 익명 문의 시 이메일·문의 내용뿐이다.
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 수집하는 정보",
    body: [
      "회원가입·로그인이 없어 계정 정보를 수집하지 않습니다.",
      "프로필(생년월일시·성별·MBTI·혈액형·닉네임)과 마음·고민 기록은 서버가 아니라 이용자의 기기(브라우저 저장소)에만 저장되며, 당사 서버로 전송·수집되지 않습니다.",
      "문의하기 이용 시: 이용자가 입력한 이메일·문의 내용.",
    ],
  },
  {
    title: "2. 처리 위탁",
    body: [
      "데이터베이스: Supabase(서울 리전). 익명 지표·문의·익명 응원 등 계정과 무관한 데이터만 저장됩니다(개인 프로필·상담 기록은 저장하지 않습니다).",
    ],
  },
  {
    title: "3. 국외 이전",
    body: [
      "AI 문장 생성: OpenRouter(미국). 마음·고민 텍스트와 사주 프로필 맥락이 문장 생성을 위해 전송되며, OpenRouter는 요청 상황에 따라 해외 AI 모델(Google, Anthropic 등)로 라우팅할 수 있습니다. 전송된 데이터는 문장 생성 목적으로만 사용되며 서버에 저장되지 않습니다.",
      "호스팅: Vercel(미국). 서비스 요청이 Vercel 인프라를 경유합니다.",
    ],
  },
  {
    title: "4. 이용자의 권리",
    body: [
      "프로필·마음·고민 기록은 이용자 기기에만 있으므로, 이용자가 직접 열람·수정·삭제를 완전히 통제합니다.",
      "각 기록은 서비스 내 삭제 기능으로 즉시 지울 수 있고, 브라우저 저장소를 비우면 모든 로컬 데이터가 함께 삭제됩니다.",
    ],
  },
  {
    title: "5. 보유 기간과 파기",
    body: [
      "프로필·상담 기록은 서버에 보유하지 않습니다(기기에만 저장). 익명 문의 내용은 처리 완료 후 관련 법령이 정한 기간 내에 파기합니다.",
    ],
  },
  {
    title: "6. 쿠키",
    body: [
      "공유 링크의 유입 경로 확인을 위한 최소한의 쿠키만 사용합니다. 로그인 세션 쿠키나 광고 목적의 제3자 추적 쿠키는 사용하지 않습니다.",
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
