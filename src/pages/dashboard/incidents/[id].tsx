import React, { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { api, useAuth } from "../../../lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Spinner,
  Dialog,
  DataError,
  Select,
  cn,
} from "../../../components/Core";
import {
  ArrowLeft,
  AlertOctagon,
  Activity,
  Box,
  MonitorSmartphone,
  Terminal,
  Workflow,
  Server,
  Database,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Bell,
  BellOff,
  ArrowUpRight,
  Shield,
  Code2,
  ExternalLink,
  Maximize,
  X,
  Bug,
  Cpu,
  Globe,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bgColor: string; borderColor: string; label: string }
> = {
  critical: {
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    label: "CRITICAL",
  },
  high: {
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    label: "HIGH",
  },
  medium: {
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    label: "MEDIUM",
  },
  low: {
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    label: "LOW",
  },
  info: {
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20",
    label: "INFO",
  },
};

const getTargetIcon = (target: string) => {
  switch (target) {
    case "apm":
      return <Box className="h-4 w-4 text-orange-500" />;
    case "rum":
      return <MonitorSmartphone className="h-4 w-4 text-pink-500" />;
    case "logs":
      return <Terminal className="h-4 w-4 text-blue-500" />;
    case "task":
      return <Workflow className="h-4 w-4 text-indigo-500" />;
    case "vps":
      return <Server className="h-4 w-4 text-emerald-500" />;
    case "database":
      return <Database className="h-4 w-4 text-blue-400" />;
    case "errors":
      return <Bug className="h-4 w-4 text-red-500" />;
    case "runtime":
      return <Cpu className="h-4 w-4 text-violet-500" />;
    case "web":
      return <Globe className="h-4 w-4 text-cyan-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const formatIncidentNumber = (num: number) =>
  `INC-${String(num).padStart(4, "0")}`;

const getTimelineIcon = (type: string) => {
  switch (type) {
    case "fired":
      return <AlertOctagon className="h-3.5 w-3.5 text-destructive" />;
    case "acknowledged":
      return <Shield className="h-3.5 w-3.5 text-amber-500" />;
    case "resolved":
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    case "severity_changed":
      return <ArrowUpRight className="h-3.5 w-3.5 text-orange-500" />;
    case "assigned":
      return <Activity className="h-3.5 w-3.5 text-blue-500" />;
    case "note":
      return <MessageSquare className="h-3.5 w-3.5 text-primary" />;
    case "notification_sent":
      return <Bell className="h-3.5 w-3.5 text-emerald-500" />;
    case "notification_failed":
      return <BellOff className="h-3.5 w-3.5 text-destructive" />;
    case "escalated":
      return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const getTimelineDotBg = (type: string) => {
  switch (type) {
    case "note":
      return "bg-primary/10";
    case "fired":
      return "bg-destructive/10";
    case "resolved":
      return "bg-emerald-500/10";
    case "acknowledged":
      return "bg-amber-500/10";
    case "notification_sent":
      return "bg-emerald-500/10";
    case "notification_failed":
      return "bg-destructive/10";
    case "severity_changed":
      return "bg-orange-500/10";
    case "assigned":
      return "bg-blue-500/10";
    default:
      return "bg-muted/50";
  }
};

const formatDuration = (start: string, end?: string) => {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

// --- Timeline Event Row ---
const TimelineEvent = ({ event }: { event: any }) => (
  <div className="flex gap-3 px-5 py-3.5 hover:bg-muted/10 transition-colors">
    <div
      className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        getTimelineDotBg(event.type),
      )}
    >
      {getTimelineIcon(event.type)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="text-[9px] uppercase tracking-wider font-bold"
        >
          {event.type.replace(/_/g, " ")}
        </Badge>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
          {format(new Date(event.timestamp), "MMM d, HH:mm:ss")}
        </span>
      </div>
      <p
        className={cn(
          "text-sm mt-1.5 break-words",
          event.type === "note"
            ? "text-foreground bg-muted/30 p-3 rounded-lg border border-border/40"
            : "text-muted-foreground",
        )}
      >
        {event.message}
      </p>
    </div>
  </div>
);

export default function IncidentDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();

  const [noteContent, setNoteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [severityModalOpen, setSeverityModalOpen] = useState(false);
  const [newSeverity, setNewSeverity] = useState("");
  const [isTimelineMaximized, setIsTimelineMaximized] = useState(false);

  const { data, error, mutate, isValidating } = useSWR(
    token && id ? `/alerts/incidents/${id}` : null,
    fetcher,
    { refreshInterval: 15000 },
  );

  const handleStatusUpdate = async (status: "acknowledged" | "resolved") => {
    setIsSubmitting(true);
    try {
      await api.patch(`/alerts/incidents/${id}/status`, { status });
      mutate();
      toast.success(`Incident ${status}.`);
    } catch {
      toast.error("Failed to update incident.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeverityChange = async () => {
    if (!newSeverity) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/alerts/incidents/${id}/severity`, {
        severity: newSeverity,
      });
      mutate();
      setSeverityModalOpen(false);
      toast.success("Severity updated.");
    } catch {
      toast.error("Failed to update severity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/alerts/incidents/${id}/notes`, {
        content: noteContent.trim(),
      });
      setNoteContent("");
      mutate();
      toast.success("Note added.");
    } catch {
      toast.error("Failed to add note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!data && !error)
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Spinner className="h-8 w-8 text-orange-500" />
        <p className="text-muted-foreground">Loading Incident...</p>
      </div>
    );
  if (error)
    return (
      <div className="h-full flex items-center justify-center p-8">
        <DataError onRetry={() => mutate()} />
      </div>
    );

  const { incident } = data;
  const condition = incident.conditionId || {};
  const policy = incident.policyId || {};
  const sevConfig = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.high;
  const timeline = [...(incident.timeline || [])].reverse();

  const TIMELINE_COLLAPSED_LIMIT = 10;
  const timelineLimit = isTimelineMaximized ? timeline.length : TIMELINE_COLLAPSED_LIMIT;
  const visibleTimeline = timeline.slice(0, timelineLimit);
  const timelineHiddenCount = timeline.length - timelineLimit;

  // --- Timeline Card (reused in both inline & portal) ---
  const TimelineCard = (
    <Card
      className={cn(
        "flex flex-col border-border/60 shadow-sm transition-all duration-300 overflow-hidden",
        isTimelineMaximized
          ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl bg-card"
          : "w-full h-auto",
      )}
    >
      <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-card/50">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-foreground" /> Timeline
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            <RefreshCw
              className={`h-3 w-3 ${isValidating ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsTimelineMaximized(!isTimelineMaximized)}
          >
            {isTimelineMaximized ? (
              <X className="h-3 w-3" />
            ) : (
              <Maximize className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        {timeline.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No timeline events yet.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {visibleTimeline.map((event: any, i: number) => (
              <TimelineEvent key={event._id || i} event={event} />
            ))}
            {!isTimelineMaximized && timelineHiddenCount > 0 && (
              <div
                className="px-4 py-3 text-center text-xs font-medium text-muted-foreground hover:text-primary hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => setIsTimelineMaximized(true)}
              >
                Show {timelineHiddenCount} more...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
        {/* Breadcrumb */}
        <Link
          href="/dashboard/incidents"
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Incidents
        </Link>

        {/* Header */}
        <div className="bg-card/50 p-5 rounded-xl border border-border/60 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {incident.status === "open" ? (
                  <Badge
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] uppercase font-bold tracking-wider"
                  >
                    <span className="relative flex h-1.5 w-1.5 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
                    </span>
                    FIRING
                  </Badge>
                ) : incident.status === "acknowledged" ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase font-bold tracking-wider"
                  >
                    ACKNOWLEDGED
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider"
                  >
                    RESOLVED
                  </Badge>
                )}

                <Badge
                  variant="outline"
                  className={`${sevConfig.bgColor} ${sevConfig.color} ${sevConfig.borderColor} text-[10px] uppercase font-bold tracking-wider cursor-pointer hover:opacity-80`}
                  onClick={() => {
                    if (incident.status !== "resolved") {
                      setNewSeverity(incident.severity);
                      setSeverityModalOpen(true);
                    }
                  }}
                >
                  {sevConfig.label}
                </Badge>

                <span className="font-mono text-xs text-muted-foreground">
                  {formatIncidentNumber(incident.incidentNumber)}
                </span>
              </div>

              <h1 className="text-xl font-bold tracking-tight text-foreground break-words">
                {incident.title || condition.name || "Untitled Incident"}
              </h1>

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Opened{" "}
                  {formatDistanceToNow(new Date(incident.openedAt))} ago
                </span>
                {incident.status !== "resolved" && (
                  <span className="flex items-center gap-1.5 text-destructive font-medium">
                    <Activity className="h-3.5 w-3.5" />
                    Duration: {formatDuration(incident.openedAt)}
                  </span>
                )}
                {incident.resolvedAt && (
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Resolved in{" "}
                    {formatDuration(incident.openedAt, incident.resolvedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {incident.status === "open" && (
                <>
                  <Button
                    variant="outline"
                    className="h-9 text-xs border-amber-500/50 hover:bg-amber-500/10 text-amber-500"
                    onClick={() => handleStatusUpdate("acknowledged")}
                    disabled={isSubmitting}
                  >
                    Acknowledge
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 text-xs border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500"
                    onClick={() => handleStatusUpdate("resolved")}
                    disabled={isSubmitting}
                  >
                    Resolve
                  </Button>
                </>
              )}
              {incident.status === "acknowledged" && (
                <Button
                  variant="outline"
                  className="h-9 text-xs border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500"
                  onClick={() => handleStatusUpdate("resolved")}
                  disabled={isSubmitting}
                >
                  Resolve
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutate()}
                disabled={isValidating}
                className="h-9 w-9"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isValidating ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Labels */}
          {incident.labels?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {incident.labels.map((label: string, i: number) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] font-mono"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCell label="Trigger Value">
            <span className="font-mono font-bold text-base text-foreground">
              {incident.triggerValue}
            </span>
          </SummaryCell>
          <SummaryCell label="Opened">
            <span className="text-xs text-foreground">
              {format(new Date(incident.openedAt), "MMM d, yyyy HH:mm")}
            </span>
          </SummaryCell>
          <SummaryCell label="Duration">
            {incident.resolvedAt ? (
              <span className="font-mono text-xs font-medium text-emerald-500">
                {formatDuration(incident.openedAt, incident.resolvedAt)}
              </span>
            ) : (
              <span className="font-mono text-xs font-medium text-destructive">
                {formatDuration(incident.openedAt)}
              </span>
            )}
          </SummaryCell>
          <SummaryCell
            label={
              incident.resolvedAt
                ? "Resolved"
                : incident.acknowledgedAt
                  ? "Acknowledged"
                  : "Status"
            }
          >
            {incident.resolvedAt ? (
              <span className="text-xs text-foreground">
                {format(new Date(incident.resolvedAt), "MMM d, yyyy HH:mm")}
              </span>
            ) : incident.acknowledgedAt ? (
              <span className="text-xs text-foreground">
                {format(new Date(incident.acknowledgedAt), "MMM d, yyyy HH:mm")}
              </span>
            ) : (
              <span className="text-xs font-medium text-destructive">Firing</span>
            )}
          </SummaryCell>
        </div>

        {/* Condition & Policy */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {condition._id && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="p-4 border-b border-border/40 bg-card/50">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-foreground" /> Condition
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <DetailRow label="Name">
                  <span className="font-medium text-xs">{condition.name}</span>
                </DetailRow>
                <DetailRow label="Target">
                  <div className="flex items-center gap-1.5 text-xs capitalize">
                    {getTargetIcon(condition.target)} {condition.target}
                  </div>
                </DetailRow>
                {condition.threshold && (
                  <DetailRow label="Threshold">
                    <span className="font-mono text-xs">
                      COUNT{" "}
                      {
                        ({
                          gt: ">",
                          lt: "<",
                          eq: "==",
                          gte: ">=",
                          lte: "<=",
                          neq: "!=",
                        } as any)[condition.threshold.operator]
                      }{" "}
                      {condition.threshold.value} in{" "}
                      {condition.threshold.windowMins}m
                    </span>
                  </DetailRow>
                )}
                {condition.description && (
                  <DetailRow label="Description">
                    <span className="text-xs text-muted-foreground">
                      {condition.description}
                    </span>
                  </DetailRow>
                )}
              </CardContent>
            </Card>
          )}

          {policy._id && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="p-4 border-b border-border/40 bg-card/50">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-foreground" /> Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <DetailRow label="Name">
                  <Link
                    href={`/dashboard/alerts/${policy._id}`}
                    className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {policy.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </DetailRow>
                {policy.description && (
                  <DetailRow label="Description">
                    <span className="text-xs text-muted-foreground">
                      {policy.description}
                    </span>
                  </DetailRow>
                )}
                {policy.destinations?.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      Destinations
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {policy.destinations.map((dest: any) => (
                        <Badge
                          key={dest._id}
                          variant="outline"
                          className="text-[9px] uppercase tracking-wider capitalize"
                        >
                          {dest.type}: {dest.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Query Display */}
        {condition.query && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-4 border-b border-border/40 bg-card/50">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4 text-foreground" /> Condition Query
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-muted/30 p-4 overflow-x-auto">
                <pre className="text-[11px] text-foreground font-mono whitespace-pre-wrap break-all leading-relaxed">
                  {JSON.stringify(condition.query, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Note */}
        {incident.status !== "resolved" && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-4 border-b border-border/40 bg-card/50">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-foreground" /> Add Note
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleAddNote}>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-primary outline-none resize-none min-h-[100px]"
                  placeholder="Add a note to this incident..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  maxLength={2000}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-[10px] text-muted-foreground">
                    {noteContent.length}/2000
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || !noteContent.trim()}
                    className="h-8 text-xs"
                  >
                    Add Note
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {isTimelineMaximized &&
          createPortal(
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setIsTimelineMaximized(false)}
            />,
            document.body,
          )}
        {isTimelineMaximized
          ? createPortal(TimelineCard, document.body)
          : TimelineCard}
      </div>

      {/* Severity Change Dialog */}
      <Dialog
        open={severityModalOpen}
        onClose={() => setSeverityModalOpen(false)}
        title="Change Severity"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Severity Level</label>
            <Select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value)}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setSeverityModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSeverityChange}
              disabled={isSubmitting}
              className="bg-primary"
            >
              {isSubmitting ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : null}
              Update Severity
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function SummaryCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card/50 border border-border/60 rounded-lg p-3.5 space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 pt-0.5">
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}
