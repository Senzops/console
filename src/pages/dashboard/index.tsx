import { DashboardLayout } from '../../components/Layout';
import { ShieldCheck, Server, Cpu, Activity } from 'lucide-react';
import useSWR from 'swr';
import { api, useAuth } from '../../lib/auth';
import Link from 'next/link';
import { Badge, Spinner } from '../../components/ui/core';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Hexagon CSS Clip Path
const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

export default function Dashboard() {
  const { token } = useAuth();
  const { data: vpsList } = useSWR(token ? '/vps/list' : null, fetcher);

  if (!vpsList) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <Spinner className="h-8 w-8 text-emerald-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (vpsList.length === 0) {
    return (
      <DashboardLayout>
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
          <div className="h-24 w-24 bg-card rounded-full flex items-center content-center justify-center mb-6 border border-border shadow-lg p-2">
            <img src="/logo.png" alt="Logo" className="object-cover h-full w-full" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to SysSentinel</h2>
          <p className="max-w-md text-center">Select "Connect Server" from the sidebar to start monitoring your infrastructure.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-full flex flex-col items-center p-12 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-16 tracking-tight flex items-center gap-3">
          Global Infrastructure Hive
        </h1>

        {/* Beehive Grid Container */}
        {/* We use negative margins (-mx-3) to pull hexagons closer horizontally */}
        <div className="flex flex-wrap justify-center gap-y-4 px-8 max-w-7xl">
          {vpsList.map((vps: any) => (
            <Link
              href={`/dashboard/${vps._id}`}
              key={vps._id}
              className="relative group transition-transform hover:z-20 duration-300 -mx-3 even:mt-16 even:z-20"
            >
              {/* Hexagon Shape - Medium Size */}
              <div
                className="w-[190px] h-[220px] bg-card transition-all flex flex-col items-center justify-center p-6 text-center shadow-lg relative group-hover:scale-105 duration-300"
                style={{
                  clipPath: HEX_CLIP,
                }}
              >
                {/* Hexagon Border Hack (Inset Shadow for depth) */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/10 pointer-events-none" />

                {/* Status Indicator Ring */}
                <div className={`mb-3 p-3 rounded-full transition-colors ${vps.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                  <Server className="h-6 w-6" />
                </div>

                <h3 className="font-bold text-sm mb-1 truncate w-full px-2 leading-tight">{vps.name}</h3>

                <div className="text-[10px] text-muted-foreground font-mono mb-3 flex items-center gap-1 justify-center opacity-70">
                  <Cpu className="h-3 w-3" /> {vps.metadata?.os?.split(' ')[0] || 'Linux'}
                </div>

                <Badge variant={vps.status === 'online' ? 'success' : 'destructive'} className="px-2 py-0 text-[10px]">
                  {vps.status === 'online' ? 'ONLINE' : 'OFFLINE'}
                </Badge>

                {/* Hover Info (Overlay) */}
                <div className="absolute inset-0 flex items-center justify-center bg-muted/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10">
                  <div className="text-xs text-foreground font-medium">
                    View Metrics
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}