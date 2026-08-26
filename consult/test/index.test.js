import { describe, expect, it, vi } from "vitest";

vi.mock("../src/proof/index.js", () => ({
  default: vi.fn(),
}));
vi.mock("../extensions/self-review-guard.ts", () => ({
  default: vi.fn(),
}));
import agentBoosterPack from "../src/index.ts";
import proofExtension from "../src/proof/index.js";
import selfReviewGuard from "../extensions/self-review-guard.ts";

describe("Consult Pi extension", () => {
  it("registers only the proof and independent-review runtimes by default", () => {
    const pi = {};

    agentBoosterPack(pi);

    expect(proofExtension).toHaveBeenCalledWith(pi);
    expect(selfReviewGuard).toHaveBeenCalledWith(pi);
  });
});
