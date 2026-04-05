"use client";

import { useSearchParams } from "next/navigation";

import { RoomDemoClient } from "../../components/tabletop/RoomDemoClient";

export function TableRouteClient() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("room") || "demo-room";

  return <RoomDemoClient matchId={matchId} />;
}
