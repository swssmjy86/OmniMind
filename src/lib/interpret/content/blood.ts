import type { BloodType } from "@/lib/engine/types";

// 혈액형 4유형 — 대중적 이미지를 따뜻한 결로. 단정·낙인 회피.
export const BLOOD_TEXT: Record<BloodType, { body: string }> = {
  A: { body: "겉으로 드러내기보다 속으로 깊이 살피며, 곁을 조용히 지켜주는 다정함이 있어요." },
  B: { body: "자기만의 리듬을 소중히 여기고, 좋아하는 것에 깊이 빠져드는 자유로움이 있어요." },
  O: { body: "품이 넓고 솔직해서, 사람들을 자연스레 끌어안는 따뜻한 힘이 있어요." },
  AB: { body: "여러 결을 동시에 지녀, 상황을 다면적으로 바라보는 독특한 시선이 있어요." },
};
