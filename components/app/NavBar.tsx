import Link from "next/link";
import { getSessionUser, getCreditBalance } from "@/lib/data/contests";
import { isSupabaseConfigured } from "@/lib/config";
import { signOutAction } from "@/lib/actions/contest";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/lobby", label: "Lobby" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/team", label: "My Team" },
  { href: "/matchup", label: "Matchup" },
  { href: "/leaderboard", label: "Standings" },
  { href: "/waivers", label: "Waivers" },
];

export async function NavBar() {
  const user = await getSessionUser();
  const credits = user ? await getCreditBalance(user.id) : null;
  const configured = isSupabaseConfigured();

  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/lobby" className="font-bold">
          Gladiator League
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm text-gray-600">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-black hover:underline"
            >
              {link.label}
            </Link>
          ))}
          {configured ? (
            <Link href="/gladiator-pick/1" className="hover:text-black hover:underline">
              Gladiator
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {credits != null ? (
            <span className="rounded-md bg-gray-100 px-2 py-1 font-medium">
              {credits.toLocaleString()} credits
            </span>
          ) : null}
          {user ? (
            <form action={signOutAction}>
              <Button type="submit" className="!px-2 !py-1 text-xs">
                Sign out
              </Button>
            </form>
          ) : (
            <Link href="/login" className="underline">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
