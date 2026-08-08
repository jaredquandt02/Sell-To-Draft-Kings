import Link from "next/link";
import { LEAGUE_ID, POD_ID, WEEK } from "@/lib/mock/league";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: `/draft/${LEAGUE_ID}`, label: "Draft" },
  { href: `/pod/${POD_ID}`, label: "My Pod" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: `/gladiator-pick/${WEEK}`, label: "Gladiator Pick" },
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
      </div>
    </header>
  );
}
