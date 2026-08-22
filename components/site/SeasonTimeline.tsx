"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";

type Step = {
  label: string;
  pool: string;
  survivors?: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    label: "Draft",
    pool: "Pre-season",
    title: "Build a 16-man roster",
    body: "You are dropped into a pool of 12 at random, then snake draft 16 rounds against them. The roster is locked from there — no trades, no waivers, no adds all season. Because each pool drafts on its own board, nobody in your pool can own the same player you do.",
  },
  {
    label: "Week 1",
    pool: "Pool 1",
    survivors: "12 → 6",
    title: "Send out your first gladiator",
    body: "Matchups post Tuesday. You name one roster player as your gladiator and one as your medic, who is only burned if you actually need him. Each pick locks at its own game's kickoff, and neither manager sees the other's choice until both are in. Higher PPR score advances, the other manager is done.",
  },
  {
    label: "Week 2",
    pool: "Pool 1",
    survivors: "6 → 3",
    title: "Half the pool is already gone",
    body: "Same format, one fewer weapon: the gladiator you used in Week 1 can never be used again, in this pool or any that follow. Three of the original twelve walk out of Pool 1, so a quarter of the field is still alive.",
  },
  {
    label: "Week 3",
    pool: "Pool 2",
    survivors: "12 → 6",
    title: "Re-seeded against strangers",
    body: "Survivors are ranked by cumulative points and dealt into fresh pools of 12 in seed order, so you no longer face the people you already beat. New wrinkle: opponents can now own the same players you do, and any shared player is locked for both of you that week.",
  },
  {
    label: "Week 4",
    pool: "Pool 2",
    survivors: "6 → 3",
    title: "Depth starts to bite",
    body: "Four weeks in, four gladiators are spent and twelve remain on your roster. Injuries and byes have thinned that further. Clear Pool 2 and you are down to the last 6.25% of everyone who entered.",
  },
  {
    label: "Week 5",
    pool: "Pool 3",
    survivors: "12 → 6",
    title: "Re-seeded again, and byes appear",
    body: "Another re-seed by cumulative points. If the survivor count does not divide evenly into pools of 12, the top-ranked managers take a full bye through the pool — they advance without playing and without burning a single roster spot, which is a real edge heading into the Finals.",
  },
  {
    label: "Week 6",
    pool: "Pool 3",
    survivors: "6 → 3",
    title: "The last cut before the Finals",
    body: "The final 1v1 of the season. Win it and you have outlasted roughly 98% of the field to claim one of the Finals spots, with whatever is left of your roster as your entire arsenal.",
  },
  {
    label: "Week 7",
    pool: "Finals",
    survivors: "Top 50% advance",
    title: "Head-to-head ends",
    body: "Every Pool 3 survivor merges onto one global leaderboard and the 1v1 format is retired. Now you start three unused players a week and their combined score feeds a cumulative total. When the week closes, the bottom half of the leaderboard is cut at once.",
  },
  {
    label: "Week 8",
    pool: "Finals",
    survivors: "Champion crowned",
    title: "Whatever is left, you play",
    body: "Three last starters from a roster you have been spending for two months. Cumulative points across both Finals weeks set the final order, so the manager who managed their depth best — not just the one who won the most fights — takes the top spot.",
  },
];

/**
 * Season walkthrough as a vertical timeline.
 *
 * Client component because both effects need live measurement: the rail fill
 * tracks scroll position, and rows reveal on entering the viewport.
 */
export function SeasonTimeline() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  // Rows render visible on the server and stay visible without JS; the hidden
  // starting state is only introduced once we know the effects will run.
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      setProgress(1);
      return;
    }

    setAnimate(true);

    let frame = 0;
    const measure = () => {
      frame = 0;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const travelled = window.innerHeight / 2 - rect.top;
      setProgress(Math.min(Math.max(travelled / rect.height, 0), 1));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        const hits = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => Number((entry.target as HTMLElement).dataset.index));
        if (hits.length === 0) return;
        setRevealed((prev) => new Set([...prev, ...hits]));
      },
      // Trailing negative margin holds the trigger line at the lower-middle of
      // the viewport, so a row animates as you arrive at it rather than when
      // its first pixel appears.
      { rootMargin: "0px 0px -35% 0px" },
    );
    rowRefs.current.forEach((row) => row && observer.observe(row));

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <section id="season" className="border-b border-edge py-20">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
          How a season runs
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tightest sm:text-4xl">
          Eight weeks, four pools, one survivor
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">
          Every week is a knockout. Win and you move on with one fewer player to
          call on; lose once and your season is over.
        </p>

        <div ref={wrapRef} className="relative mt-14">
          {/* Track spans the full list; the fill above it follows scroll. */}
          <div
            aria-hidden
            className="absolute bottom-0 top-0 hidden w-px bg-edge sm:left-[5.25rem] sm:block"
          >
            <div
              className="w-px bg-accent"
              style={{ height: `${progress * 100}%` }}
            />
          </div>

          <ol>
            {STEPS.map((step, index) => {
              const isRevealed = !animate || revealed.has(index);
              const shift = isRevealed
                ? "translate-y-0 opacity-100"
                : "translate-y-3 opacity-0";
              // A tall viewport puts several rows past the trigger line in the
              // same frame. Offsetting neighbours keeps them cascading instead
              // of popping in together; a row revealed on its own is delayed
              // imperceptibly.
              const stagger = { transitionDelay: `${(index % 3) * 90}ms` };

              return (
                <li
                  key={step.label}
                  data-index={index}
                  ref={(node) => {
                    rowRefs.current[index] = node;
                  }}
                  className="grid pb-12 last:pb-0 sm:grid-cols-[4.5rem_1.5rem_1fr]"
                >
                  <div
                    style={stagger}
                    className={`transition-all duration-500 ${shift}`}
                  >
                    <p className="text-sm font-bold tracking-tight">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-ink-faint">
                      {step.pool}
                    </p>
                  </div>

                  <div
                    aria-hidden
                    className="hidden justify-center pt-1.5 sm:flex"
                  >
                    <span
                      style={stagger}
                      className={`h-3 w-3 rounded-full border-2 transition-colors duration-500 ${
                        isRevealed
                          ? "border-accent bg-accent"
                          : "border-edge-strong bg-canvas"
                      }`}
                    />
                  </div>

                  <div
                    style={stagger}
                    className={`mt-3 transition-all duration-500 sm:mt-0 sm:pl-6 ${shift}`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-lg font-bold tracking-tight">
                        {step.title}
                      </h3>
                      {step.survivors ? (
                        <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold text-accent-strong">
                          {step.survivors}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}
