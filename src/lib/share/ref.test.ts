import { describe, it, expect } from "vitest";
import { parseRef, parseRefCookie, refCookieValue } from "./ref";

describe("parseRef", () => {
  it("ref+via를 파싱한다", () => {
    expect(parseRef("?ref=card&via=profile")).toEqual({ ref: "card", via: "profile" });
  });

  it("via 없이 ref만도 유효하다", () => {
    expect(parseRef("?ref=card")).toEqual({ ref: "card", via: null });
  });

  it("ref가 없으면 null", () => {
    expect(parseRef("?via=profile")).toBeNull();
    expect(parseRef("")).toBeNull();
  });

  it("형식이 어긋난 값은 거른다 (ref는 null, via는 무시)", () => {
    expect(parseRef("?ref=<script>")).toBeNull();
    expect(parseRef("?ref=card&via=a b c")).toEqual({ ref: "card", via: null });
  });
});

describe("refCookieValue ↔ parseRefCookie 왕복", () => {
  it("card:profile 형태로 저장·복원한다", () => {
    const info = { ref: "card", via: "profile" };
    expect(refCookieValue(info)).toBe("card:profile");
    expect(parseRefCookie("card:profile")).toEqual(info);
  });

  it("via 없는 값도 왕복한다", () => {
    expect(refCookieValue({ ref: "card", via: null })).toBe("card");
    expect(parseRefCookie("card")).toEqual({ ref: "card", via: null });
  });

  it("깨진 쿠키값은 null", () => {
    expect(parseRefCookie("")).toBeNull();
    expect(parseRefCookie("bad value:x")).toBeNull();
  });
});
