import React from 'react';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/router';
import { Button } from './ui/core';
import { LayoutDashboard, LogOut, Server, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const Navbar = () => {
  const { user, login, logout } = useAuth();

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <ShieldCheck className="h-6 w-6 text-emerald-500" />
          <span>SysSentinel</span>
        </Link>
        <div className="flex gap-4">
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

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div className="h-screen flex items-center justify-center">Loading Sentinel...</div>;
  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 h-full w-64 border-r bg-card p-6 hidden md:block">
        <div className="flex items-center gap-2 font-bold text-xl mb-8">
          <ShieldCheck className="h-6 w-6 text-emerald-500" />
          SysSentinel
        </div>
        <div className="space-y-2">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LayoutDashboard className="h-4 w-4" /> Overview
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Server className="h-4 w-4" /> Instances
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-6 left-6">
          <div className="text-sm text-muted-foreground mb-2 truncate max-w-[200px]">{user.email}</div>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="w-full">Refresh</Button>
        </div>
      </aside>
      <main className="md:pl-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};