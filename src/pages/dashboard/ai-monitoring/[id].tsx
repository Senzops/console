import { useRouter } from "next/router";
import AiMonitoringView, { AiFilter } from "@/components/AiMonitoringView";

export default function AiSourceDashboard() {
  const router = useRouter();
  const { id, model, provider, operation } = router.query;

  if (!id) return null;

  // A single dimension drill-down (model / provider / operation) scopes the view,
  // mirroring the APM per-route page.
  let filter: AiFilter | undefined;
  if (typeof model === "string") filter = { dimension: "model", value: model };
  else if (typeof provider === "string") filter = { dimension: "provider", value: provider };
  else if (typeof operation === "string") filter = { dimension: "operation", value: operation };

  return <AiMonitoringView sourceId={id as string} filter={filter} />;
}
