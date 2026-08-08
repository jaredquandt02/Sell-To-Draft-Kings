import { NavBar } from "@/components/app/NavBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-4xl px-6 py-3">
        <p className="rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800">
          Demo data — nothing here is wired to Supabase yet.
        </p>
      </div>
      <main className="mx-auto max-w-4xl px-6 pb-16">{children}</main>
    </div>
  );
}
