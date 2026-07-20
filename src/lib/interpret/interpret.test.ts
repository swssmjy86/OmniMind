import { describe, expect, it } from "vitest";
import { computeProfile } from "@/lib/engine";
import { respond } from "./interpret";
import { TemplateProvider, detectMood } from "./template-provider";
import { checkTone } from "./tone-guard";
import type { ChatInput, InterpretProvider } from "./provider";

const profile = computeProfile({
  birthDate: "1995-08-20", birthTime: "14:30", timeUnknown: false,
});
const base = (message: string): ChatInput => ({ profile, nickname: "다인", history: [], message });

describe("detectMood", () => {
  it.each([
    ["요즘 너무 지치고 힘들어요", "위로"],
    ["이직을 해야 할지 고민이에요", "고민"],
    ["친구랑 싸워서 서운해요", "관계"],
    ["시험에 합격했어요!", "기쁨"],
    ["안녕하세요", "일상"],
  ])("%s → %s", (msg, mood) => {
    expect(detectMood(msg)).toBe(mood);
  });
});

describe("TemplateProvider", () => {
  it("모든 무드에서 응답이 비지 않고 톤 통과", async () => {
    const tp = new TemplateProvider();
    for (const msg of ["너무 힘들어요", "고민이 있어요", "친구랑 싸웠어요", "합격했어요", "오늘 뭐 하지"]) {
      const out = await tp.chat(base(msg));
      expect(out.trim().length).toBeGreaterThan(0);
      expect(out).toContain("다인");
      expect(checkTone(out)).toHaveLength(0);
    }
  });

  it("이중 주어 비문이 없다 — '님에게는 당신…' 회귀 방지", async () => {
    const tp = new TemplateProvider();
    for (const msg of ["너무 힘들어요", "고민이 있어요", "친구랑 싸웠어요", "합격했어요"]) {
      const out = await tp.chat(base(msg));
      expect(out).not.toMatch(/님에게는 당신/);
      expect(out).toMatch(/힘이 있어요/); // 명사구 조립이 문법에 맞게 끼워짐
    }
  });
});

describe("respond — 3단 폴백", () => {
  it("LLM이 던지면 템플릿으로 무중단 대체", async () => {
    const failing: InterpretProvider = { chat: async () => { throw new Error("quota"); } };
    const r = await respond(base("힘들어요"), { llm: failing });
    expect(r.source).toBe("template");
    expect(r.text.length).toBeGreaterThan(0);
  });

  it("LLM 톤 위반 응답은 폐기하고 템플릿으로", async () => {
    const rude: InterpretProvider = { chat: async () => "당신은 실패할 사람입니다. 조심하세요." };
    const r = await respond(base("고민이에요"), { llm: rude });
    expect(r.source).toBe("template");
    expect(checkTone(r.text)).toHaveLength(0);
  });

  it("LLM이 톤 통과 응답을 주면 그대로 사용", async () => {
    const good: InterpretProvider = { chat: async () => "그런 마음이 들 수 있어요. 오늘은 천천히 쉬어가도 좋아요." };
    const r = await respond(base("힘들어요"), { llm: good });
    expect(r.source).toBe("llm");
  });

  it("키 없는 기본 OpenRouter는 템플릿으로 폴백(예외 없음)", async () => {
    const r = await respond(base("안녕"));
    expect(r.source).toBe("template");
    expect(r.text).toContain("다인");
  });
});
