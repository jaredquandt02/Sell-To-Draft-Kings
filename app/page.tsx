import { SiteHeader } from "@/components/site/SiteHeader";
import { Hero } from "@/components/site/Hero";
import { SeasonTimeline } from "@/components/site/SeasonTimeline";
import { JoinContestCta } from "@/components/site/JoinContestCta";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PayoutRail } from "@/components/site/PayoutRail";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      {/* Inset matches the fixed rail's width so content never runs under it. */}
      <div className="lg:pr-[15%]">
        <main>
          <Hero />
          <SeasonTimeline />
          <JoinContestCta />
        </main>
        <SiteFooter />
      </div>
      <PayoutRail />
    </>
  );
}
