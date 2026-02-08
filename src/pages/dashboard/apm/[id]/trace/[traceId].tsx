import { useRouter } from "next/router";
import useSWR from "swr";
import { api, useAuth } from "../../../../../lib/auth";
import { DashboardLayout } from "../../../../../components/Layout";
import {
  Button,
  Spinner,
  Card,
  Badge,
  CardContent,
} from "../../../../../components/Core";
import {
  ArrowLeft,
  Clock,
  Globe,
  Laptop,
  Server,
  Activity,
  Layers,
  Hash,
} from "lucide-react";
import { TraceWaterfall } from "../../../../../components/TraceWaterfall";
import { formatDistanceToNow } from "date-fns";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const getMethodColor = (method: string) => {
  switch (method?.toUpperCase()) {
    case "GET":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "POST":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "PUT":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "DELETE":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-secondary text-muted-foreground";
  }
};

const StatCard = ({ label, value, sub, icon: Icon, color }: any) => (
  <Card className="hover:border-foreground/20 transition-colors">
    <CardContent className="p-5 flex items-start gap-4">
      <div
        className={`p-2.5 rounded-lg ${color} bg-opacity-10 text-opacity-100`}
      >
        <Icon className={`w-5 h-5 ${color.replace("bg-", "text-")}`} />
      </div>
      <div>
        <div className="text-xs font-bold text-muted-foreground uppercase mb-1">
          {label}
        </div>
        <div className="text-xl font-bold text-foreground">{value}</div>
        {sub && (
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default function TraceDetail() {
  const router = useRouter();
  const { id, traceId } = router.query;
  const { token } = useAuth();

  const { data: trace, error } = useSWR(
    token && id && traceId ? `/apm/${id}/trace/${traceId}` : null,
    fetcher,
  );

  if (!trace && !error)
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Connecting to APM service...</p>
        </div>
      </DashboardLayout>
    );
  if (error || !trace)
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <div className="p-8 text-destructive">
            Failed to load APM service.
          </div>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col">
        {/* --- Header --- */}
        <div className="shrink-0 space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="pl-0 w-fit hover:bg-transparent hover:text-orange-500 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invocations
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-border">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`font-mono text-sm px-2.5 py-1 border-0 ${getMethodColor(trace.method)}`}
                >
                  {trace.method}
                </Badge>
                <h1
                  className="text-2xl font-bold font-mono text-foreground truncate max-w-[60vw]"
                  title={trace.path}
                >
                  {trace.path}
                </h1>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />{" "}
                  {new Date(trace.timestamp).toLocaleString()}
                </span>
                <span className="text-border">|</span>
                <span>
                  {formatDistanceToNow(new Date(trace.timestamp))} ago
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={trace.status >= 400 ? "destructive" : "secondary"}
                className="text-sm px-3 py-1 h-8"
              >
                HTTP {trace.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* --- Metrics Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <StatCard
            label="Duration"
            value={`${trace.duration.toFixed(2)}ms`}
            sub="Server Time"
            icon={Clock}
            color="bg-blue-500"
          />
          <StatCard
            label="Spans"
            value={trace.spans?.length || 0}
            sub="Internal Ops"
            icon={Layers}
            color="bg-purple-500"
          />
          <StatCard
            label="Client"
            value={trace.browser || "Script"}
            sub={trace.os}
            icon={Laptop}
            color="bg-orange-500"
          />
          <StatCard
            label="Location"
            value={trace.country}
            sub={trace.ip}
            icon={Globe}
            color="bg-emerald-500"
          />
        </div>

        {/* --- Waterfall --- */}
        <div className="flex-1 min-h-0 relative">
          <TraceWaterfall
            spans={trace.spans || []}
            totalDuration={trace.duration}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
