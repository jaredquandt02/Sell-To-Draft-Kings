export default function DraftPage({
  params,
}: {
  params: { leagueId: string };
}) {
  return <div>Draft — league {params.leagueId}</div>;
}
