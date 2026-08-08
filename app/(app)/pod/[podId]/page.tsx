export default function PodPage({ params }: { params: { podId: string } }) {
  return <div>Pod {params.podId}</div>;
}
