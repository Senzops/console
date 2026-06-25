/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Input,
  Badge,
  Spinner,
  Dialog,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../Core";
import {
  Share2,
  Copy,
  Check,
  Trash2,
  Link as LinkIcon,
  Clock,
  Eye,
  Globe,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useTheme } from "../../lib/theme";
import { trackEvent, AnalyticsEvent } from "@/lib/analytics";
import { shareApi, DashboardShareLink, ShareScopeType } from "../../lib/share";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EXPIRY_PRESETS: { value: string; label: string }[] = [
  { value: "1", label: "24 hours" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "custom", label: "Custom…" },
  { value: "never", label: "Never" },
];

// datetime-local input styling, mirrored from TimeRangePicker so the picker
// matches the rest of the app (native calendar indicator hidden on sm+, replaced
// by the CalendarPickerButton affordance).
const dateInputCls =
  "flex h-9 min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:[&::-webkit-calendar-picker-indicator]:hidden";

function CalendarPickerButton({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => {
        try {
          inputRef.current?.showPicker();
        } catch {
          inputRef.current?.focus();
        }
      }}
      className="hidden sm:flex items-center justify-center h-9 w-9 shrink-0 rounded-md border border-input bg-transparent transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

// Local-time string for a <input type="datetime-local"> value (YYYY-MM-DDTHH:mm).
function toLocalDatetimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function expiryLabel(link: DashboardShareLink): string {
  if (link.status === "expired") return "Expired";
  if (!link.expiresAt) return "Never expires";
  return `Expires ${formatDistanceToNow(new Date(link.expiresAt), { addSuffix: true })}`;
}

// ---------------------------------------------------------------------------
// Link row
// ---------------------------------------------------------------------------

const LinkRow: React.FC<{
  link: DashboardShareLink;
  onRevoke: (id: string) => void;
}> = ({ link, onRevoke }) => {
  const [copied, setCopied] = useState(false);
  const isExpired = link.status === "expired";

  const copy = () => {
    navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate text-foreground">
              {link.label || "Untitled link"}
            </span>
            {isExpired && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Expired
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {expiryLabel(link)}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {link.accessCount} view{link.accessCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRevoke(link.id)}
          title="Revoke link"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Retrievable URL — copy anytime */}
      <div
        className={`flex items-center gap-1.5 h-8 rounded-md border border-border/70 bg-secondary/40 pl-2.5 pr-1 ${
          isExpired ? "opacity-50" : ""
        }`}
      >
        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {link.url}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={copy}
          title="Copy link"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  scopeType: ShareScopeType;
  scopeId: string;
  dashboardName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  scopeType,
  scopeId,
  dashboardName,
}) => {
  const [links, setLinks] = useState<DashboardShareLink[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("30");
  const [customDateTime, setCustomDateTime] = useState("");
  const [planError, setPlanError] = useState<string | null>(null);
  const customRef = useRef<HTMLInputElement>(null);

  const { theme } = useTheme();
  const colorScheme: "dark" | "light" =
    theme === "dark" || theme === "nord" ? "dark" : "light";

  // Min selectable custom expiry is "now".
  const minDateTime = toLocalDatetimeString(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLinks(await shareApi.list(scopeType, scopeId));
    } catch {
      toast.error("Failed to load share links");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [scopeType, scopeId]);

  useEffect(() => {
    if (!open) return;
    setPlanError(null);
    setLabel("");
    setExpiry("30");
    setCustomDateTime(
      toLocalDatetimeString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    );
    load();
  }, [open, load]);

  const handleCreate = async () => {
    let expiryPayload: { expiresInDays?: number | null; expiresAt?: string | null };
    if (expiry === "never") {
      expiryPayload = { expiresInDays: null };
    } else if (expiry === "custom") {
      if (!customDateTime) {
        toast.error("Pick an expiry date and time");
        return;
      }
      const when = new Date(customDateTime);
      if (when.getTime() <= Date.now()) {
        toast.error("Expiry must be in the future");
        return;
      }
      expiryPayload = { expiresAt: when.toISOString() };
    } else {
      expiryPayload = { expiresInDays: Number(expiry) };
    }

    setCreating(true);
    setPlanError(null);
    try {
      const { share } = await shareApi.create({
        scopeType,
        scopeId,
        label: label.trim() || undefined,
        ...expiryPayload,
      });
      setLinks((prev) => [share, ...(prev || [])]);
      setLabel("");
      trackEvent(AnalyticsEvent.ShareLinkCreated, { scope: scopeType });
      toast.success("Share link created");
    } catch (e: any) {
      const data = e?.response?.data;
      if (e?.response?.status === 403 && data?.requiredPlan) {
        setPlanError(data.message || "Public sharing requires the Pro plan or higher.");
      } else {
        toast.error(data?.error || "Failed to create share link");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const prev = links;
    setLinks((p) => (p ? p.filter((l) => l.id !== id) : p));
    try {
      await shareApi.revoke(id);
      toast.success("Share link revoked");
    } catch {
      toast.error("Failed to revoke link");
      setLinks(prev || null);
    }
  };

  const activeCount = links?.length ?? 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={dashboardName ? `Share · ${dashboardName}` : "Share dashboard"}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Context banner */}
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-secondary/30 p-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Globe className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Public, read-only access.</span>{" "}
            Anyone with a link can view this dashboard without signing in. Links
            never allow editing, can be revoked instantly, and you can copy them
            again here anytime.
          </div>
        </div>

        {/* Create a new link — one cohesive block */}
        <section className="space-y-2.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Create a link
          </h4>

          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">
                Label <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Q3 board review"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5 min-w-0">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Expires
                </label>
                <div className="flex items-center gap-1.5">
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger className="w-full sm:w-36 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_PRESETS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {expiry === "custom" && (
                    <>
                      <input
                        ref={customRef}
                        type="datetime-local"
                        value={customDateTime}
                        min={minDateTime}
                        onChange={(e) => setCustomDateTime(e.target.value)}
                        style={{ colorScheme }}
                        className={dateInputCls}
                      />
                      <CalendarPickerButton inputRef={customRef} />
                    </>
                  )}
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={creating}
                className="sm:ml-auto w-full sm:w-auto h-9 px-5"
              >
                {creating && <Spinner className="h-4 w-4 mr-2" />}
                Create link
              </Button>
            </div>

            {planError && (
              <div className="flex items-start gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-md p-2.5">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{planError}</span>
              </div>
            )}
          </div>
        </section>

        {/* Existing links */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active links{activeCount > 0 ? ` · ${activeCount}` : ""}
          </h4>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-5 w-5 text-muted-foreground" />
            </div>
          ) : links && links.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5">
              {links.map((link) => (
                <LinkRow key={link.id} link={link} onRevoke={handleRevoke} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 py-8 text-center">
              <LinkIcon className="h-5 w-5 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No share links yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                Create one above to share this dashboard.
              </p>
            </div>
          )}
        </section>
      </div>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Reusable Share button — drop into any dashboard header action row.
// ---------------------------------------------------------------------------
export const ShareButton: React.FC<{
  scopeType: ShareScopeType;
  scopeId: string;
  dashboardName?: string;
}> = ({ scopeType, scopeId, dashboardName }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        title="Share dashboard"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <ShareModal
        open={open}
        onClose={() => setOpen(false)}
        scopeType={scopeType}
        scopeId={scopeId}
        dashboardName={dashboardName}
      />
    </>
  );
};
