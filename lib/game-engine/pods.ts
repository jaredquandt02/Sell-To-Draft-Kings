/**
 * Pod assignment and snake draft order. Pure functions — no I/O.
 */

export interface PodAssignment {
  podNumber: number;
  userIds: string[];
}

/**
 * Splits entrants into pods of `podSize`, in the order given (callers
 * decide randomization/seeding upstream). Throws if the entrant count
 * doesn't divide evenly, since an uneven pod changes the elimination math.
 */
export function assignPods(userIds: string[], podSize: number): PodAssignment[] {
  if (podSize <= 0) {
    throw new Error("podSize must be positive");
  }
  if (userIds.length % podSize !== 0) {
    throw new Error(
      `${userIds.length} entrants does not divide evenly into pods of ${podSize}`,
    );
  }

  const pods: PodAssignment[] = [];
  for (let i = 0; i < userIds.length; i += podSize) {
    pods.push({
      podNumber: pods.length + 1,
      userIds: userIds.slice(i, i + podSize),
    });
  }
  return pods;
}

/**
 * Snake draft order for a pod across `rounds` rounds: 1..n, n..1, 1..n, ...
 */
export function snakeDraftOrder(userIds: string[], rounds: number): string[] {
  const order: string[] = [];
  for (let round = 0; round < rounds; round++) {
    const roundOrder = round % 2 === 0 ? userIds : [...userIds].reverse();
    order.push(...roundOrder);
  }
  return order;
}
