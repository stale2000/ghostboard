import { RoomDemoClient } from "../../../components/tabletop/RoomDemoClient";

type TablePageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export default async function TablePage({ params }: TablePageProps) {
  const { matchId } = await params;

  return <RoomDemoClient matchId={matchId} />;
}
