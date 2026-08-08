import { TeamDemo } from "@/components/team/TeamDemo";

export default function TeamPage() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">My Team</h1>
        <p className="text-sm text-gray-500">Manage your starters, bench, and Medic Card.</p>
      </div>
      <TeamDemo />
    </div>
  );
}
