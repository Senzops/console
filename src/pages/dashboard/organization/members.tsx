import React, { useState, useEffect } from "react";
import Link from "next/link";
import useSWR, { mutate as globalMutate } from "swr";
import md5 from "md5";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  Spinner,
  Input,
  Badge,
  cn,
  Avatar,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../components/Core";
import { useAuth, api } from "../../../lib/auth";
import { useOrg } from "../../../lib/org";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Shield,
  Crown,
  UserPlus,
  Trash2,
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Eye,
  Pencil,
  UserMinus,
  SendHorizonal,
  RefreshCw,
  Check,
} from "lucide-react";
import { extractErrorMessage } from "@/utils/axiosError";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const getGravatar = (identifier: string) =>
  `https://www.gravatar.com/avatar/${md5(identifier.trim().toLowerCase())}?d=identicon`;

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  owner: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  admin: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
  member: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  viewer: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <ShieldCheck className="h-3 w-3" />,
  member: <Users className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

const INVITATION_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  accepted: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  expired: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/20" },
  revoked: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
};

// Resources for the granular permissions matrix
const PERMISSION_RESOURCES = [
  { key: "servers", label: "Servers" },
  { key: "apm", label: "APM" },
  { key: "rum", label: "RUM" },
  { key: "tasks", label: "Tasks" },
  { key: "databases", label: "Databases" },
  { key: "monitors", label: "Uptime" },
  { key: "web", label: "Web Analytics" },
  { key: "logs", label: "Logs" },
  { key: "errors", label: "Errors" },
  { key: "alerts", label: "Alerts" },
  { key: "views", label: "Views" },
  { key: "mcp", label: "AI / MCP" },
  { key: "billing", label: "Billing" },
] as const;

const PERMISSION_ACTIONS = ["read", "write", "delete"] as const;

// Default permissions per role (mirrors backend ROLE_DEFAULT_PERMISSIONS)
const ROLE_DEFAULTS: Record<string, Record<string, string[]>> = {
  admin: Object.fromEntries(PERMISSION_RESOURCES.filter(r => r.key !== "billing").map(r => [r.key, ["read", "write", "delete"]])),
  member: Object.fromEntries(PERMISSION_RESOURCES.filter(r => r.key !== "billing").map(r => [r.key, ["read", "write"]])),
  viewer: Object.fromEntries(PERMISSION_RESOURCES.filter(r => r.key !== "billing").map(r => [r.key, ["read"]])),
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MembersPage() {
  const { user } = useAuth();
  const { activeOrg, activeRole, canManageMembers, setActiveOrg, refreshOrgs, isLoading: orgListLoading, isReady } = useOrg();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [removeMember, setRemoveMember] = useState<any>(null);
  const [transferMember, setTransferMember] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await globalMutate(
        (key: unknown) => typeof key === "string" && (key.includes("/members") || key.includes("/invitations")),
        undefined,
        { revalidate: true }
      );
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Gate: wait for org context to resolve before rendering.
  // Prevents flicker of "No Organization Selected" when the org is
  // actually being restored from sessionStorage.
  if (!isReady || orgListLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner className="h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto pb-24">
        {/* Header — APM pattern */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">Members & Access</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Select an organization to manage members and permissions.
            </div>
          </div>
        </div>

        <Card className="border-border/60 shadow-sm bg-card">
          <CardContent className="p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-foreground font-medium">No Organization Selected</p>
            <p className="text-muted-foreground text-sm mt-1">Switch to an organization using the sidebar to manage its team.</p>
            <Link href="/dashboard/organization">
              <Button variant="outline" className="mt-6 font-semibold">
                Go to Organizations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto pb-24">
        {/* Header — APM pattern */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">Members & Access</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {activeOrg.name} &mdash; Manage team members, invitations, and granular access permissions.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} title="Refresh">
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            {canManageMembers && (
              <Button onClick={() => setInviteOpen(true)} className="font-semibold shrink-0 shadow-sm">
                <UserPlus className="h-4 w-4 mr-2" /> Invite Member
              </Button>
            )}
          </div>
        </div>

        {/* Members Table */}
        <MembersTable
          orgId={activeOrg._id}
          canManage={canManageMembers}
          isOwner={activeRole === "owner"}
          currentUserId={user?.uid || ""}
          onEdit={setEditMember}
          onRemove={setRemoveMember}
          onTransfer={setTransferMember}
        />

        {/* Invitations Table */}
        {canManageMembers && (
          <InvitationsTable orgId={activeOrg._id} />
        )}
      </div>

      {/* Modals */}
      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} orgId={activeOrg._id} />
      <EditMemberModal open={!!editMember} onClose={() => setEditMember(null)} member={editMember} orgId={activeOrg._id} />
      <RemoveMemberModal open={!!removeMember} onClose={() => setRemoveMember(null)} member={removeMember} orgId={activeOrg._id} currentUserId={user?.uid || ""} setActiveOrg={setActiveOrg} refreshOrgs={refreshOrgs} />
      <TransferOwnershipModal open={!!transferMember} onClose={() => setTransferMember(null)} member={transferMember} orgId={activeOrg._id} />
    </>
  );
}

// ============================================================================
// MEMBERS TABLE
// ============================================================================

function MembersTable({ orgId, canManage, isOwner, currentUserId, onEdit, onRemove, onTransfer }: {
  orgId: string;
  canManage: boolean;
  isOwner: boolean;
  currentUserId: string;
  onEdit: (m: any) => void;
  onRemove: (m: any) => void;
  onTransfer: (m: any) => void;
}) {
  const { data, isLoading } = useSWR(`/org/${orgId}/members`, fetcher);
  const members = data?.members || [];

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-muted/20">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
          <Users className="w-4 h-4 text-primary" /> Team Members
        </CardTitle>
        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-background border-border/60">
          {isLoading ? "..." : `${members.length} member${members.length !== 1 ? "s" : ""}`}
        </Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-auto bg-card">
        {isLoading ? (
          <div className="flex justify-center items-center h-[200px]">
            <Spinner className="w-6 h-6 text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-foreground font-medium">No members yet</p>
            <p className="text-xs text-muted-foreground mt-1">Invite your team to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Member</th>
                <th className="px-6 py-3.5 font-semibold">Role</th>
                <th className="px-6 py-3.5 font-semibold">Permissions</th>
                <th className="px-6 py-3.5 font-semibold">Joined</th>
                {canManage && <th className="px-6 py-3.5 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member: any) => {
                const isSelf = member.userId === currentUserId;
                const isTargetOwner = member.role === "owner";
                const colors = ROLE_COLORS[member.role] || ROLE_COLORS.viewer;
                const hasOverrides = member.permissions && Object.keys(member.permissions).length > 0;

                return (
                  <tr key={member._id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={getGravatar(member.email)}
                          fallback={member.email.substring(0, 2).toUpperCase()}
                          className="h-8 w-8"
                        />
                        <div>
                          <p className="text-foreground font-medium truncate max-w-[200px]">
                            {member.email}
                            {isSelf && <span className="text-muted-foreground ml-1.5 text-xs">(you)</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize", colors.bg, colors.text, colors.border)}>
                        {ROLE_ICONS[member.role]}
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {hasOverrides ? (
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border-blue-500/20">
                          Custom
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Role defaults</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(member.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isTargetOwner && !isSelf && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => onEdit(member)} title="Edit role & permissions" className="h-8 w-8">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => onRemove(member)} title="Remove member" className="h-8 w-8 text-destructive hover:text-destructive">
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {isOwner && !isTargetOwner && !isSelf && (
                            <Button variant="ghost" size="icon" onClick={() => onTransfer(member)} title="Transfer ownership" className="h-8 w-8">
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isSelf && !isTargetOwner && (
                            <Button variant="ghost" size="sm" onClick={() => onRemove(member)} className="text-xs text-muted-foreground hover:text-destructive h-8">
                              Leave
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// INVITATIONS TABLE
// ============================================================================

function InvitationsTable({ orgId }: { orgId: string }) {
  const { data, isLoading, mutate } = useSWR(`/org/${orgId}/invitations`, fetcher);
  const invitations = data?.invitations || [];
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (invitationId: string) => {
    setRevoking(invitationId);
    try {
      await api.delete(`/org/${orgId}/invitations/${invitationId}`);
      toast.success("Invitation revoked");
      mutate();
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Failed to revoke invitation"));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-muted/20">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
          <SendHorizonal className="w-4 h-4 text-primary" /> Invitations
        </CardTitle>
        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-background border-border/60">
          {isLoading ? "..." : `${invitations.filter((i: any) => i.status === "pending").length} pending`}
        </Badge>
      </CardHeader>

      <CardContent className="p-0 overflow-auto bg-card">
        {isLoading ? (
          <div className="flex justify-center items-center h-[200px]">
            <Spinner className="w-6 h-6 text-muted-foreground" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-16 text-center">
            <SendHorizonal className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
            <p className="font-medium text-foreground">No Invitations</p>
            <p className="text-xs text-muted-foreground mt-1">Invitations will appear here once you invite team members.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Recipient</th>
                <th className="px-6 py-3.5 font-semibold">Role</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold">Expires</th>
                <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv: any) => {
                const statusColors = INVITATION_STATUS_COLORS[inv.status] || INVITATION_STATUS_COLORS.pending;
                const isExpired = inv.status === "pending" && new Date(inv.expiresAt) < new Date();
                const roleColors = ROLE_COLORS[inv.role] || ROLE_COLORS.viewer;

                return (
                  <tr key={inv._id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={getGravatar(inv.email)}
                          fallback={inv.email.substring(0, 2).toUpperCase()}
                          className="h-8 w-8"
                        />
                        <span className="text-foreground font-medium">{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize", roleColors.bg, roleColors.text, roleColors.border)}>
                        {ROLE_ICONS[inv.role]}
                        {inv.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border capitalize", statusColors.bg, statusColors.text, statusColors.border)}>
                        {isExpired ? <><Clock className="h-3 w-3" /> Expired</>
                          : inv.status === "pending" ? <><Clock className="h-3 w-3" /> Pending</>
                          : inv.status === "accepted" ? <><CheckCircle className="h-3 w-3" /> Accepted</>
                          : inv.status === "revoked" ? <><XCircle className="h-3 w-3" /> Revoked</>
                          : inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(inv.expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === "pending" && !isExpired && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(inv._id)}
                          disabled={revoking === inv._id}
                          className="text-xs text-destructive hover:text-destructive h-8"
                        >
                          {revoking === inv._id ? <Spinner className="h-3 w-3" /> : "Revoke"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PERMISSIONS MATRIX COMPONENT
// ============================================================================

function PermissionsMatrix({
  role,
  permissions,
  onChange,
}: {
  role: string;
  permissions: Record<string, string[]>;
  onChange: (p: Record<string, string[]>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const defaults = ROLE_DEFAULTS[role] || {};

  const getEffective = (resource: string, action: string): boolean => {
    // If this resource has an explicit override (even empty = no permissions), respect it
    if (resource in permissions) {
      return permissions[resource].includes(action);
    }
    return (defaults[resource] || []).includes(action);
  };

  const isOverridden = (resource: string): boolean => {
    return resource in permissions;
  };

  const toggle = (resource: string, action: string) => {
    // If resource has an explicit override, use it; otherwise start from defaults
    const current = resource in permissions
      ? [...permissions[resource]]
      : [...(defaults[resource] || [])];

    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];

    const defaultActions = defaults[resource] || [];
    // Only clear the override if it exactly matches defaults
    const isMatchingDefault =
      next.length === defaultActions.length &&
      defaultActions.length > 0 &&
      next.every((a) => defaultActions.includes(a)) &&
      defaultActions.every((a) => next.includes(a));

    const updated = { ...permissions };
    if (isMatchingDefault) {
      delete updated[resource];
    } else {
      updated[resource] = next;
    }
    onChange(updated);
  };

  const resetAll = () => onChange({});

  const hasOverrides = Object.keys(permissions).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <Shield className="h-4 w-4 text-muted-foreground" />
          Granular Permissions
          {hasOverrides && (
            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border-blue-500/20 ml-1">
              Customized
            </Badge>
          )}
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        {hasOverrides && expanded && (
          <button type="button" onClick={resetAll} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors">
            Reset to Defaults
          </button>
        )}
      </div>

      {expanded && (
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resource</th>
                {PERMISSION_ACTIONS.map((action) => (
                  <th key={action} className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-20">{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_RESOURCES.map((resource) => {
                const overridden = isOverridden(resource.key);
                return (
                  <tr key={resource.key} className={cn("border-t border-border/30 transition-colors", overridden ? "bg-blue-500/5" : "hover:bg-muted/10")}>
                    <td className="px-4 py-2 text-sm text-foreground font-medium">
                      {resource.label}
                      {overridden && <span className="text-[9px] text-blue-500 font-bold ml-2">CUSTOM</span>}
                    </td>
                    {PERMISSION_ACTIONS.map((action) => {
                      const checked = getEffective(resource.key, action);
                      return (
                        <td key={action} className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggle(resource.key, action)}
                            className={cn(
                              "w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-all duration-150",
                              checked
                                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                : "border-border/60 hover:border-foreground/40 bg-background"
                            )}
                          >
                            {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 bg-muted/20 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Unchecked permissions use role defaults. Override specific resources by toggling checkboxes.
            </p>
          </div>
        </div>
      )}

      {!expanded && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {hasOverrides
            ? `${Object.keys(permissions).length} resource${Object.keys(permissions).length > 1 ? "s" : ""} with custom overrides. Click to expand.`
            : "Using default permissions for this role. Click to customize per-resource access."
          }
        </p>
      )}
    </div>
  );
}

// ============================================================================
// INVITE MEMBER MODAL (with granular permissions)
// ============================================================================

function InviteMemberModal({ open, onClose, orgId }: { open: boolean; onClose: () => void; orgId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setEmail(""); setRole("member"); setPermissions({}); setError(null); } }, [open]);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/org/${orgId}/invitations`, { email: email.trim(), role, permissions });
      toast.success("Invitation sent");
      globalMutate((key: string) => typeof key === "string" && key.includes(`/org/${orgId}/invitations`));
      onClose();
    } catch (e: any) {
      setError(extractErrorMessage(e, "Failed to send invitation"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Invite Member">
      <div className="space-y-5">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">Email Address</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Role</label>
          <Select value={role} onValueChange={(v) => { setRole(v); setPermissions({}); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer &mdash; Read-only access</SelectItem>
              <SelectItem value="member">Member &mdash; Read & write access</SelectItem>
              <SelectItem value="admin">Admin &mdash; Full access except billing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PermissionsMatrix role={role} permissions={permissions} onChange={setPermissions} />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !email.trim()}>
            {loading ? <><Spinner className="mr-2 h-4 w-4" /> Sending...</> : "Send Invitation"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ============================================================================
// EDIT MEMBER MODAL (with granular permissions)
// ============================================================================

function EditMemberModal({ open, onClose, member, orgId }: { open: boolean; onClose: () => void; member: any; orgId: string }) {
  const [role, setRole] = useState(member?.role || "member");
  const [permissions, setPermissions] = useState<Record<string, string[]>>(member?.permissions || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && member) {
      setRole(member.role);
      setPermissions(member.permissions || {});
      setError(null);
    }
  }, [open, member]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.put(`/org/${orgId}/members/${member._id}`, { role, permissions });
      toast.success("Member updated");
      globalMutate((key: string) => typeof key === "string" && key.includes(`/org/${orgId}/members`));
      onClose();
    } catch (e: any) {
      setError(extractErrorMessage(e, "Failed to update member"));
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Edit Member">
      <div className="space-y-5">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 rounded-lg bg-secondary/20 border border-border/40 flex items-center gap-3">
          <Avatar
            src={getGravatar(member.email)}
            fallback={member.email.substring(0, 2).toUpperCase()}
            className="h-9 w-9"
          />
          <div>
            <p className="text-sm font-medium text-foreground">{member.email}</p>
            <p className="text-xs text-muted-foreground">Current role: <span className="capitalize font-semibold">{member.role}</span></p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Role</label>
          <Select value={role} onValueChange={(v) => { setRole(v); setPermissions({}); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PermissionsMatrix role={role} permissions={permissions} onChange={setPermissions} />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Spinner className="mr-2 h-4 w-4" /> Saving...</> : "Save Changes"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ============================================================================
// REMOVE MEMBER MODAL
// ============================================================================

function RemoveMemberModal({ open, onClose, member, orgId, currentUserId, setActiveOrg, refreshOrgs }: {
  open: boolean; onClose: () => void; member: any; orgId: string; currentUserId: string;
  setActiveOrg: (org: any) => void; refreshOrgs: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const isSelf = member?.userId === currentUserId;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.delete(`/org/${orgId}/members/${member._id}`);
      toast.success(isSelf ? "You left the organization" : "Member removed");
      if (isSelf) {
        setActiveOrg(null);
        await refreshOrgs();
      } else {
        globalMutate((key: string) => typeof key === "string" && key.includes(`/org/${orgId}/members`));
      }
      onClose();
    } catch (e: any) {
      toast.error(extractErrorMessage(e, "Failed to remove member"));
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onClose={onClose} title={isSelf ? "Leave Organization" : "Remove Member"}>
      <div className="space-y-5">
        <div className={cn(
          "p-4 rounded-lg text-sm leading-relaxed shadow-sm border",
          isSelf
            ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-500/90"
            : "bg-destructive/10 border-destructive/20 text-destructive"
        )}>
          {isSelf ? (
            <>
              <strong className="block mb-1 font-bold">Leave Organization</strong>
              You will lose access to all shared resources and data under this organization. You can be re-invited later.
            </>
          ) : (
            <>
              <strong className="block mb-1 font-bold">Remove Member</strong>
              <span className="font-semibold">{member.email}</span> will immediately lose access to all organization resources. They can be re-invited later.
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            className="bg-destructive hover:bg-destructive/90 text-white shadow-sm"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <><Spinner className="mr-2 h-4 w-4" /> {isSelf ? "Leaving..." : "Removing..."}</> : (isSelf ? "Leave Organization" : "Remove Member")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ============================================================================
// TRANSFER OWNERSHIP MODAL
// ============================================================================

function TransferOwnershipModal({ open, onClose, member, orgId }: { open: boolean; onClose: () => void; member: any; orgId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshOrgs } = useOrg();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post(`/org/${orgId}/members/${member._id}/transfer`);
      toast.success("Ownership transferred");
      await refreshOrgs();
      globalMutate((key: string) => typeof key === "string" && key.includes(`/org/${orgId}/members`));
      onClose();
    } catch (e: any) {
      setError(extractErrorMessage(e, "Failed to transfer ownership"));
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Transfer Ownership">
      <div className="space-y-5">
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm text-amber-700 dark:text-amber-500/90 leading-relaxed shadow-sm">
          <strong className="block mb-1 font-bold">Ownership Transfer</strong>
          You are about to transfer ownership to <span className="font-semibold">{member.email}</span>. You will be downgraded to Admin. This action is reversible only by the new owner.
        </div>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
          >
            {loading ? <><Spinner className="mr-2 h-4 w-4" /> Transferring...</> : "Transfer Ownership"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
