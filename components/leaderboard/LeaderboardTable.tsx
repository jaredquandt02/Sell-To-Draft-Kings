interface LeaderboardRow {
  userId: string;
  displayName: string;
  cumulativePoints: number;
}

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th className="py-2">#</th>
          <th className="py-2">Player</th>
          <th className="py-2">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.userId} className="border-t border-gray-200">
            <td className="py-2">{i + 1}</td>
            <td className="py-2">{row.displayName}</td>
            <td className="py-2">{row.cumulativePoints.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
