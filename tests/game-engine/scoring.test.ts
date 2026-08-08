import { describe, expect, it } from "vitest";
import {
  applyGladiatorMultiplier,
  scoreStatLine,
} from "@/lib/game-engine/scoring";

describe("scoreStatLine", () => {
  it("scores a standard PPR stat line", () => {
    const points = scoreStatLine({
      passYards: 300,
      passTouchdowns: 2,
      interceptions: 1,
      rushYards: 20,
      receptions: 4,
      receivingYards: 40,
    });
    // 300/25 + 2*4 + 1*-2 + 20/10 + 4*1 + 40/10 = 12 + 8 - 2 + 2 + 4 + 4 = 28
    expect(points).toBe(28);
  });

  it("defaults missing stats to zero", () => {
    expect(scoreStatLine({})).toBe(0);
  });
});

describe("applyGladiatorMultiplier", () => {
  it("multiplies the base score", () => {
    expect(applyGladiatorMultiplier(10, 1.5)).toBe(15);
  });
});
