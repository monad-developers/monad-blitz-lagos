import { describe, expect, it } from "vitest";

import { pageContainerClass } from "@/lib/layout";

describe("layout helpers", () => {
  it("keeps the shared page container width tokens", () => {
    expect(pageContainerClass).toBe("mx-auto w-[92%] sm:w-[88%] lg:w-[80%]");
  });
});