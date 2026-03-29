import React, { useState, useMemo, createContext, useContext } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { format } from "date-fns";
import { api, useAuth } from "../../../lib/auth";
import { useTheme } from "../../../lib/theme";
import { DashboardLayout } from "../../../components/Layout";
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
  Select,
} from "../../../components/Core";
import {
  BellRing,
  Plus,
  Mail,
  Webhook,
  Hash,
  RefreshCw,
  FolderLock,
  Box,
  AlertTriangle,
  Maximize,
  X,
  Search,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

// --- Helpers ---
const getChannelIcon = (type: string) => {
  switch (type) {
    case "email":
      return <Mail className="h-4 w-4 text-blue-500" />;
    case "slack":
      return <Hash className="h-4 w-4 text-emerald-500" />;
    case "discord":
      return <Webhook className="h-4 w-4 text-indigo-500" />;
    default:
      return <BellRing className="h-4 w-4 text-muted-foreground" />;
  }
};

// --- Maximizable Policies Table ---
const PoliciesTable = ({
  policies,
  onEdit,
  onDelete,
  isValidating,
  mutate,
}: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return policies;
    return policies.filter((p: any) =>
      p.name.toLowerCase().includes(filter.toLowerCase()),
    );
  }, [policies, filter]);

  const limit = isMaximized ? filtered.length : 5;
  const visible = filtered.slice(0, limit);
  const hiddenCount = filtered.length - limit;

  const Header = (
    <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-card/50">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <FolderLock className="h-4 w-4 text-foreground" /> Alert Policies
      </CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-48">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-primary outline-none"
            placeholder="Filter policies..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
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
          onClick={toggle}
        >
          {isMaximized ? (
            <X className="h-3 w-3" />
          ) : (
            <Maximize className="h-3 w-3" />
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
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium w-full">Policy Name</th>
              <th className="px-6 py-3 text-right font-medium">Conditions</th>
              <th className="px-6 py-3 text-right font-medium">Incidents</th>
              <th className="px-6 py-3 font-medium">Destinations</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visible.map((policy: any) => (
              <tr
                key={policy._id}
                className="hover:bg-muted/20 group transition-colors"
              >
                <td
                  className="px-6 py-4 cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/dashboard/alerts/${policy._id}`)
                  }
                >
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {policy.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">
                    {policy.description || "No description"}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono text-xs">
                  {policy.conditionCount}
                </td>
                <td className="px-6 py-4 text-right font-mono text-xs">
                  {policy.openIncidents > 0 ? (
                    <span className="text-destructive font-bold flex items-center justify-end gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                      </span>
                      {policy.openIncidents} Open
                    </span>
                  ) : (
                    <span className="text-emerald-500">0 Open</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex -space-x-2">
                    {policy.destinations?.slice(0, 3).map((d: any) => (
                      <div
                        key={d._id}
                        className="h-6 w-6 rounded-full bg-background border flex items-center justify-center shadow-sm"
                        title={d.name}
                      >
                        {getChannelIcon(d.type)}
                      </div>
                    ))}
                    {(policy.destinations?.length || 0) > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted border flex items-center justify-center text-[9px] font-bold">
                        +{(policy.destinations?.length || 0) - 3}
                      </div>
                    )}
                    {policy.destinations?.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        None
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(policy)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(policy)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={toggle}
              >
                <td
                  colSpan={5}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  No policies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

// --- Maximizable Channels Table ---
const ChannelsTable = ({
  channels,
  onEdit,
  onDelete,
  isValidating,
  mutate,
}: any) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const toggle = () => setIsMaximized(!isMaximized);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    if (!filter) return channels;
    return channels.filter(
      (c: any) =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        c.type.toLowerCase().includes(filter.toLowerCase()),
    );
  }, [channels, filter]);

  const limit = isMaximized ? filtered.length : 5;
  const visible = filtered.slice(0, limit);
  const hiddenCount = filtered.length - limit;

  const Header = (
    <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-card/50">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <Webhook className="h-4 w-4 text-foreground" /> Notification Channels
      </CardTitle>
      <div className="flex items-center gap-2">
        <div className="relative w-48">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <input
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs focus:ring-1 focus:ring-primary outline-none"
            placeholder="Filter channels..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
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
          onClick={toggle}
        >
          {isMaximized ? (
            <X className="h-3 w-3" />
          ) : (
            <Maximize className="h-3 w-3" />
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
      <CardContent className="p-0 flex-1 overflow-auto bg-card">
        <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
          <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
            <tr>
              <th className="px-6 py-3 font-medium">Integration Name</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium w-full">
                Configuration Details
              </th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {visible.map((channel: any) => (
              <tr
                key={channel._id}
                className="hover:bg-muted/20 group transition-colors"
              >
                <td className="px-6 py-4 font-semibold text-foreground flex items-center gap-2">
                  {getChannelIcon(channel.type)} {channel.name}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className="capitalize text-[10px] tracking-wider border-border/60"
                  >
                    {channel.type}
                  </Badge>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-muted-foreground truncate max-w-sm">
                  {channel.type === "email"
                    ? channel.config?.emails?.join(", ")
                    : channel.config?.webhookUrl?.replace(
                        /https:\/\/.*@/,
                        "https://***@",
                      ) || "Webhook URL Hidden"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-muted-foreground hover:text-foreground"
                      onClick={() => onEdit(channel)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive hover:bg-destructive/10"
                      onClick={() => onDelete(channel)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isMaximized && hiddenCount > 0 && (
              <tr
                className="border-b border-border/40 hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={toggle}
              >
                <td
                  colSpan={4}
                  className="px-4 py-3 text-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                >
                  Show {hiddenCount} more...
                </td>
              </tr>
            )}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-12 text-center text-muted-foreground"
                >
                  No channels found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

export default function AlertsDashboard() {
  const router = useRouter();
  const { token } = useAuth();
  const { isMono } = useTheme();

  // --- Modals State ---
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    type: "policy" | "channel";
    id: string;
    name: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- Form States ---
  const [policyForm, setPolicyForm] = useState({
    name: "",
    description: "",
    destinations: [] as string[],
  });
  const [channelForm, setChannelForm] = useState({
    name: "",
    type: "email",
    configValue: "",
  });

  // --- Data Fetching (Auto-Refresh every 15s) ---
  const {
    data: policiesData,
    error: policiesError,
    mutate: mutatePolicies,
    isValidating: policiesValidating,
  } = useSWR(token ? "/alerts/policies" : null, fetcher, {
    refreshInterval: 15000,
  });
  const {
    data: channelsData,
    error: channelsError,
    mutate: mutateChannels,
    isValidating: channelsValidating,
  } = useSWR(token ? "/alerts/destinations" : null, fetcher, {
    refreshInterval: 15000,
  });

  const isLoading =
    !policiesData && !policiesError && !channelsData && !channelsError;
  const isRefreshing = policiesValidating || channelsValidating;
  const policies = policiesData?.policies || [];
  const channels = channelsData?.destinations || [];

  // --- Form Handlers ---
  const openCreatePolicy = () => {
    setEditingId(null);
    setPolicyForm({ name: "", description: "", destinations: [] });
    setIsPolicyModalOpen(true);
  };
  const openEditPolicy = (p: any) => {
    setEditingId(p._id);
    setPolicyForm({
      name: p.name,
      description: p.description || "",
      destinations: p.destinations.map((d: any) => d._id),
    });
    setIsPolicyModalOpen(true);
  };

  const openCreateChannel = () => {
    setEditingId(null);
    setChannelForm({ name: "", type: "email", configValue: "" });
    setIsChannelModalOpen(true);
  };
  const openEditChannel = (c: any) => {
    setEditingId(c._id);
    setChannelForm({
      name: c.name,
      type: c.type,
      configValue:
        c.type === "email" ? c.config.emails.join(", ") : c.config.webhookUrl,
    });
    setIsChannelModalOpen(true);
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/alerts/policies/${editingId}`, policyForm);
        toast.success("Policy updated!");
      } else {
        await api.post("/alerts/policies", policyForm);
        toast.success("Policy created!");
      }
      setIsPolicyModalOpen(false);
      mutatePolicies();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const config =
        channelForm.type === "email"
          ? { emails: channelForm.configValue.split(",").map((e) => e.trim()) }
          : { webhookUrl: channelForm.configValue.trim() };
      const payload = {
        name: channelForm.name,
        type: channelForm.type,
        config,
      };

      if (editingId) {
        await api.put(`/alerts/destinations/${editingId}`, payload);
        toast.success("Channel updated!");
      } else {
        await api.post("/alerts/destinations", payload);
        toast.success("Channel created!");
      }
      setIsChannelModalOpen(false);
      mutateChannels();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save channel");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    setIsSubmitting(true);
    try {
      if (deleteModal.type === "policy") {
        await api.delete(`/alerts/policies/${deleteModal.id}`);
        mutatePolicies();
      } else {
        await api.delete(`/alerts/destinations/${deleteModal.id}`);
        mutateChannels();
      }
      toast.success(
        `${deleteModal.type === "policy" ? "Policy" : "Channel"} deleted.`,
      );
      setDeleteModal(null);
    } catch (err) {
      toast.error("Failed to delete item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Spinner className="h-8 w-8 text-emerald-500" />
          <p className="text-muted-foreground">Loading Alerts...</p>
        </div>
      </DashboardLayout>
    );
  if (policiesError || channelsError)
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center p-8">
          <DataError
            onRetry={() => {
              mutatePolicies();
              mutateChannels();
            }}
          />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
        {/* --- APM Style Header --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/60 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Alerts & Incidents
              </h1>
              <Badge
                variant="outline"
                className="bg-destructive/10 text-destructive border-destructive/20 uppercase text-[10px] font-bold tracking-wider"
              >
                MISSION CONTROL
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                Online
              </div>
              <span className="text-muted-foreground font-mono ml-2">
                Evaluation Engine: Active
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={openCreateChannel}
              variant="outline"
              className="bg-background shadow-sm h-9"
            >
              <Webhook className="h-4 w-4 mr-2" /> Add Channel
            </Button>
            <Button
              onClick={openCreatePolicy}
              className="h-9 shadow-md bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" /> New Policy
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                mutatePolicies();
                mutateChannels();
              }}
              disabled={isRefreshing}
              className="h-9 w-9"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* --- Full Wide Tables --- */}
        <div className="space-y-6">
          <PoliciesTable
            policies={policies}
            onEdit={openEditPolicy}
            onDelete={(p: any) =>
              setDeleteModal({ type: "policy", id: p._id, name: p.name })
            }
            isValidating={policiesValidating}
            mutate={mutatePolicies}
          />
          <ChannelsTable
            channels={channels}
            onEdit={openEditChannel}
            onDelete={(c: any) =>
              setDeleteModal({ type: "channel", id: c._id, name: c.name })
            }
            isValidating={channelsValidating}
            mutate={mutateChannels}
          />
        </div>
      </div>

      {/* --- MODAL: POLICY FORM --- */}
      <Dialog
        open={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title={editingId ? "Edit Alert Policy" : "New Alert Policy"}
      >
        <form onSubmit={handleSavePolicy} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Policy Name</label>
            <Input
              placeholder="e.g., Production Database Health"
              value={policyForm.name}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, name: e.target.value })
              }
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (Optional)
              </span>
            </label>
            <Input
              placeholder="Describe what this policy monitors..."
              value={policyForm.description}
              onChange={(e) =>
                setPolicyForm({ ...policyForm, description: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-border/40">
            <label className="text-sm font-medium flex justify-between">
              Link Destinations
              <span className="text-xs text-muted-foreground font-normal">
                {policyForm.destinations.length} selected
              </span>
            </label>
            {channels.length === 0 ? (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-md flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  You have no notification channels configured. You can add them
                  later.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {channels.map((channel: any) => {
                  const isSelected = policyForm.destinations.includes(
                    channel._id,
                  );
                  return (
                    <div
                      key={channel._id}
                      onClick={() =>
                        setPolicyForm((p) => ({
                          ...p,
                          destinations: isSelected
                            ? p.destinations.filter((d) => d !== channel._id)
                            : [...p.destinations, channel._id],
                        }))
                      }
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:border-border/80"}`}
                    >
                      <div
                        className={`h-4 w-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background"}`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        {getChannelIcon(channel.type)}
                        <span className="text-xs font-medium truncate">
                          {channel.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPolicyModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : editingId ? (
                "Update Policy"
              ) : (
                "Create Policy"
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --- MODAL: CHANNEL FORM --- */}
      <Dialog
        open={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        title={
          editingId ? "Edit Notification Channel" : "New Notification Channel"
        }
      >
        <form onSubmit={handleSaveChannel} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Channel Name</label>
            <Input
              placeholder="e.g., Core Team Slack"
              value={channelForm.name}
              onChange={(e) =>
                setChannelForm({ ...channelForm, name: e.target.value })
              }
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Integration Type</label>
            <Select
              value={channelForm.type}
              onChange={(e) =>
                setChannelForm({
                  ...channelForm,
                  type: e.target.value,
                  configValue: "",
                })
              }
              disabled={isSubmitting || !!editingId}
            >
              <option value="email">Email Dispatch</option>
              <option value="slack">Slack Webhook</option>
              <option value="discord">Discord Webhook</option>
            </Select>
          </div>
          <div className="space-y-2 pt-2 border-t border-border/40">
            <label className="text-sm font-medium flex items-center justify-between">
              {channelForm.type === "email"
                ? "Recipient Emails"
                : "Webhook URL"}
              {channelForm.type === "email" && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  Comma separated
                </span>
              )}
            </label>
            <Input
              placeholder={
                channelForm.type === "email"
                  ? "devs@company.com"
                  : "https://hooks..."
              }
              value={channelForm.configValue}
              onChange={(e) =>
                setChannelForm({ ...channelForm, configValue: e.target.value })
              }
              disabled={isSubmitting}
              required
              type={channelForm.type === "email" ? "text" : "url"}
              className={
                channelForm.type !== "email" ? "font-mono text-xs" : ""
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsChannelModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Saving...
                </>
              ) : editingId ? (
                "Update Channel"
              ) : (
                "Create Channel"
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --- MODAL: DELETE CONFIRMATION --- */}
      <Dialog
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title={`Delete ${deleteModal?.type === "policy" ? "Policy" : "Channel"}?`}
      >
        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold block mb-1">
                Warning: Irreversible Action
              </span>
              This will permanently delete the {deleteModal?.type}{" "}
              <strong>{deleteModal?.name}</strong>.{" "}
              {deleteModal?.type === "policy"
                ? "All associated conditions will also be deleted."
                : "Any policies using this channel will no longer send notifications here."}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteModal(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}{" "}
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </DashboardLayout>
  );
}
