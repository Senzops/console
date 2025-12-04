import { Navbar } from '../components/Layout';
import { Button } from '../components/ui/core';
import { Shield, Zap, Activity, Lock } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-background to-secondary/20">
        <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-500 mb-8">
          v1.0 Now Available
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mb-6">
          Server Monitoring for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Security Conscious</span>.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-8">
          A lightweight, secure, and robust telemetry system for your VPS infrastructure.
          Monitor CPU, Docker, and Network stats in real-time.
        </p>
        <div className="flex gap-4">
          <Link href="/dashboard">
            <Button size="lg" className="h-12 px-8 text-base">Get Started</Button>
          </Link>
          <Button variant="outline" size="lg" className="h-12 px-8 text-base">Documentation</Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24 grid md:grid-cols-3 gap-8">
        {[
          { icon: Zap, title: "Real-time Telemetry", desc: "Granular updates on CPU, RAM, and Disk I/O every 60 seconds." },
          { icon: Lock, title: "Zero Trust Security", desc: "Agent pushes data outbound. No firewall ports to open. Secure by default." },
          { icon: Activity, title: "Docker Native", desc: "First-class support for Docker container stats and health monitoring." },
        ].map((f, i) => (
          <div key={i} className="p-6 rounded-xl border bg-card/50 hover:bg-card transition-colors">
            <f.icon className="h-10 w-10 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
            <p className="text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}