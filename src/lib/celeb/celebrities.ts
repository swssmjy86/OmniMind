// 유명인 사주 궁합(2026-07-26) — 표현 계층 순수 상수. 계산은 기존 궁합 엔진이 그대로 한다.
//
// 수록 원칙
//  1. 생년월일이 널리 공개된 인물만 담는다.
//  2. 출생 시각은 공개되지 않으므로 전원 시간 미상으로 본다 — 시주 없이 년·월·일주만.
//  3. 절기 테이블이 1900~2100이라 1900년 이후 출생자만 담는다(근대 이전 인물은 계산 불가).
//  4. 해외 인물은 출생지 시간대 차이로 일주가 하루 어긋날 수 있다 — 시각 미상이라 어차피
//     근사치이며, 화면 하단 고지에 이 한계를 밝힌다.
//  5. 근대 인물(1940년대 이전 출생 한국인)은 공식 기록이 음력인 경우가 많아 담지 않는다.
//     엔진은 양력 입력을 전제하므로 음력 날짜를 그대로 넣으면 월주가 통째로 어긋난다.
//
// 축은 지역(국내·해외) × 갈래(노래·연기·스포츠) 둘이다. 화면은 지역을 먼저 고르고
// 갈래로 좁힌다.

export type CelebRegion = "kr" | "world";
export type CelebCategory = "music" | "actor" | "sports";

export interface Celebrity {
  id: string;
  name: string;
  /** 양력 "YYYY-MM-DD". 출생 시각은 담지 않는다(원칙 2). */
  birthDate: string;
  region: CelebRegion;
  category: CelebCategory;
  /** 한 줄 소개 — 톤 가드 준수(단정·평가 금지). */
  blurb: string;
}

export const CELEB_REGIONS: { id: CelebRegion; label: string }[] = [
  { id: "kr", label: "국내" },
  { id: "world", label: "해외" },
];

export const CELEB_CATEGORIES: { id: CelebCategory; label: string }[] = [
  { id: "music", label: "노래하는 사람" },
  { id: "actor", label: "연기하는 사람" },
  { id: "sports", label: "몸으로 말하는 사람" },
];

export const CELEBRITIES: Celebrity[] = [
  // ── 국내 · 노래하는 사람 ──
  { id: "iu", name: "아이유", birthDate: "1993-05-16", region: "kr", category: "music",
    blurb: "목소리로 계절을 바꾸는 결" },
  { id: "g-dragon", name: "지드래곤", birthDate: "1988-08-18", region: "kr", category: "music",
    blurb: "자기 색을 한 번도 접지 않은 결" },
  { id: "taeyeon", name: "태연", birthDate: "1989-03-09", region: "kr", category: "music",
    blurb: "여린 결로 가장 멀리 닿는 목소리" },
  { id: "psy", name: "싸이", birthDate: "1977-12-31", region: "kr", category: "music",
    blurb: "웃음으로 세계를 흔든 결" },
  { id: "bts-v", name: "뷔 (BTS)", birthDate: "1995-12-30", region: "kr", category: "music",
    blurb: "무대 위에서 가장 조용한 온도" },
  { id: "bts-jungkook", name: "정국 (BTS)", birthDate: "1997-09-01", region: "kr", category: "music",
    blurb: "무엇이든 끝까지 해보는 결" },
  { id: "jennie", name: "제니 (BLACKPINK)", birthDate: "1996-01-16", region: "kr", category: "music",
    blurb: "물러서지 않는 자신감의 결" },
  { id: "lisa", name: "리사 (BLACKPINK)", birthDate: "1997-03-27", region: "kr", category: "music",
    blurb: "낯선 땅에서 자기 자리를 만든 결" },

  // ── 국내 · 연기하는 사람 ──
  { id: "song-kangho", name: "송강호", birthDate: "1967-01-17", region: "kr", category: "actor",
    blurb: "평범한 얼굴로 시대를 담는 결" },
  { id: "lee-byunghun", name: "이병헌", birthDate: "1970-07-12", region: "kr", category: "actor",
    blurb: "눈빛 하나로 공기를 바꾸는 결" },
  { id: "jun-jihyun", name: "전지현", birthDate: "1981-10-30", region: "kr", category: "actor",
    blurb: "가벼움과 서늘함을 함께 지닌 결" },
  { id: "gong-yoo", name: "공유", birthDate: "1979-07-10", region: "kr", category: "actor",
    blurb: "따뜻함 아래 단단한 심지" },
  { id: "son-yejin", name: "손예진", birthDate: "1982-01-11", region: "kr", category: "actor",
    blurb: "감정의 결을 오래 붙드는 마음" },
  { id: "hyun-bin", name: "현빈", birthDate: "1982-09-25", region: "kr", category: "actor",
    blurb: "말수는 적고 마음은 깊은 결" },
  { id: "ma-dongseok", name: "마동석", birthDate: "1971-03-01", region: "kr", category: "actor",
    blurb: "든든함이 곧 성격이 된 결" },
  { id: "kim-goeun", name: "김고은", birthDate: "1991-07-02", region: "kr", category: "actor",
    blurb: "정해진 틀에 담기지 않는 결" },

  // ── 국내 · 몸으로 말하는 사람 ──
  { id: "son-heungmin", name: "손흥민", birthDate: "1992-07-08", region: "kr", category: "sports",
    blurb: "웃으며 가장 멀리 달리는 결" },
  { id: "kim-yuna", name: "김연아", birthDate: "1990-09-05", region: "kr", category: "sports",
    blurb: "떨림을 고요로 바꾸는 마음" },
  { id: "park-jisung", name: "박지성", birthDate: "1981-02-25", region: "kr", category: "sports",
    blurb: "드러나지 않는 자리에서 팀을 세운 결" },
  { id: "ryu-hyunjin", name: "류현진", birthDate: "1987-03-25", region: "kr", category: "sports",
    blurb: "서두르지 않는 이의 힘" },
  { id: "lee-kangin", name: "이강인", birthDate: "2001-02-19", region: "kr", category: "sports",
    blurb: "어릴 적부터 자기 길을 고른 결" },
  { id: "pak-seri", name: "박세리", birthDate: "1977-09-28", region: "kr", category: "sports",
    blurb: "맨발로 물에 들어간 그 여름의 결" },

  // ── 해외 · 노래하는 사람 ──
  { id: "taylor-swift", name: "테일러 스위프트", birthDate: "1989-12-13", region: "world", category: "music",
    blurb: "겪은 것을 전부 노래로 바꾸는 결" },
  { id: "ariana-grande", name: "아리아나 그란데", birthDate: "1993-06-26", region: "world", category: "music",
    blurb: "작은 몸에 담긴 커다란 음역" },
  { id: "billie-eilish", name: "빌리 아일리시", birthDate: "2001-12-18", region: "world", category: "music",
    blurb: "속삭임으로 한 세대를 부른 목소리" },
  { id: "justin-bieber", name: "저스틴 비버", birthDate: "1994-03-01", region: "world", category: "music",
    blurb: "너무 일찍 유명해진 이의 시간" },
  { id: "ed-sheeran", name: "에드 시런", birthDate: "1991-02-17", region: "world", category: "music",
    blurb: "기타 한 대로 경기장을 채우는 결" },
  { id: "bruno-mars", name: "브루노 마스", birthDate: "1985-10-08", region: "world", category: "music",
    blurb: "옛 흥을 오늘로 데려오는 손끝" },
  { id: "dua-lipa", name: "두아 리파", birthDate: "1995-08-22", region: "world", category: "music",
    blurb: "낮은 목소리로 밤을 여는 결" },
  { id: "rihanna", name: "리한나", birthDate: "1988-02-20", region: "world", category: "music",
    blurb: "무대 밖에서 더 크게 움직이는 결" },

  // ── 해외 · 연기하는 사람 ──
  { id: "timothee-chalamet", name: "티모테 샬라메", birthDate: "1995-12-27", region: "world", category: "actor",
    blurb: "여림을 숨기지 않는 결" },
  { id: "zendaya", name: "젠데이아", birthDate: "1996-09-01", region: "world", category: "actor",
    blurb: "어린 나이에 자기 중심을 세운 결" },
  { id: "tom-holland", name: "톰 홀랜드", birthDate: "1996-06-01", region: "world", category: "actor",
    blurb: "장난기 아래 성실함이 있는 결" },
  { id: "emma-watson", name: "엠마 왓슨", birthDate: "1990-04-15", region: "world", category: "actor",
    blurb: "배우이면서 계속 배우려는 마음" },
  { id: "margot-robbie", name: "마고 로비", birthDate: "1990-07-02", region: "world", category: "actor",
    blurb: "밝음과 서늘함을 오가는 결" },
  { id: "leonardo-dicaprio", name: "레오나르도 디카프리오", birthDate: "1974-11-11", region: "world", category: "actor",
    blurb: "얼굴보다 오래 남은 연기" },
  { id: "keanu-reeves", name: "키아누 리브스", birthDate: "1964-09-02", region: "world", category: "actor",
    blurb: "조용히 다정한 쪽을 고르는 결" },

  // ── 해외 · 몸으로 말하는 사람 ──
  { id: "messi", name: "리오넬 메시", birthDate: "1987-06-24", region: "world", category: "sports",
    blurb: "말 대신 발끝으로 말하는 결" },
  { id: "ronaldo", name: "크리스티아누 호날두", birthDate: "1985-02-05", region: "world", category: "sports",
    blurb: "재능보다 반복을 믿은 결" },
  { id: "mbappe", name: "킬리안 음바페", birthDate: "1998-12-20", region: "world", category: "sports",
    blurb: "속도가 곧 성격이 된 결" },
  { id: "lebron-james", name: "르브론 제임스", birthDate: "1984-12-30", region: "world", category: "sports",
    blurb: "오래 잘하는 쪽을 택한 결" },
  { id: "michael-jordan", name: "마이클 조던", birthDate: "1963-02-17", region: "world", category: "sports",
    blurb: "지는 걸 끝내 받아들이지 않은 결" },
  { id: "usain-bolt", name: "우사인 볼트", birthDate: "1986-08-21", region: "world", category: "sports",
    blurb: "웃으면서 가장 빨랐던 결" },
  { id: "serena-williams", name: "세리나 윌리엄스", birthDate: "1981-09-26", region: "world", category: "sports",
    blurb: "코트 위에서 물러선 적 없는 결" },
];

/** 절기 테이블(1900~2100) 하한 — 이보다 앞선 출생자는 사주를 세울 수 없다. */
export const CELEB_MIN_YEAR = 1900;

export function findCelebrity(id: string): Celebrity | null {
  return CELEBRITIES.find((c) => c.id === id) ?? null;
}

export function celebritiesIn(region: CelebRegion, category: CelebCategory): Celebrity[] {
  return CELEBRITIES.filter((c) => c.region === region && c.category === category);
}
