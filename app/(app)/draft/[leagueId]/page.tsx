import { DraftBoardDemo } from "@/components/draft/DraftBoardDemo";
import { availablePlayers, displayName, yourPod, yourPodDraftOrder } from "@/lib/mock/league";

export default function DraftPage({ params }: { params: { leagueId: string } }) {
  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Draft — {params.leagueId}</h1>
        <p className="text-sm text-gray-500">Pod {yourPod.podNumber}, snake order</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {yourPodDraftOrder.map((userId, i) => (
          <span key={i} className="rounded-full border border-gray-200 px-2 py-1">
            {i + 1}. {displayName(userId)}
          </span>
        ))}
      </div>

      <DraftBoardDemo initialAvailable={availablePlayers} />
    </div>
  );
}
