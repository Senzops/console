import React, { useState } from 'react';
import { useAuth, api } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { useRouter } from 'next/router';
import { Button, Dialog, Avatar, Spinner } from './ui/core';
import { Plus, Copy, LogOut, Key, Server, Settings, Palette, Monitor, Globe } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
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
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="relative h-8 w-8 rounded-lg overflow-hidden">
            <img src="/logo.png" alt="Logo" className="object-cover h-full w-full" />
          </div>
          <span className="font-bold text-xl tracking-tight leading-none">Senzor</span>
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

// --- Dashboard Layout ---
export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, logout, token } = useAuth();
  const { theme, setTheme, appearance, setAppearance } = useTheme();
  const router = useRouter();

  // Fetch Data
  const { data: serverList, mutate: mutateServers } = useSWR(token ? '/vps/list' : null, fetcher);
  const { data: webList, mutate: mutateWeb } = useSWR(token ? '/web/list' : null, fetcher);

  // State
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isWebModalOpen, setIsWebModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newCreds, setNewCreds] = useState<{ vpsId?: string, webId?: string, apiKey?: string } | null>(null);

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4"><Spinner className="h-8 w-8 text-emerald-500" /><p className="text-sm text-muted-foreground animate-pulse">Authenticating...</p></div>;
  if (!user) { router.push('/'); return null; }

  const handleRegisterServer = async () => {
    if (!newName) return;
    try {
      const res = await api.post('/vps/register', { name: newName });
      setNewCreds(res.data);
      setNewName('');
      mutateServers();
    } catch (e) { console.error(e); }
  };

  const handleRegisterWeb = async () => {
    if (!newName || !newDomain) return;
    try {
      const res = await api.post('/web/register', { name: newName, domain: newDomain });
      setNewCreds(res.data); // Returns webId
      setNewName('');
      setNewDomain('');
      mutateWeb();
    } catch (e) { console.error(e); }
  };

  const closeModal = () => {
    setIsServerModalOpen(false);
    setIsWebModalOpen(false);
    setNewCreds(null);
    setNewName('');
    setNewDomain('');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex shrink-0 z-40">

        {/* Brand */}
        <div className="p-6 border-b shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl mb-0 tracking-tight hover:opacity-80 transition-opacity">
            <div className="relative h-8 w-8 rounded-lg overflow-hidden">
              <img src="/logo.png" alt="Logo" className="object-cover h-full w-full" />
            </div>
            <span>Senzor</span>
          </Link>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* SERVERS SECTION */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Servers</div>
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setIsServerModalOpen(true)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {!serverList && <div className="flex justify-center py-4"><Spinner className="h-4 w-4 text-muted-foreground" /></div>}

            {serverList?.map((server: any) => {
              const isActive = router.asPath.includes(`/server/${server._id}`);
              return (
                <Link href={`/dashboard/server/${server._id}`} key={server._id}>
                  <Button variant={isActive ? "secondary" : "ghost"} className={cn("w-full justify-start gap-2 mb-1 h-9", isActive && "bg-secondary/80 font-semibold border border-border/50")}>
                    <div className={`h-2 w-2 rounded-full shadow-[0_0_8px] shrink-0 ${server.status === 'online' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-destructive shadow-destructive/50'}`} />
                    <span className="truncate">{server.name}</span>
                  </Button>
                </Link>
              )
            })}
            {serverList?.length === 0 && <div className="px-2 text-[10px] text-muted-foreground">No servers connected.</div>}
          </div>

          {/* WEBSITES SECTION */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Websites</div>
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setIsWebModalOpen(true)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {!webList && <div className="flex justify-center py-4"><Spinner className="h-4 w-4 text-muted-foreground" /></div>}

            {webList?.map((site: any) => {
              const isActive = router.asPath.includes(`/web/${site._id}`);
              return (
                <Link href={`/dashboard/web/${site._id}`} key={site._id}>
                  <Button variant={isActive ? "secondary" : "ghost"} className={cn("w-full justify-start gap-2 mb-1 h-9", isActive && "bg-secondary/80 font-semibold border border-border/50")}>
                    <Globe className="h-3 w-3 text-blue-500 shrink-0" />
                    <span className="truncate">{site.name}</span>
                  </Button>
                </Link>
              )
            })}
            {webList?.length === 0 && <div className="px-2 text-[10px] text-muted-foreground">No websites tracked.</div>}
          </div>

          {/* Settings Button */}
          <div className="pt-4 border-t border-border/40">
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-9" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="h-4 w-4" /> Global Settings
            </Button>
          </div>
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

      {/* --- SETTINGS MODAL --- */}
      <Dialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Global Settings">
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2"><Palette className="h-4 w-4" /> Interface Theme</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="justify-start">Dark (Default)</Button>
              <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="justify-start">Light</Button>
              <Button variant={theme === 'nord' ? 'default' : 'outline'} onClick={() => setTheme('nord')} className="justify-start">Nord</Button>
              <Button variant={theme === 'latte' ? 'default' : 'outline'} onClick={() => setTheme('latte')} className="justify-start">Latte</Button>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2"><Monitor className="h-4 w-4" /> Data Visualization</h4>
            <div className="flex gap-2">
              <Button variant={appearance === 'colorful' ? 'default' : 'outline'} onClick={() => setAppearance('colorful')} className="flex-1">Colorful</Button>
              <Button variant={appearance === 'monochromatic' ? 'default' : 'outline'} onClick={() => setAppearance('monochromatic')} className="flex-1">Monochromatic</Button>
            </div>
            <p className="text-xs text-muted-foreground">Monochromatic mode forces all charts to use the theme's primary accent color for a cleaner look.</p>
          </div>
        </div>
      </Dialog>

      {/* --- SERVER MODAL --- */}
      <Dialog open={isServerModalOpen} onClose={closeModal} title="Connect New Server">
        {!newCreds ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Name</label>
              <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. Production DB 01" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleRegisterServer}>Generate Credentials</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Server className="h-3 w-3" /> Server ID</label>
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
                  export SERVER_ID="{newCreds.vpsId}" && export API_KEY="{newCreds.apiKey}" && curl -sL https://raw.githubusercontent.com/snzops/server-agent/main/install_agent.sh | sudo -E bash -
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => navigator.clipboard.writeText(`export SERVER_ID="${newCreds.vpsId}" && export API_KEY="${newCreds.apiKey}" && curl -sL https://raw.githubusercontent.com/snzops/server-agent/main/install_agent.sh | sudo -E bash -`)}
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

      {/* --- WEB MODAL --- */}
      <Dialog open={isWebModalOpen} onClose={closeModal} title="Track New Website">
        {!newCreds ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Website Name</label>
              <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. My Portfolio" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. senzor.dev" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleRegisterWeb}>Get Snippet</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Web ID</label>
              <div className="p-2 bg-muted rounded border text-sm font-mono truncate select-all">{newCreds.webId}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Add to your &lt;head&gt;</label>
              <div className="rounded-lg bg-black/80 p-4 border border-border/50 relative group">
                <p className="text-xs font-mono text-blue-300 break-all pr-8 leading-relaxed">
                  &lt;script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"&gt;&lt;/script&gt;<br />
                  &lt;script&gt;window.Senzor.init(&#123; webId: "{newCreds.webId}" &#125;)&lt;/script&gt;
                </p>
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => navigator.clipboard.writeText(`<script src="https://cdn.jsdelivr.net/gh/senzops/web-agent/dist/index.global.js"></script><script>window.Senzor.init({ webId: "${newCreds.webId}" })</script>`)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs p-3 rounded-md">
              Tip: You can also use our NPM package <code>@senzops/web</code> for React/Vue apps.
            </div>
            <Button className="w-full" onClick={closeModal}>Done</Button>
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