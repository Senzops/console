import { DashboardLayout } from '../../components/Layout';
import { ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
        <div className="h-24 w-24 bg-card rounded-full flex items-center content-center justify-center mb-6 border border-border shadow-lg p-2">
          <img src="/logo.png" alt="Logo" className="object-cover h-full w-full" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to SysSentinel</h2>
        <p className="max-w-md text-center">Select a server from the sidebar to view its telemetry, or click "Connect Server" to add a new instance.</p>
      </div>
    </DashboardLayout>
  );
}