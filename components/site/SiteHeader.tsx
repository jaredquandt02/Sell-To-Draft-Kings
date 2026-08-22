import Link from "next/link";
import { GladiatorMark } from "@/components/site/GladiatorMark";
import { MenuButton } from "@/components/site/MenuButton";
import { ProfileButton } from "@/components/site/ProfileButton";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-canvas/90 backdrop-blur">
      {/* Equal-weight flanks keep the centered lockup optically centered even
          as the left and right zones grow. */}
      <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
        <div className="flex justify-start">
          <MenuButton />
        </div>

        <Link href="/" aria-label="Gladiator home" className="justify-self-center">
          <GladiatorMark />
        </Link>

        <div className="flex justify-end">
          <ProfileButton />
        </div>
      </div>
    </header>
  );
}
