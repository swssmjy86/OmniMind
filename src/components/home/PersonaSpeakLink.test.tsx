import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PersonaSpeakLink from "./PersonaSpeakLink";
import { speakPersonaLine } from "@/lib/persona/speak";

vi.mock("@/lib/persona/speak", () => ({ speakPersonaLine: vi.fn() }));

describe("PersonaSpeakLink", () => {
  it("누르면 페르소나 멘트를 소리로 읽고 링크로 이동한다", () => {
    render(
      <PersonaSpeakLink href="/saju/wealth" personaId="geumo" line="재물의 물길, 훤히 보이오." className="cta">
        풀이 보러 가기
      </PersonaSpeakLink>,
    );
    const link = screen.getByRole("link", { name: "풀이 보러 가기" });
    expect(link).toHaveAttribute("href", "/saju/wealth");
    fireEvent.click(link);
    expect(vi.mocked(speakPersonaLine)).toHaveBeenCalledWith("geumo", "재물의 물길, 훤히 보이오.");
  });
});
