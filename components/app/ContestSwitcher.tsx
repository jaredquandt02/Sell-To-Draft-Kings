import Link from "next/link";

export function ContestSwitcher({
  contests,
  currentId,
  basePath,
}: {
  contests: Array<{ id: string; name: string; gameMode: string }>;
  currentId: string;
  basePath: string;
}) {
  if (contests.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {contests.map((c) => {
        const href = `${basePath}?contestId=${c.id}`;
        const active = c.id === currentId;
        return (
          <Link
            key={c.id}
            href={href}
            className={`rounded-full px-3 py-1 ${
              active
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {c.gameMode === "gladiator" ? "Gladiator" : "Classic"}: {c.name.replace("Test ", "")}
          </Link>
        );
      })}
    </div>
  );
}
