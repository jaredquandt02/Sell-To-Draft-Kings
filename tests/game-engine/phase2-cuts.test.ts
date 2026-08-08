import { describe, expect, it } from "vitest";
import { median, usersCutByMedian } from "@/lib/game-engine/phase2-cuts";

describe("median", () => {
  it("averages the two middle values for even-length input", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns the middle value for odd-length input", () => {
    expect(median([1, 2, 3])).toBe(2);
  });
});

describe("usersCutByMedian", () => {
  it("cuts only users strictly below the median", () => {
    const standings = [
      { userId: "a", cumulativePoints: 10 },
      { userId: "b", cumulativePoints: 20 },
      { userId: "c", cumulativePoints: 20 },
      { userId: "d", cumulativePoints: 30 },
    ];
    expect(usersCutByMedian(standings)).toEqual(["a"]);
  });
});
