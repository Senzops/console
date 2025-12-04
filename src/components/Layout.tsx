import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/router';
import { Button, Dialog, Avatar, Badge } from './ui/core';
import { LayoutDashboard, LogOut, Server, ShieldCheck, Plus, Check, Copy } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '../lib/auth';
import md5 from 'md5';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Helper for Gravatar
const getGravatar = (email: string) => `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=mp`;

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { data: vpsList, mutate } = useSWR(user ? '/vps/list' : null, fetcher);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVpsName, setNewVpsName] = useState('');
  const [newCreds, setNewCreds] = useState<{ vpsId: string, apiKey: string } | null>(null);

  if (loading) return <div className="h-screen flex items-center justify-center bg-background text-foreground">Initializing Sentinel...</div>;
  if (!user) {
    router.push('/');
    return null;
  }

  const handleRegister = async () => {
    if (!newVpsName) return;
    try {
      const res = await api.post('/vps/register', { name: newVpsName });
      setNewCreds(res.data);
      setNewVpsName('');
      mutate();
    } catch (e) { console.error(e) };
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewCreds(null);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* --- SIDEBAR --- */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex shrink-0">

        {/* 1. Fixed Top: Brand & Add */}
        <div className="p-6 border-b shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl mb-6 tracking-tight">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            SysSentinel
          </Link>
          <Button onClick={() => setIsModalOpen(true)} className="w-full justify-start gap-2" variant="default">
            <Plus className="h-4 w-4" /> Connect Server
          </Button>
        </div>

        {/* 2. Scrollable Middle: VPS List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Your Instances</div>
          {vpsList?.map((vps: any) => {
            const isActive = router.asPath.includes(vps._id);
            return (
              <Link href={`/dashboard/${vps._id}`} key={vps._id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-2 mb-1", isActive && "bg-secondary/50 font-semibold")}
                >
                  <div className={`h-2 w-2 rounded-full ${vps.status === 'online' ? 'bg-emerald-500' : 'bg-destructive'}`} />
                  <span className="truncate">{vps.name}</span>
                </Button>
              </Link>
            )
          })}
          {vpsList?.length === 0 && <div className="px-2 text-sm text-muted-foreground">No servers found.</div>}
        </div>

        {/* 3. Fixed Bottom: User Profile */}
        <div className="p-4 border-t bg-card/50 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <Avatar src={getGravatar(user.email || '')} fallback={user.email?.substring(0, 2) || 'US'} />
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.displayName || 'User'}</span>
              <span className="text-xs text-muted-foreground truncate" title={user.email || ''}>{user.email}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3 px-1">
            <div>Last Login:</div>
            <div className="text-right">{new Date(user.metadata.lastSignInTime || '').toLocaleDateString()}</div>
          </div>
          <Button onClick={logout} variant="outline" size="sm" className="w-full gap-2">
            <LogOut className="h-3 w-3" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>

      {/* --- REGISTRATION MODAL --- */}
      <Dialog open={isModalOpen} onClose={closeModal} title="Connect New Server">
        {!newCreds ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. Production Database"
                value={newVpsName}
                onChange={(e) => setNewVpsName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleRegister}>Create & Get Script</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 border relative group">
              <p className="text-sm font-mono text-emerald-500 break-all pr-8">
                export VPS_ID="{newCreds.vpsId}" && export API_KEY="{newCreds.apiKey}" && curl -sL https://raw.githubusercontent.com/SysSentinel/agent-ts/dev/install_agent.sh | sudo -E bash -
              </p>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => navigator.clipboard.writeText(`export VPS_ID="${newCreds.vpsId}" && export API_KEY="${newCreds.apiKey}" && curl -sL https://raw.githubusercontent.com/SysSentinel/agent-ts/dev/install_agent.sh | sudo -E bash -`)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="bg-yellow-500/10 text-yellow-500 text-xs p-3 rounded-md">
              Warning: This API Key will only be shown once. Please install the agent now.
            </div>
            <Button className="w-full" onClick={closeModal}>I have installed the agent</Button>
          </div>
        )}
      </Dialog>
    </div>
  );
};

// Helper for 'cn' since we used it in the component
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}