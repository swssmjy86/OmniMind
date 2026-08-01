import type { Metadata } from "next";

export const metadata: Metadata = { title: "이용약관 — 옴니마인드" };

// §9.3 이용약관 — 개발 단계 초안. 코드를 아는 지금 쓰는 초안이 정식 오픈 시 법률 검토의
// 재료가 된다. 오픈 시 상단 표기를 제거한다(§9.4 체크리스트).
const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 서비스의 정의",
    body: [
      "옴니마인드는 이용자가 입력한 생년월일시 정보를 바탕으로 사주 기반의 해석 콘텐츠(프로필·일진·풀이·대화형 조언)를 제공하는 서비스입니다.",
      "모든 해석 콘텐츠는 전통 명리 이론에 기반한 참고용 콘텐츠이며, 사실의 예측이나 보증이 아닙니다.",
    ],
  },
  {
    title: "2. 이용 조건",
    body: [
      "모든 기능(오늘의운세·심층 풀이·궁합·마음·고민 상담)을 회원가입·로그인 없이 무료로 제공합니다. 별도의 결제나 구독은 없습니다.",
      "이용자가 입력한 생년월일·기록은 서버 계정이 아니라 이용자의 기기(브라우저 저장소)에만 저장됩니다.",
    ],
  },
  {
    title: "3. 면책",
    body: [
      "서비스의 해석 콘텐츠는 참고용이며, 의료·법률·투자 등 중요한 의사결정의 근거로 사용될 수 없습니다. 이용자의 판단과 선택에 따른 결과에 대해 당사는 책임을 지지 않습니다.",
      "천재지변, 외부 서비스 장애 등 당사가 통제할 수 없는 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.",
    ],
  },
  {
    title: "4. 데이터와 이용 제한",
    body: [
      "프로필과 기록은 이용자의 기기에만 저장되므로, 브라우저 저장소를 지우면 함께 삭제됩니다. 각 기록은 화면에서 언제든 직접 지울 수 있습니다.",
      "익명 응원 등 공개 기능에 타인을 비방하거나 부적절한 내용을 남기는 등 서비스를 부정한 목적으로 이용하는 경우 이용이 제한될 수 있습니다.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="fade-rise p-6">
      <h1 className="font-[family-name:var(--font-serif-kr)] text-2xl text-primary-green">
        이용약관
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
