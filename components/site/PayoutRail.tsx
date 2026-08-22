/**
 * Projected payouts for the top 10 finishers.
 *
 * Placeholder curve — pricing, rake, and the Finals prize structure are still
 * being worked out. Replace these amounts and nothing else needs to change.
 */
const PAYOUTS = [
  { rank: 1, amount: 25000 },
  { rank: 2, amount: 10000 },
  { rank: 3, amount: 6000 },
  { rank: 4, amount: 4000 },
  { rank: 5, amount: 3000 },
  { rank: 6, amount: 2250 },
  { rank: 7, amount: 1750 },
  { rank: 8, amount: 1400 },
  { rank: 9, amount: 1150 },
  { rank: 10, amount: 1000 },
];

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

/**
 * Fixed right-edge column, pinned below the header for the full viewport
 * height. Rows share the leftover space via flex-1 rather than taking fixed
 * heights, so the list compresses to fit a short window instead of scrolling.
 */
export function PayoutRail() {
  const total = PAYOUTS.reduce((sum, p) => sum + p.amount, 0);

  return (
    <aside
      aria-label="Projected payouts"
      className="fixed right-0 top-16 hidden h-[calc(100vh-4rem)] w-[15%] flex-col overflow-hidden border-l border-edge bg-surface lg:flex"
    >
      <div className="shrink-0 border-b border-edge px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
          Payouts
        </p>
        <p className="mt-0.5 text-lg font-bold leading-tight tracking-tight">
          {dollars.format(total)}
        </p>
        <p className="text-[11px] leading-tight text-ink-faint">
          Projected · top 10
        </p>
      </div>

      <ol className="flex min-h-0 flex-1 flex-col">
        {PAYOUTS.map((payout) => (
          <li
            key={payout.rank}
            className="flex min-h-0 flex-1 items-center justify-between gap-2 border-b border-edge/60 px-4 last:border-b-0"
          >
            <span
              className={
                payout.rank === 1
                  ? "text-xs font-bold text-accent-strong"
                  : "text-xs font-semibold text-ink-faint"
              }
            >
              {ordinal(payout.rank)}
            </span>
            <span
              className={
                payout.rank === 1
                  ? "text-sm font-bold tabular-nums text-accent-strong"
                  : "text-sm font-semibold tabular-nums text-ink"
              }
            >
              {dollars.format(payout.amount)}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
