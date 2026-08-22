import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STATS = [
  { value: "12", label: "Managers per pool" },
  { value: "16", label: "Players drafted" },
  { value: "8", label: "Weeks to survive" },
  { value: "$0", label: "Virtual credits only" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-edge">
      {/* Radial wash behind the headline for depth without an image asset. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
      />

      <Container className="relative py-20 sm:py-28">
        <div className="max-w-3xl">
          <Badge tone="accent">Season-long survival fantasy</Badge>

          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tightest sm:text-6xl">
            Draft. Survive.
            <br />
            <span className="text-accent-strong">Outlast everyone.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Draft a 16-player roster, then send one gladiator into battle each
            week. Win and you advance a man lighter. Lose once and your season
            is over.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/signup" size="lg">
              Play free with credits
            </ButtonLink>
            <ButtonLink href="#season" variant="secondary" size="lg">
              See how it works
            </ButtonLink>
          </div>
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-canvas px-5 py-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                {stat.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
