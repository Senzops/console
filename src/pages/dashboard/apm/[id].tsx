import ApmView from "@/components/ApmView";
import { useRouter } from "next/router";

export default function ApmDashboard() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) return null;

  return <ApmView serviceId={id as string} />;
}
