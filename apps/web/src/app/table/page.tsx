import { Suspense } from "react";

import { TableRouteClient } from "./TableRouteClient";

export default function TablePage() {
  return (
    <Suspense fallback={null}>
      <TableRouteClient />
    </Suspense>
  );
}
