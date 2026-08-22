import Link from "next/link";
import { Container } from "@/components/ui/Container";

const FOOTER_LINKS = [
  { href: "#season", label: "How it works" },
  { href: "/login", label: "Log in" },
];

export function SiteFooter() {
  return (
    <footer className="py-12">
      <Container>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="text-base font-extrabold uppercase tracking-tightest"
          >
            Gladiator<span className="text-accent-strong">League</span>
          </Link>

          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-edge pt-6">
          <p className="max-w-2xl text-xs leading-relaxed text-ink-faint">
            Gladiator League is a free-to-play fantasy football game. All
            contests are played with virtual credits that carry no cash value
            and cannot be withdrawn or exchanged. No real-money wagering is
            offered.
          </p>
          <p className="mt-4 text-xs text-ink-faint">
            &copy; {new Date().getFullYear()} Gladiator League
          </p>
        </div>
      </Container>
    </footer>
  );
}
