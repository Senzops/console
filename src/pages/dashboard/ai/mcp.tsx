import React, { useState, useMemo, createContext } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { api, useAuth } from "../../../lib/auth";
import { formatAxisDate } from "@/lib/formatAxisDate";
import { ChartTooltip } from "@/components/ChartTooltip";
import { useTheme } from "../../../lib/theme";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Spinner,
  Dialog,
  Input,
  DataError,
} from "../../../components/Core";
import { TablePageSkeleton } from "../../../components/Skeletons";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Bot,
  Key,
  Activity,
  Trash2,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  Box,
  Wrench,
  Info,
  Maximize,
  X,
  AlertTriangle,
} from "lucide-react";
import { createPortal } from "react-dom";
import { SmartAnimatedValue } from "@/components/Tween";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- Helpers ---
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return num.toString();
};


// --- Context & Wrappers (Matching ApmView) ---
const ChartContext = createContext<{
  isMaximized: boolean;
  toggle: () => void;
}>({ isMaximized: false, toggle: () => {} });

const ChartCard = ({ title, children, actions }: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);

  const Header = (
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/40 mb-2 h-14 shrink-0">
      <div className="flex items-center gap-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {actions}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors"
        onClick={toggle}
      >
        {isMaximized ? (
          <X className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </Button>
    </CardHeader>
  );

  const Content = (
    <ChartContext.Provider value={{ isMaximized, toggle }}>
      <Card
        className={`flex flex-col transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl bg-card" : "h-[400px]"}`}
      >
        {Header}
        <CardContent className="flex-1 min-h-0 relative px-0 pb-0">
          <div className="w-full h-full relative">{children}</div>
        </CardContent>
      </Card>
    </ChartContext.Provider>
  );
  return (
    <>
      {isMaximized &&
        createPortal(
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsMaximized(false)}
          />,
          document.body,
        )}
      {isMaximized ? createPortal(Content, document.body) : Content}
    </>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color, isMono }: any) => {
  const iconClass = isMono ? "text-[hsl(var(--chart-mono))]" : color;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {title}
          </p>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
        <div className="text-2xl font-bold text-foreground">
          <SmartAnimatedValue value={value} />
        </div>
        {sub && (
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// --- Managed API Keys Table (Adaptive Component) ---
const ManagedKeysTable = ({
  keys,
  keysValidating,
  mutateKeys,
  onRevoke,
}: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);

  const limit = isMaximized ? keys?.length || 0 : 4;
  const visibleKeys = keys?.slice(0, limit) || [];
  const hiddenCount = (keys?.length || 0) - limit;

  const Header = (
    <CardHeader className="p-4 border-b border-border/40 bg-card/50 flex flex-row items-center justify-between h-14 shrink-0 mb-0">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <Key className="h-4 w-4 text-foreground" /> Managed API Keys
      </CardTitle>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => mutateKeys()}
          disabled={keysValidating}
          className="h-8 w-8"
        >
          <RefreshCw
            className={`h-4 w-4 text-muted-foreground ${keysValidating ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
          onClick={toggle}
        >
          {isMaximized ? (
            <X className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>
    </CardHeader>
  );

  const Content = (
    <Card
      className={`flex flex-col border-border/60 shadow-sm transition-all duration-300 overflow-hidden ${isMaximized ? "fixed inset-4 z-50 animate-in zoom-in-95 shadow-2xl bg-card" : "w-full h-auto"}`}
    >
      {Header}
      <CardContent className="p-0 overflow-auto bg-card flex-1">
        <div className="min-w-[700px] h-full">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-6 py-3 font-medium">Integration Name</th>
                <th className="px-6 py-3 font-medium w-32">Status</th>
                <th className="px-6 py-3 font-medium w-48">Last Used</th>
                <th className="px-6 py-3 font-medium w-24 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {keys?.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-muted-foreground font-medium"
                  >
                    No MCP Keys generated yet. Create one to connect your IDE.
                  </td>
                </tr>
              ) : (
                visibleKeys.map((key: any) => (
                  <tr
                    key={key._id}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-6 py-3 font-medium text-foreground flex items-center gap-2">
                      <Box className="h-4 w-4 text-muted-foreground" />{" "}
                      {key.name}
                    </td>
                    <td className="px-6 py-3">
                      {key.status === "active" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono text-[10px]"
                        >
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/20 font-mono text-[10px]"
                        >
                          REVOKED
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground font-mono">
                      {key.lastUsedAt
                        ? format(new Date(key.lastUsedAt), "MMM d, HH:mm")
                        : "Never"}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {key.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 transition-colors"
                          onClick={() => onRevoke(key._id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!isMaximized && hiddenCount > 0 && (
                <tr
                  onClick={toggle}
                  className="hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <td
                    colSpan={4}
                    className="px-6 py-3.5 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                  >
                    Show {hiddenCount} more...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {isMaximized &&
        createPortal(
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsMaximized(false)}
          />,
          document.body,
        )}
      {isMaximized ? createPortal(Content, document.body) : Content}
    </>
  );
};

export default function McpSettingsDashboard() {
  const { token } = useAuth();
  const { isMono } = useTheme();

  // --- State ---
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newCreds, setNewCreds] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [installTab, setInstallTab] = useState<"cursor" | "claude">("cursor");

  // --- Revoke Modal State ---
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // --- Data Fetching ---
  const {
    data: keysData,
    mutate: mutateKeys,
    isValidating: keysValidating,
  } = useSWR(token ? "/mcp/keys" : null, fetcher, { keepPreviousData: true });

  const {
    data: usageData,
    error: usageError,
    mutate: mutateUsage,
    isValidating: usageValidating,
  } = useSWR(token ? "/mcp/usage" : null, fetcher, { keepPreviousData: true });

  // --- Derived Metrics ---
  const activeKeysCount =
    keysData?.keys?.filter((k: any) => k.status === "active").length || 0;
  const revokedKeysCount =
    keysData?.keys?.filter((k: any) => k.status === "revoked").length || 0;
  const totalQueries = usageData?.totalQueries || 0;

  const topTool = useMemo(() => {
    if (!usageData?.toolCalls) return "None";
    const tools = Object.entries(usageData.toolCalls) as [string, number][];
    if (tools.length === 0) return "None";
    return tools
      .sort((a, b) => b[1] - a[1])[0][0]
      .replace(/^(apm|rum|task|logs|vps|database|uptime)_/, "");
  }, [usageData]);

  const chartData = useMemo(() => {
    if (!usageData?.trend) return [];
    return usageData.trend.map((point: any) => ({
      ...point,
      rawTime: point._id,
    }));
  }, [usageData]);

  const axisFormatter = useMemo(
    () => (str: string) => formatAxisDate(str, 7 * 24 * 60 * 60_000),
    [],
  );

  // --- Handlers ---
  const handleGenerateKey = async () => {
    if (!newKeyName) return;
    setIsGenerating(true);
    try {
      const res = await api.post("/mcp/keys", { name: newKeyName });
      setNewCreds(res.data);
      mutateKeys();
      toast.success("MCP Key generated securely.");
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to generate key");
    } finally {
      setIsGenerating(false);
    }
  };

  const promptRevokeKey = (id: string) => {
    setKeyToRevoke(id);
    setRevokeModalOpen(true);
  };

  const confirmRevokeKey = async () => {
    if (!keyToRevoke) return;
    setIsRevoking(true);
    try {
      await api.delete(`/mcp/keys/${keyToRevoke}`);
      mutateKeys();
      toast.success("Key revoked successfully.");
      setRevokeModalOpen(false);
      setKeyToRevoke(null);
    } catch (e: any) {
      toast.error("Failed to revoke key");
    } finally {
      setIsRevoking(false);
    }
  };

  const closeModal = () => {
    setIsGenerateModalOpen(false);
    setNewCreds(null);
    setNewKeyName("");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [id]: true }));
    setTimeout(
      () => setCopiedStates((prev) => ({ ...prev, [id]: false })),
      2000,
    );
  };

  const getColor = (defaultColor: string) =>
    isMono ? "hsl(var(--chart-mono))" : defaultColor;

  if (!keysData && !usageData && !usageError) {
    return <TablePageSkeleton stats={4} chart actions={1} picker={false} icon={false} badge columns={5} rows={6} label="Loading MCP dashboard" />;
  }

  if (usageError) {
    return (
      <>
        <div className="h-full flex items-center justify-center p-8">
          <DataError
            onRetry={() => {
              mutateKeys();
              mutateUsage();
            }}
          />
        </div>
      </>
    );
  }

  const isDataRefreshing = keysValidating || usageValidating;

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 relative">
        {/* --- Header (ApmView Style) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Model Context Protocol
              </h1>
              <Badge
                variant="outline"
                className="border-blue-500/20 text-blue-500 bg-blue-500/10 font-mono text-xs font-bold tracking-wider"
              >
                AI INTEGRATION
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                Online
              </div>
              <span className="text-muted-foreground font-mono ml-2">
                Protocol: Streamable HTTP
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsGenerateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md h-9"
            >
              <Key className="h-4 w-4 mr-2" /> Generate Key
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                mutateKeys();
                mutateUsage();
              }}
              disabled={isDataRefreshing}
              className="h-9 w-9 shrink-0"
            >
              <RefreshCw
                className={`h-4 w-4 ${isDataRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* --- Stats (4 Cards) --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Queries"
            value={formatNumber(totalQueries)}
            sub="AI requests"
            icon={Activity}
            color="text-blue-500"
            isMono={isMono}
          />
          <StatCard
            title="Active Keys"
            value={activeKeysCount}
            sub="Live integrations"
            icon={Key}
            color="text-emerald-500"
            isMono={isMono}
          />
          <StatCard
            title="Revoked Keys"
            value={revokedKeysCount}
            sub="Disabled access"
            icon={Trash2}
            color="text-destructive"
            isMono={isMono}
          />
          <StatCard
            title="Top Tool"
            value={topTool}
            sub="Most requested"
            icon={Wrench}
            color="text-purple-500"
            isMono={isMono}
          />
        </div>

        {/* --- Full Wide Chart --- */}
        <div className="w-full">
          <ChartCard title="Query Volume">
            <div className="p-4 w-full h-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorQueries"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={getColor("#3b82f6")}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={getColor("#3b82f6")}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                      opacity={0.3}
                    />
                    <XAxis dataKey="rawTime" hide />
                    <YAxis hide />
                    <RechartsTooltip
                      content={<ChartTooltip labelFormatter={axisFormatter} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="queries"
                      stroke={getColor("#3b82f6")}
                      fill="url(#colorQueries)"
                      strokeWidth={2}
                      name="AI Queries"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <Bot className="h-8 w-8 opacity-20" />
                  <p className="text-sm">
                    No AI queries recorded in this timeframe.
                  </p>
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* --- Full Wide Keys Table --- */}
        <div className="w-full">
          <ManagedKeysTable
            keys={keysData?.keys}
            keysValidating={keysValidating}
            mutateKeys={mutateKeys}
            onRevoke={promptRevokeKey}
          />
        </div>

        {/* --- Full Wide Connection Guide --- */}
        <Card className="border-border/60 shadow-sm w-full flex flex-col bg-card/50">
          <CardHeader className="p-4 border-b border-border/40 bg-card">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Terminal className="h-4 w-4 text-foreground" /> Client Connection
              Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-col gap-6">
            <div className="flex bg-muted/50 p-1 rounded-md border border-border/50 w-fit">
              <button
                onClick={() => setInstallTab("cursor")}
                className={`px-6 py-1.5 text-xs font-semibold rounded transition-all ${installTab === "cursor" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Cursor IDE
              </button>
              <button
                onClick={() => setInstallTab("claude")}
                className={`px-6 py-1.5 text-xs font-semibold rounded transition-all ${installTab === "claude" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Claude Desktop
              </button>
            </div>

            <div className="w-full">
              {installTab === "cursor" ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-sm flex flex-col md:flex-row gap-6">
                    <div className="flex-1 max-w-sm">
                      <ol className="list-decimal pl-4 space-y-3 text-muted-foreground">
                        <li>
                          Open Cursor Settings{" "}
                          <kbd className="bg-muted px-1.5 rounded text-[10px] ml-1 font-mono border border-border/50">
                            Cmd + Shift + J
                          </kbd>
                        </li>
                        <li>
                          Navigate to <strong>Features &gt; MCP</strong>
                        </li>
                        <li>
                          Click <strong>+ Add New MCP Server</strong>
                        </li>
                        <li>
                          Paste the configuration below. Cursor auto-detects the{" "}
                          <strong>Streamable HTTP</strong> transport.
                        </li>
                      </ol>
                    </div>

                    <div className="flex-1 relative group bg-[#0d1117] rounded-lg p-4 border border-border/50">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-7 w-7 bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() =>
                          copyToClipboard(
                            `{\n  "mcpServers": {\n    "senzor": {\n      "url": "https://api.senzor.dev/api/mcp",\n      "headers": {\n        "Authorization": "Bearer <YOUR_KEY>"\n      }\n    }\n  }\n}`,
                            "cursor_json",
                          )
                        }
                      >
                        {copiedStates["cursor_json"] ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <pre className="text-[11px] font-mono text-[#e6edf3] leading-relaxed overflow-x-auto">
                        {`{
  "mcpServers": {
    "senzor": {
      "url": "https://api.senzor.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_KEY>"
      }
    }
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-sm flex flex-col md:flex-row gap-6">
                    <div className="flex-1 max-w-sm">
                      <ol className="list-decimal pl-4 space-y-3 text-muted-foreground">
                        <li>Open your terminal</li>
                        <li>Ensure you have the latest Claude CLI installed</li>
                        <li>Run the command to connect Senzor securely</li>
                      </ol>
                      <p className="text-[10px] text-emerald-500 flex items-start gap-1.5 bg-emerald-500/10 p-2.5 rounded-md mt-4 border border-emerald-500/20">
                        <Check className="h-3 w-3 shrink-0" />
                        Claude natively supports remote HTTP transports. No
                        bridging required.
                      </p>
                    </div>

                    <div className="flex-1 relative group bg-[#0d1117] rounded-lg p-4 border border-border/50">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-7 w-7 bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() =>
                          copyToClipboard(
                            `claude mcp add --transport http senzor-api https://api.senzor.dev/api/mcp --header "Authorization: Bearer <YOUR_KEY>"`,
                            "claude_cli",
                          )
                        }
                      >
                        {copiedStates["claude_cli"] ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <pre className="text-[11px] font-mono text-[#e6edf3] leading-relaxed overflow-x-auto">
                        {`claude mcp add \\
  --transport http \\
  senzor-api \\
  https://api.senzor.dev/api/mcp \\
  --header "Authorization: Bearer <YOUR_KEY>"`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- GENERATE KEY MODAL --- */}
      <Dialog
        open={isGenerateModalOpen}
        onClose={closeModal}
        title="Generate MCP Key"
      >
        {!newCreds ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Integration Name</label>
              <Input
                placeholder="e.g., John's Cursor IDE"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                autoFocus
                disabled={isGenerating}
                className="bg-background border-border/80"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a dedicated key for this agent. You can revoke it at any
              time without affecting your main telemetry ingestion.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={closeModal}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Generating...
                  </>
                ) : (
                  "Generate Key"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs p-3 rounded-md flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Copy this key immediately. For security reasons, it will{" "}
                <strong>never be shown again</strong>.
              </span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" /> MCP Secret Key
              </label>
              <div className="relative">
                <Input
                  readOnly
                  value={newCreds.key}
                  className="font-mono text-blue-500 pr-10 bg-muted/30 border-blue-500/30"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => copyToClipboard(newCreds.key, "new_key")}
                >
                  {copiedStates["new_key"] ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={closeModal} variant="outline">
              I have saved my key
            </Button>
          </div>
        )}
      </Dialog>

      {/* --- REVOKE KEY MODAL --- */}
      <Dialog
        open={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        title="Revoke API Key?"
      >
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold block mb-1">
                Warning: Irreversible Action
              </span>
              This will permanently revoke access for this key. Any AI agents
              using it will immediately be disconnected and fail to
              authenticate.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setRevokeModalOpen(false)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevokeKey}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}{" "}
              Revoke Key
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
