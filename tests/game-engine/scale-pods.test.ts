import { describe, expect, it } from "vitest";
import { assignPods, snakeDraftOrder } from "@/lib/game-engine/pods";

/**
 * Scale-oriented unit checks: podding math for large even fields stays O(n)
 * and produces the expected pod/draft structure without I/O.
 */
describe("massive-field podding math", () => {
  it("assigns 1008 entrants into pods of 6", () => {
    const ids = Array.from({ length: 1008 }, (_, i) => `u${i}`);
    const pods = assignPods(ids, 6);
    expect(pods).toHaveLength(168);
    expect(pods.every((p) => p.userIds.length === 6)).toBe(true);
  });

  it("builds snake draft slots for a pod", () => {
    const users = ["a", "b", "c", "d", "e", "f"];
    const order = snakeDraftOrder(users, 5);
    expect(order).toHaveLength(30);
    expect(order[0]).toBe("a");
    expect(order[5]).toBe("f");
    expect(order[6]).toBe("f"); // snake reverse
  });
});
