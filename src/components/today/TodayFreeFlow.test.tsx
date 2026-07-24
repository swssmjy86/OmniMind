import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodayFreeFlow from "./TodayFreeFlow";
import { TODAY_BIRTH_KEY } from "@/lib/today/birth-store";
import { computeGuestDailyExtras } from "@/lib/today/actions";

vi.mock("@/lib/today/actions", () => ({ computeGuestDailyExtras: vi.fn() }));

const props = {
  headline: "헤드라인",
  mind: "마음가짐",
  color: "코랄",
  keyword: "성장",
  lucky: "산책",
  sky: { moon: "달 문구", riseSet: "출몰 문구", altitude: "고도 문구" },
};

const birth = { birthDate: "1990-06-15", birthTime: "", gender: null };
const kstToday = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const extras = {
  date: kstToday(),
  personal: "오늘은 당신다움이 드러나는 날이에요.",
  zodiac: { animal: "말", line: "결이 잘 맞물리는 날이에요." },
  story: "달빛이 다듬은 이야기예요.",
};

describe("TodayFreeFlow — 비로그인 오늘의운세 개인화(블러 해제)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("저장된 태어난 정보가 없으면 개인화 요청을 하지 않는다", async () => {
    render(<TodayFreeFlow {...props} />);
    expect(await screen.findByText("헤드라인")).toBeInTheDocument();
    expect(computeGuestDailyExtras).not.toHaveBeenCalled();
  });

  it("인트로가 없으면 저장된 정보 없을 때 입력 시트가 바로 뜬다", async () => {
    render(<TodayFreeFlow {...props} />);
    expect(await screen.findByText("태어난 날을 알려주실래요?")).toBeInTheDocument();
  });

  it("인트로 영상이 있으면 입력 시트는 영상이 걷힌 뒤에 팝업으로 뜬다", async () => {
    const intro = {
      personaId: "dalzigi",
      eyebrow: "🏮 달지기 · 오늘의운세",
      line: "한 줄",
      src: "/videos/dalzigi-intro.mp4",
    };
    render(<TodayFreeFlow {...props} intro={intro} />);
    // 인트로 오버레이가 떠 있는 동안엔 시트가 없다.
    const dialog = await screen.findByRole("dialog");
    expect(screen.queryByText("태어난 날을 알려주실래요?")).not.toBeInTheDocument();
    // 영상 완주 → 오버레이 페이드아웃 → 그제서야 시트 등장.
    fireEvent.ended(dialog.querySelector("video")!);
    expect(await screen.findByText("태어난 날을 알려주실래요?")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("영상이 걷힌 뒤에도 마지막 프레임이 배경으로 남고, 입력을 저장하면 배경이 걷힌다", async () => {
    const intro = {
      personaId: "dalzigi",
      eyebrow: "🏮 달지기 · 오늘의운세",
      line: "한 줄",
      src: "/videos/dalzigi-intro.mp4",
    };
    vi.mocked(computeGuestDailyExtras).mockResolvedValue(extras);
    render(<TodayFreeFlow {...props} intro={intro} />);
    const dialog = await screen.findByRole("dialog");
    fireEvent.ended(dialog.querySelector("video")!);
    // 시트가 떠 있는 동안 영상 프레임은 배경으로 남아 있다.
    expect(await screen.findByText("태어난 날을 알려주실래요?")).toBeInTheDocument();
    expect(document.querySelector("video")).not.toBeNull();
    // 생년월일 저장 → 시트 닫힘 → 배경도 걷힌다.
    fireEvent.change(document.querySelector('input[type="date"]')!, {
      target: { value: "1990-06-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "오늘의 기운 보기" }));
    await waitFor(() => expect(document.querySelector("video")).toBeNull());
    expect(await screen.findByText(/달빛이 다듬은 이야기예요/)).toBeInTheDocument();
  });

  it("인트로를 건너뛰어도 입력 시트는 뜬다", async () => {
    const intro = {
      personaId: "dalzigi",
      eyebrow: "🏮 달지기 · 오늘의운세",
      line: "한 줄",
      src: "/videos/dalzigi-intro.mp4",
    };
    render(<TodayFreeFlow {...props} intro={intro} />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "인사 영상 건너뛰기" }));
    expect(await screen.findByText("태어난 날을 알려주실래요?")).toBeInTheDocument();
  });

  it("forceInput이면 저장된 생년월일이 있어도 입력 시트를 띄운다", async () => {
    window.localStorage.setItem(TODAY_BIRTH_KEY, JSON.stringify(birth));
    vi.mocked(computeGuestDailyExtras).mockResolvedValue(extras);
    render(<TodayFreeFlow {...props} forceInput />);
    expect(await screen.findByText("태어난 날을 알려주실래요?")).toBeInTheDocument();
  });

  it("개인화가 준비되는 동안 버퍼링 화면이 뜨고, 끝나면 카드로 바뀐다", async () => {
    window.localStorage.setItem(TODAY_BIRTH_KEY, JSON.stringify(birth));
    let resolve!: (v: typeof extras) => void;
    vi.mocked(computeGuestDailyExtras).mockReturnValue(
      new Promise((r) => { resolve = r; }),
    );
    render(<TodayFreeFlow {...props} />);
    // 기다리는 동안 — 버퍼링 화면, 카드 없음
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/오늘의 기운을 읽고 있어요/)).toBeInTheDocument();
    expect(screen.queryByText("헤드라인")).not.toBeInTheDocument();
    // 완료 — 버퍼링이 걷히고 개인화 카드까지 나타난다
    resolve(extras);
    expect(await screen.findByText("헤드라인")).toBeInTheDocument();
    expect(screen.getByText(/달빛이 다듬은 이야기예요/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("개인화 실패(null)여도 버퍼링이 걷히고 공통 카드로 진행한다", async () => {
    window.localStorage.setItem(TODAY_BIRTH_KEY, JSON.stringify(birth));
    vi.mocked(computeGuestDailyExtras).mockResolvedValue(null);
    render(<TodayFreeFlow {...props} />);
    expect(await screen.findByText("헤드라인")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("저장된 태어난 날이 있으면 일간·띠·AI 이야기까지 블러 없이 전부 보여준다", async () => {
    window.localStorage.setItem(TODAY_BIRTH_KEY, JSON.stringify(birth));
    vi.mocked(computeGuestDailyExtras).mockResolvedValue(extras);
    render(<TodayFreeFlow {...props} />);
    expect(computeGuestDailyExtras).toHaveBeenCalledWith("1990-06-15", "");
    expect(await screen.findByText("오늘은 당신다움이 드러나는 날이에요.")).toBeInTheDocument();
    expect(screen.getByText(/말띠인 당신에게/)).toBeInTheDocument();
    expect(screen.getByText(/달빛이 다듬은 이야기예요/)).toBeInTheDocument();
    // 블러 티저·자물쇠는 더 이상 없다
    expect(screen.queryByText("🔒")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("잠긴 풀이")).not.toBeInTheDocument();
  });

  it("같은 날짜·같은 생일의 저장분이 있으면 서버 호출 없이 재사용한다(LLM 하루 1회·버퍼링 없음)", async () => {
    window.localStorage.setItem(TODAY_BIRTH_KEY, JSON.stringify(birth));
    window.localStorage.setItem(
      "om-today-extras",
      JSON.stringify({ birthDate: birth.birthDate, birthTime: birth.birthTime, extras }),
    );
    render(<TodayFreeFlow {...props} />);
    expect(await screen.findByText(/달빛이 다듬은 이야기예요/)).toBeInTheDocument();
    expect(computeGuestDailyExtras).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("저장분의 날짜가 오늘이 아니면 다시 계산한다", async () => {
    window.localStorage.setItem(TODAY_BIRTH_KEY, JSON.stringify(birth));
    window.localStorage.setItem(
      "om-today-extras",
      JSON.stringify({
        birthDate: birth.birthDate, birthTime: birth.birthTime,
        extras: { ...extras, date: "2000-01-01" },
      }),
    );
    vi.mocked(computeGuestDailyExtras).mockResolvedValue(extras);
    render(<TodayFreeFlow {...props} />);
    expect(await screen.findByText(/달빛이 다듬은 이야기예요/)).toBeInTheDocument();
    expect(computeGuestDailyExtras).toHaveBeenCalledTimes(1);
  });
});
