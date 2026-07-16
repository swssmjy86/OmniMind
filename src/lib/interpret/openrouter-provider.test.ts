import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeProfile } from "@/lib/engine";
import { OpenRouterProvider } from "./openrouter-provider";
import type { ChatInput } from "./provider";

const ctx = computeProfile({
  birthDate: "1995-08-15",
  birthTime: "10:30",
  timeUnknown: false,
  bloodType: "O",
  mbti: "ENFJ",
});

const input: ChatInput = {
  profile: ctx,
  nickname: "달빛",
  history: [{ role: "user", content: "안녕" }, { role: "assistant", content: "안녕하세요" }],
  message: "오늘 좀 힘들어요",
};

describe("OpenRouterProvider", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("키가 없으면 던진다(상위 폴백 체인이 템플릿으로 대체)", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await expect(new OpenRouterProvider().chat(input)).rejects.toThrow("openrouter:no-key");
  });

  it("기본 모델·엔드포인트·인증 헤더로 요청을 보낸다", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: "괜찮아질 거예요." } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await new OpenRouterProvider().chat(input);
    expect(text).toBe("괜찮아질 거예요.");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("deepseek/deepseek-chat-v3.1:free");
    expect(body.messages[0]).toEqual({ role: "system", content: expect.stringContaining("달빛") });
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "오늘 좀 힘들어요" });
    // 이전 대화 이력이 순서대로 이어 붙는다.
    expect(body.messages[1]).toEqual({ role: "user", content: "안녕" });
    expect(body.messages[2]).toEqual({ role: "assistant", content: "안녕하세요" });
  });

  it("OPENROUTER_MODEL 환경변수로 모델을 바꿀 수 있다", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_MODEL", "qwen/qwen-2.5-72b-instruct:free");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: "네, 괜찮아요." } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await new OpenRouterProvider().chat(input);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("qwen/qwen-2.5-72b-instruct:free");
  });

  it("HTTP 오류면 던진다", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(new OpenRouterProvider().chat(input)).rejects.toThrow("openrouter:http-429");
  });

  it("응답이 비어 있으면 던진다", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: "  " } }] }) }),
    );
    await expect(new OpenRouterProvider().chat(input)).rejects.toThrow("openrouter:empty");
  });
});
