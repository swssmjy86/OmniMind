// 유명인 사주 궁합(2026-07-26) — 표현 계층 순수 상수. 계산은 기존 궁합 엔진이 그대로 한다.
//
// 수록 원칙
//  1. 생년월일이 널리 공개된 인물만 담는다.
//  2. 출생 시각은 공개되지 않으므로 전원 시간 미상으로 본다 — 시주 없이 년·월·일주만.
//  3. 절기 테이블이 1900~2100이라 1900년 이후 출생자만 담는다(근대 이전 인물은 계산 불가).
//  4. 해외 인물은 출생지 시간대 차이로 일주가 하루 어긋날 수 있다 — 시각 미상이라 어차피
//     근사치이며, 화면 하단 고지에 이 한계를 밝힌다.

export type CelebCategory = "music" | "actor" | "sports" | "figure" | "world";

export interface Celebrity {
  id: string;
  name: string;
  /** 양력 "YYYY-MM-DD". 출생 시각은 담지 않는다(원칙 2). */
  birthDate: string;
  category: CelebCategory;
  /** 한 줄 소개 — 톤 가드 준수(단정·평가 금지). */
  blurb: string;
}

export const CELEB_CATEGORIES: { id: CelebCategory; label: string }[] = [
  { id: "music", label: "노래하는 사람" },
  { id: "actor", label: "연기하는 사람" },
  { id: "sports", label: "몸으로 말하는 사람" },
  { id: "figure", label: "길을 낸 사람" },
  { id: "world", label: "세계의 얼굴" },
];

export const CELEBRITIES: Celebrity[] = [
  // ── 노래하는 사람 ──
  { id: "iu", name: "아이유", birthDate: "1993-05-16", category: "music",
    blurb: "목소리로 계절을 바꾸는 사람" },
  { id: "g-dragon", name: "지드래곤", birthDate: "1988-08-18", category: "music",
    blurb: "자기 색을 한 번도 접지 않은 사람" },
  { id: "taeyeon", name: "태연", birthDate: "1989-03-09", category: "music",
    blurb: "여린 결로 가장 멀리 닿는 목소리" },
  { id: "psy", name: "싸이", birthDate: "1977-12-31", category: "music",
    blurb: "웃음으로 세계를 흔든 사람" },
  { id: "bts-v", name: "뷔 (BTS)", birthDate: "1995-12-30", category: "music",
    blurb: "무대 위에서 가장 조용한 온도" },
  { id: "bts-jungkook", name: "정국 (BTS)", birthDate: "1997-09-01", category: "music",
    blurb: "무엇이든 끝까지 해보는 사람" },
  { id: "jennie", name: "제니 (BLACKPINK)", birthDate: "1996-01-16", category: "music",
    blurb: "물러서지 않는 자신감의 결" },
  { id: "lisa", name: "리사 (BLACKPINK)", birthDate: "1997-03-27", category: "music",
    blurb: "낯선 땅에서 자기 자리를 만든 사람" },

  // ── 연기하는 사람 ──
  { id: "song-kangho", name: "송강호", birthDate: "1967-01-17", category: "actor",
    blurb: "평범한 얼굴로 시대를 담는 사람" },
  { id: "lee-byunghun", name: "이병헌", birthDate: "1970-07-12", category: "actor",
    blurb: "눈빛 하나로 공기를 바꾸는 사람" },
  { id: "jun-jihyun", name: "전지현", birthDate: "1981-10-30", category: "actor",
    blurb: "가벼움과 서늘함을 함께 지닌 결" },
  { id: "gong-yoo", name: "공유", birthDate: "1979-07-10", category: "actor",
    blurb: "따뜻함 아래 단단한 심지" },
  { id: "son-yejin", name: "손예진", birthDate: "1982-01-11", category: "actor",
    blurb: "감정의 결을 오래 붙드는 사람" },
  { id: "hyun-bin", name: "현빈", birthDate: "1982-09-25", category: "actor",
    blurb: "말수는 적고 마음은 깊은 결" },
  { id: "ma-dongseok", name: "마동석", birthDate: "1971-03-01", category: "actor",
    blurb: "든든함이 곧 성격이 된 사람" },
  { id: "kim-goeun", name: "김고은", birthDate: "1991-07-02", category: "actor",
    blurb: "정해진 틀에 담기지 않는 결" },

  // ── 몸으로 말하는 사람 ──
  { id: "son-heungmin", name: "손흥민", birthDate: "1992-07-08", category: "sports",
    blurb: "웃으며 가장 멀리 달리는 사람" },
  { id: "kim-yuna", name: "김연아", birthDate: "1990-09-05", category: "sports",
    blurb: "떨림을 고요로 바꾸는 사람" },
  { id: "park-jisung", name: "박지성", birthDate: "1981-02-25", category: "sports",
    blurb: "드러나지 않는 자리에서 팀을 세운 사람" },
  { id: "ryu-hyunjin", name: "류현진", birthDate: "1987-03-25", category: "sports",
    blurb: "서두르지 않는 사람의 힘" },
  { id: "lee-kangin", name: "이강인", birthDate: "2001-02-19", category: "sports",
    blurb: "어릴 적부터 자기 길을 고른 사람" },
  { id: "pak-seri", name: "박세리", birthDate: "1977-09-28", category: "sports",
    blurb: "맨발로 물에 들어간 그 여름의 사람" },

  // ── 길을 낸 사람 ──
  { id: "chung-juyung", name: "정주영", birthDate: "1915-11-25", category: "figure",
    blurb: "없는 길을 먼저 걸어본 사람" },
  { id: "lee-kunhee", name: "이건희", birthDate: "1942-01-09", category: "figure",
    blurb: "판을 통째로 다시 짠 사람" },
  { id: "nam-junepaik", name: "백남준", birthDate: "1932-07-20", category: "figure",
    blurb: "기계에 마음을 불어넣은 사람" },
  { id: "ban-kimoon", name: "반기문", birthDate: "1944-06-13", category: "figure",
    blurb: "낮은 목소리로 먼 곳을 잇는 사람" },

  // ── 세계의 얼굴 ──
  { id: "steve-jobs", name: "스티브 잡스", birthDate: "1955-02-24", category: "world",
    blurb: "덜어내는 것으로 완성한 사람" },
  { id: "elon-musk", name: "일론 머스크", birthDate: "1971-06-28", category: "world",
    blurb: "남들이 농담이라 여긴 걸 밀고 간 사람" },
  { id: "oprah", name: "오프라 윈프리", birthDate: "1954-01-29", category: "world",
    blurb: "듣는 힘으로 사람을 여는 사람" },
  { id: "taylor-swift", name: "테일러 스위프트", birthDate: "1989-12-13", category: "world",
    blurb: "겪은 것을 전부 노래로 바꾸는 사람" },
  { id: "messi", name: "리오넬 메시", birthDate: "1987-06-24", category: "world",
    blurb: "말 대신 발끝으로 말하는 사람" },
  { id: "michael-jordan", name: "마이클 조던", birthDate: "1963-02-17", category: "world",
    blurb: "지는 걸 끝내 받아들이지 않은 사람" },
];

/** 절기 테이블(1900~2100) 하한 — 이보다 앞선 출생자는 사주를 세울 수 없다. */
export const CELEB_MIN_YEAR = 1900;

export function findCelebrity(id: string): Celebrity | null {
  return CELEBRITIES.find((c) => c.id === id) ?? null;
}

export function celebritiesByCategory(category: CelebCategory): Celebrity[] {
  return CELEBRITIES.filter((c) => c.category === category);
}
