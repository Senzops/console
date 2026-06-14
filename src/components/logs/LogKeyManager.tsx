import React, { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { api, useAuth } from "../../lib/auth";
import { Dialog, Button, Input, Badge, Spinner } from "../Core";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const INGEST_URL = `${API_BASE.replace(/\/$/, "")}/ingest/logs`;
const HOST = (() => {
  try { return new URL(API_BASE).host; } catch { return "api.senzor.dev"; }
})();

const KEY_PLACEHOLDER = "YOUR_LOG_API_KEY";

// --- Integration snippets ---------------------------------------------------
const integrations = (key: string) => {
  const k = key || KEY_PLACEHOLDER;
  return {
    cURL: `curl -X POST ${INGEST_URL} \\
  -H "x-log-api-key: ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{"level":"error","message":"Payment failed","userId":123}'`,
    NDJSON: `curl -X POST ${INGEST_URL} \\
  -H "x-log-api-key: ${k}" \\
  -H "Content-Type: application/x-ndjson" \\
  --data-binary $'{"level":"info","message":"line one"}\\n{"level":"error","message":"line two"}'`,
    "Node.js": `// Batch and ship as NDJSON (recommended for throughput)
async function shipLogs(logs) {
  await fetch("${INGEST_URL}", {
    method: "POST",
    headers: {
      "x-log-api-key": "${k}",
      "Content-Type": "application/x-ndjson",
    },
    body: logs.map((l) => JSON.stringify(l)).join("\\n"),
  });
}`,
    Winston: `import winston from "winston";

const logger = winston.createLogger({
  transports: [
    new winston.transports.Http({
      host: "${HOST}",
      path: "/api/ingest/logs",
      ssl: true,
      headers: { "x-log-api-key": "${k}" },
    }),
  ],
});`,
    Vector: `[sinks.senzor]
type = "http"
inputs = ["my_source"]
uri = "${INGEST_URL}"
encoding.codec = "json"
request.headers.x-log-api-key = "${k}"`,
    "Fluent Bit": `[OUTPUT]
    Name        http
    Match       *
    Host        ${HOST}
    Port        443
    URI         /api/ingest/logs
    Format      json
    Header      x-log-api-key ${k}
    tls         On`,
  };
};

type TabKey = keyof ReturnType<typeof integrations>;

const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={copy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </Button>
      <pre className="bg-[#0d1117] border border-border/60 rounded-lg p-4 overflow-x-auto text-[11px] leading-relaxed font-mono text-[#e6edf3] whitespace-pre">
        {code}
      </pre>
    </div>
  );
};

const HealthStat = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="rounded-lg border border-border/60 bg-card p-3">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
);

const IngestHealth = ({ open }: { open: boolean }) => {
  const { token } = useAuth();
  const { data, isLoading } = useSWR(token && open ? "/logs/ingest-stats?hours=24" : null, fetcher, { refreshInterval: 15000 });

  if (isLoading && !data) {
    return <div className="flex justify-center py-10"><Spinner className="h-5 w-5 text-blue-500" /></div>;
  }

  const totals = data?.totals || { accepted: 0, dropped: 0, received: 0 };
  const dropRate = totals.received ? (totals.dropped / totals.received) * 100 : 0;
  const series = (data?.series || []).map((s: any) => ({
    ...s,
    label: new Date(s.bucket).toLocaleTimeString([], { hour: "2-digit" }),
  }));
  const keys = data?.keys || [];

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Ingestion activity over the last 24 hours.</p>

      {/* Drop banner */}
      {totals.dropped > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-600 dark:text-yellow-500">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span><strong>{totals.dropped.toLocaleString()}</strong> log(s) were dropped ({dropRate.toFixed(1)}%). Dropped logs are usually malformed payloads — check that each event is valid JSON with a <code className="font-mono">message</code> field.</span>
        </div>
      ) : totals.received > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> All received logs were accepted.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
          <Activity className="h-4 w-4 shrink-0" /> No logs ingested in the last 24 hours. If you expected some, verify your key and quota.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <HealthStat label="Accepted" value={totals.accepted.toLocaleString()} color="text-emerald-500" />
        <HealthStat label="Dropped" value={totals.dropped.toLocaleString()} color={totals.dropped > 0 ? "text-destructive" : "text-foreground"} />
        <HealthStat label="Drop rate" value={`${dropRate.toFixed(1)}%`} color={dropRate > 0 ? "text-yellow-500" : "text-foreground"} />
      </div>

      {series.length > 0 && (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} barGap={0}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
              <YAxis hide />
              <RTooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="accepted" name="Accepted" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="dropped" name="Dropped" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Key activity */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key activity</p>
        <div className="space-y-1.5">
          {keys.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active keys.</p>
          ) : (
            keys.map((k: any) => (
              <div key={k.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-foreground truncate">{k.name} <span className="text-muted-foreground">({k.prefix}…)</span></span>
                <span className="text-muted-foreground shrink-0">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never used"}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const LogKeyManager = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { token } = useAuth();
  const [tab, setTab] = useState<"keys" | "integrations" | "health">("keys");
  const [integrationTab, setIntegrationTab] = useState<TabKey>("cURL");
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const { data, mutate, isLoading } = useSWR(token && open ? "/logs/keys" : null, fetcher);
  const keys = data?.keys || [];

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await api.post("/logs/keys", { name: newKeyName.trim() || "API Key" });
      setRevealedSecret(res.data.key);
      setNewKeyName("");
      mutate();
      toast.success("Ingestion key created");
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string, name: string) => {
    try {
      await api.delete(`/logs/keys/${id}`);
      mutate();
      toast.success(`Revoked "${name}"`);
    } catch {
      toast.error("Failed to revoke key");
    }
  };

  const snippets = integrations(revealedSecret || "");
  const tabKeys = Object.keys(snippets) as TabKey[];

  return (
    <Dialog open={open} onClose={onClose} title="Log Ingestion" className="max-w-3xl">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border border-border/50 w-fit mb-5">
        {(["keys", "integrations", "health"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-medium rounded capitalize transition-all ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "keys" ? "API Keys" : t === "integrations" ? "Integrations" : "Health"}
          </button>
        ))}
      </div>

      {tab === "health" ? (
        <IngestHealth open={open} />
      ) : tab === "keys" ? (
        <div className="space-y-5">
          {/* Reveal-once banner */}
          {revealedSecret && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" /> Copy your key now — it won&apos;t be shown again
              </div>
              <div className="relative">
                <Input readOnly value={revealedSecret} className="font-mono text-emerald-500 pr-10 bg-background" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => { navigator.clipboard.writeText(revealedSecret); setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 1500); }}
                >
                  {copiedSecret ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Create */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New key name</label>
              <Input
                placeholder="e.g. Production Vector"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !creating && createKey()}
              />
            </div>
            <Button onClick={createKey} disabled={creating} className="shrink-0">
              {creating ? <Spinner className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />} Create
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-8"><Spinner className="h-5 w-5 text-blue-500" /></div>
            ) : keys.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No keys yet. Create one to start ingesting logs.</div>
            ) : (
              keys.map((kRec: any) => (
                <div key={kRec.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${kRec.revokedAt ? "border-border/40 bg-muted/20 opacity-60" : "border-border/60 bg-card"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 shrink-0"><Key className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{kRec.name}</span>
                        {kRec.revokedAt && <Badge variant="destructive" className="text-[9px] px-1.5">Revoked</Badge>}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        {kRec.prefix}••••••  ·  {kRec.lastUsedAt ? `last used ${new Date(kRec.lastUsedAt).toLocaleDateString()}` : "never used"}
                      </div>
                    </div>
                  </div>
                  {!kRec.revokedAt && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => revokeKey(kRec.id, kRec.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {tabKeys.map((t) => (
              <button
                key={t}
                onClick={() => setIntegrationTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${integrationTab === t ? "bg-blue-500/10 border-blue-500/30 text-blue-500" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {!revealedSecret && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 border border-border/50 rounded-md px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
              Replace <code className="font-mono text-foreground">{KEY_PLACEHOLDER}</code> with a key from the API Keys tab.
            </div>
          )}

          <CodeBlock code={snippets[integrationTab]} />

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            Endpoint: <code className="font-mono text-foreground">{INGEST_URL}</code>
          </div>
        </div>
      )}
    </Dialog>
  );
};
