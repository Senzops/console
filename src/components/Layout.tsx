import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/router';
import { Button, Dialog, Avatar, Spinner } from './ui/core';
import { Plus, Copy, LogOut, Key, Server } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '../lib/auth';
import md5 from 'md5';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Helper for Gravatar
const getGravatar = (email: string) => `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=identicon`;

// --- 1. Public Navbar ---
export const Navbar = () => {
  const { user, login, logout } = useAuth();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="relative h-8 w-8 rounded-lg overflow-hidden shadow-lg border border-white/10">
            <img src="/logo.png" alt="Logo" className="object-cover h-full w-full" />
          </div>
          <span className="font-bold text-xl tracking-tight leading-none">SysSentinel</span>
        </Link>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Button onClick={logout} variant="outline">Sign Out</Button>
            </>
          ) : (
            <Button onClick={login}>Sign In</Button>
          )}
        </div>
      </div>
    </nav>
  );
};

// --- 2. Dashboard Layout (Sidebar System) ---
export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, logout, token } = useAuth();
  const router = useRouter();

  const { data: vpsList } = useSWR(token ? '/vps/list' : null, fetcher);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVpsName, setNewVpsName] = useState('');
  const [newCreds, setNewCreds] = useState<{ vpsId: string, apiKey: string } | null>(null);

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-sm text-muted-foreground animate-pulse">Authenticating...</p></div>;
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
    } catch (e) { console.error(e); }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewCreds(null);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex shrink-0 z-40">

        {/* Brand & Add */}
        <div className="p-6 border-b shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 font-bold text-xl mb-6 tracking-tight hover:opacity-80 transition-opacity">
            <div className="relative h-8 w-8 rounded-lg overflow-hidden border border-white/10">
              <img src="/logo.png" alt="Logo" className="object-cover h-full w-full" />
            </div>
            <span>SysSentinel</span>
          </Link>
          <Button onClick={() => setIsModalOpen(true)} className="w-full justify-start gap-2 shadow-emerald-500/20 shadow-lg items-center" variant="default">
            <Plus className="h-4 w-4" /> Connect Server
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider flex items-center justify-between">
            <span>Instances</span>
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-foreground">{vpsList?.length || 0}</span>
          </div>

          {!vpsList && <div className="flex justify-center py-4"><Spinner className="h-4 w-4 text-muted-foreground" /></div>}

          {vpsList?.map((vps: any) => {
            const isActive = router.asPath.includes(vps._id);
            return (
              <Link href={`/dashboard/${vps._id}`} key={vps._id}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-2 mb-1 items-center", isActive && "bg-secondary/80 font-semibold border border-border/50")}
                >
                  <div className={`h-2 w-2 rounded-full shadow-[0_0_8px] shrink-0 ${vps.status === 'online' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-destructive shadow-destructive/50'}`} />
                  <span className="truncate">{vps.name}</span>
                </Button>
              </Link>
            )
          })}
        </div>

        {/* Profile */}
        <div className="p-4 border-t bg-card/50 shrink-0">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-secondary/20">
            <Avatar src={getGravatar(user.email || '')} fallback={user.email?.substring(0, 2).toUpperCase() || 'US'} />
            <div className="flex flex-col overflow-hidden justify-center">
              <span className="text-sm font-medium truncate leading-tight">{user.displayName || 'Administrator'}</span>
              <span className="text-xs text-muted-foreground truncate leading-tight" title={user.email || ''}>{user.email}</span>
            </div>
          </div>
          <Button onClick={logout} variant="outline" size="sm" className="w-full gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors items-center">
            <LogOut className="h-3 w-3" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-background">
        {children}
      </main>

      {/* Modal */}
      <Dialog open={isModalOpen} onClose={closeModal} title="Connect New Server">
        {!newCreds ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Name</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. Production Database 01"
                value={newVpsName}
                onChange={(e) => setNewVpsName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Give your server a friendly name to identify it later.</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleRegister}>Generate Credentials</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Server className="h-3 w-3" /> VPS ID</label>
                <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">{newCreds.vpsId}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Key className="h-3 w-3" /> API Key</label>
                <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">{newCreds.apiKey}</div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Installation Command</label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <p className="text-xs font-mono text-emerald-400 break-all pr-8 leading-relaxed">
                  export VPS_ID="{newCreds.vpsId}" && export API_KEY="{newCreds.apiKey}" && curl -sL https://raw.githubusercontent.com/SysSentinel/agent-ts/dev/install_agent.sh | sudo -E bash -
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => navigator.clipboard.writeText(`export VPS_ID="${newCreds.vpsId}" && export API_KEY="${newCreds.apiKey}" && curl -sL https://raw.githubusercontent.com/SysSentinel/agent-ts/dev/install_agent.sh | sudo -E bash -`)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs p-3 rounded-md">
              <span className="font-bold">⚠ Important:</span>{" "}
              This API Key will only be shown once. Please keep this window open until installation is complete.
            </div>
            <Button className="w-full" onClick={closeModal}>I have completed installation</Button>
          </div>
        )}
      </Dialog>
    </div>
  );
};

// Helper for 'cn'
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}