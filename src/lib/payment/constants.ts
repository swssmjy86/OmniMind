// P7-3 프리미엄 이용권(레거시) — 단건 결제로 30일씩 연장하는 모델.
// P8부터 신규 판매는 상담 크레딧(CREDIT_PACKAGES)으로 전환됐고, 이 상수들은 이미 이용권을
// 구매한 사용자의 기존 화면 표시·재구독 호환을 위해 남아 있다.

/** 이용권 1회 결제로 연장되는 일수. */
export const PASS_DAYS = 30;

/** 이용권 가격(원). 토스 승인 요청 금액과 서버 기록 금액이 항상 이 값과 일치해야 한다. */
export const PASS_PRICE = 3900;

/** 토스 결제창·영수증에 표시되는 주문명. */
export const PASS_ORDER_NAME = "옴니마인드 프리미엄 30일 이용권";

// P8 상담 크레딧 패키지 — 1회 1,000원 기준 묶음 판매. 마음·고민 상담 하루 무료 1회를 넘긴
// 다음부터 1회씩 차감되며, 소비 시 유료 LLM(고퀄 상담)으로 응답한다.
export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  label: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "credits-5", credits: 5, price: 5000, label: "상담 크레딧 5회" },
  { id: "credits-10", credits: 10, price: 10000, label: "상담 크레딧 10회" },
];

export function findCreditPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}
