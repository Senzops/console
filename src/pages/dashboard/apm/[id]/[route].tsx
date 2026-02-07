import ApmView from "@/components/ApmView";
import { useRouter } from "next/router";

export default function ApmRouteDetail() {
  const router = useRouter();
  const { id, route } = router.query;

  if (!id || !route) return null;

  // Pass route to filter data
  return (
    <ApmView
      serviceId={id as string}
      route={decodeURIComponent(route as string)}
    />
  );
}
