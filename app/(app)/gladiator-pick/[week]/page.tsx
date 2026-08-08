export default function GladiatorPickPage({
  params,
}: {
  params: { week: string };
}) {
  return <div>Gladiator pick — week {params.week}</div>;
}
