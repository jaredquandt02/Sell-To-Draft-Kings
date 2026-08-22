import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

/** Closing call to action. Points at signup until a lobby route exists. */
export function JoinContestCta() {
  return (
    <section className="border-b border-edge py-20">
      <Container>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tightest sm:text-4xl">
            Eight weeks. One survivor.
          </h2>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-ink-muted">
            Fields open all week and drafts run as they fill. Grab your starter
            credits and take a seat.
          </p>
          <div className="mt-8">
            <ButtonLink href="/signup" size="lg">
              Join Contest
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
