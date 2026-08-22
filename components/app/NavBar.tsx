import { Suspense } from "react";
import { AppNav } from "@/components/app/AppNav";

export function NavBar() {
  return (
    <Suspense
      fallback={
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <span className="font-bold">Gladiator League</span>
          </div>
        </header>
      }
    >
      <AppNav />
    </Suspense>
  );
}
