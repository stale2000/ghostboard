import { RoomDemoClient } from "../../../components/tabletop/RoomDemoClient";

type TablePageProps = {
  params: Promise<{
    matchId: string;
  }>;
};

export function generateStaticParams() {
  return [{ matchId: "demo-room" }];
}

export const dynamicParams = false;

export default async function TablePage({ params }: TablePageProps) {
  const { matchId } = await params;

  return <RoomDemoClient matchId={matchId} />;
}
