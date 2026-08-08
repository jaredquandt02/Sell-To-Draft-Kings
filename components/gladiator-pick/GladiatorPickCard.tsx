import type { Player } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface GladiatorPickCardProps {
  player: Player;
  alreadyUsed: boolean;
  onPick: (playerId: string) => void;
}

export function GladiatorPickCard({
  player,
  alreadyUsed,
  onPick,
}: GladiatorPickCardProps) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="font-medium">{player.name}</p>
        <p className="text-sm text-gray-500">
          {player.position} — {player.nflTeam}
        </p>
      </div>
      <Button disabled={alreadyUsed} onClick={() => onPick(player.id)}>
        {alreadyUsed ? "Already used" : "Pick as gladiator"}
      </Button>
    </Card>
  );
}
