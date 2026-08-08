import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-4xl font-bold">Gladiator League</h1>
      <p className="text-lg text-gray-600">
        Public fantasy football contests. Draft, set your lineup, and climb the
        standings — then survive Gladiator elimination when the mode flips on.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/lobby"
          className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
        >
          Enter lobby
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
