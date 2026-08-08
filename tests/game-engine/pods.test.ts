import { describe, expect, it } from "vitest";
import { assignPods, snakeDraftOrder } from "@/lib/game-engine/pods";

describe("assignPods", () => {
  it("splits entrants into equal-sized pods in order", () => {
    const pods = assignPods(["a", "b", "c", "d", "e", "f"], 3);
    expect(pods).toEqual([
      { podNumber: 1, userIds: ["a", "b", "c"] },
      { podNumber: 2, userIds: ["d", "e", "f"] },
    ]);
  });

  it("throws when entrants don't divide evenly", () => {
    expect(() => assignPods(["a", "b", "c"], 2)).toThrow();
  });

  it("throws for a non-positive pod size", () => {
    expect(() => assignPods(["a"], 0)).toThrow();
  });
});

describe("snakeDraftOrder", () => {
  it("reverses order every other round", () => {
    expect(snakeDraftOrder(["a", "b", "c"], 3)).toEqual([
      "a", "b", "c",
      "c", "b", "a",
      "a", "b", "c",
    ]);
  });
});
