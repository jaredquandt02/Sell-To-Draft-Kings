import Link from "next/link";
import { POD_ID, WEEK } from "@/lib/mock/league";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/team", label: "My Team" },
  { href: `/pod/${POD_ID}`, label: "Matchup" },
  { href: `/gladiator-pick/${WEEK}`, label: "Gladiator Pick" },
  { href: "/leaderboard", label: "League" },
];

export function NavBar() {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="font-bold">
          Gladiator League
        </Link>
        <nav className="flex gap-4 text-sm text-gray-600">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-black hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          Week {WEEK}
        </span>
      </div>
    </header>
  );
}
