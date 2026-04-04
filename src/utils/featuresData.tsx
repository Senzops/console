import React from "react";
import {
  Server,
  Globe,
  Activity,
  Code,
  Workflow,
  Database,
  Terminal,
  LayoutTemplate,
  BellRing,
  AlertOctagon,
  ChartNoAxesCombined,
  Bot,
  Zap,
  CheckCircle2,
  Search,
  Box,
  MousePointerClick,
  Layout,
  Layers,
} from "lucide-react";

// ============================================================================
// 1. ENTERPRISE DIAGRAM ABSTRACTIONS (Pure CSS/Tailwind)
// ============================================================================

// Reusable 3D Tilted Card Wrapper (Removed border-t-4)
const TiltedCard = ({ color, innerClassName = "", children }: any) => {
  const colorMap: Record<string, { back: string; front: string }> = {
    teal: {
      back: "from-teal-500/30 border-teal-500/30",
      front: "from-teal-500/10",
    },
    orange: {
      back: "from-orange-500/30 border-orange-500/30",
      front: "from-orange-500/10",
    },
    blue: {
      back: "from-blue-500/30 border-blue-500/30",
      front: "from-blue-500/10",
    },
    emerald: {
      back: "from-emerald-500/30 border-emerald-500/30",
      front: "from-emerald-500/10",
    },
    indigo: {
      back: "from-indigo-500/30 border-indigo-500/30",
      front: "from-indigo-500/10",
    },
    violet: {
      back: "from-violet-500/30 border-violet-500/30",
      front: "from-violet-500/10",
    },
    red: {
      back: "from-red-500/30 border-red-500/30",
      front: "from-red-500/10",
    },
    slate: {
      back: "from-slate-500/30 border-slate-500/30",
      front: "from-slate-500/10",
    },
    pink: {
      back: "from-pink-500/30 border-pink-500/30",
      front: "from-pink-500/10",
    },
    cyan: {
      back: "from-cyan-500/30 border-cyan-500/30",
      front: "from-cyan-500/10",
    },
    green: {
      back: "from-green-500/30 border-green-500/30",
      front: "from-green-500/10",
    },
    rose: {
      back: "from-rose-500/30 border-rose-500/30",
      front: "from-rose-500/10",
    },
    fuchsia: {
      back: "from-fuchsia-500/30 border-fuchsia-500/30",
      front: "from-fuchsia-500/10",
    },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="relative w-full h-full group z-10">
      {/* 3D Offset Back Layer */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${c.back} to-transparent rounded-xl transform rotate-3 translate-x-2 translate-y-3 border shadow-md transition-all duration-500 group-hover:rotate-6 group-hover:translate-x-4 group-hover:translate-y-5 -z-10`}
      />

      {/* Main Front Layer (Removed border-t-4) */}
      <div
        className={`w-full h-full bg-card border border-border/50 rounded-xl shadow-sm relative z-10 bg-gradient-to-br to-background flex flex-col ${c.front} ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
};

const VIEW_COLORS = [
  "bg-teal-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-rose-500",
];
const DiagramViews = () => (
  <TiltedCard color="teal" innerClassName="p-4 gap-3">
    <div className="flex-1 grid grid-cols-3 gap-3">
      <div className="col-span-2 row-span-2 bg-background border border-border/50 rounded-lg p-3 flex flex-col shadow-sm">
        <div className="w-24 bg-background text-muted-foreground rounded mb-4 p-1 text-xs">7day Traffic</div>
        <div className="flex-1 flex items-end gap-1.5 opacity-90">
          {[40, 70, 45, 90, 65, 80, 30].map((h, i) => (
            <div
              key={i}
              className={`flex-1 ${VIEW_COLORS[i]} rounded-t-sm transition-all`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <div className="col-span-1 bg-background border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center shadow-sm relative">
        <div className="relative w-16 h-16">
          <svg
            viewBox="0 0 36 36"
            className="w-full h-full stroke-teal-500 fill-transparent"
            strokeWidth="4"
            strokeDasharray="75 100"
            strokeLinecap="round"
          >
            <circle cx="18" cy="18" r="16" className="stroke-muted" />
            <circle cx="18" cy="18" r="16" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-teal-600 dark:text-teal-400">
            75%
          </div>
        </div>
      </div>
      <div className="col-span-1 bg-background border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center shadow-sm relative">
        <div className="relative w-16 h-16">
          <svg
            viewBox="0 0 36 36"
            className="w-full h-full stroke-red-500 fill-transparent"
            strokeWidth="4"
            strokeDasharray="30 100"
            strokeLinecap="round"
          >
            <circle cx="18" cy="18" r="16" className="stroke-muted" />
            <circle cx="18" cy="18" r="16" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-red-600 dark:text-red-400">
            30%
          </div>
        </div>
      </div>
    </div>
  </TiltedCard>
);

const DiagramApm = () => (
  <TiltedCard color="orange" innerClassName="p-4 gap-1.5 overflow-hidden">
    <div className="flex justify-between border-b border-border/40 pb-2 mb-2">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        Trace: a8f9c0e2...
      </span>
      <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400 font-bold">
        124.5ms
      </span>
    </div>
    <div className="relative h-5 w-full flex items-center">
      <div className="absolute left-0 h-4 w-full bg-blue-500/10 border border-blue-500/30 rounded-sm" />
      <span className="absolute left-2 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 truncate max-w-[90%]">
        GET /api/checkout/process_payment
      </span>
    </div>
    <div className="relative h-5 w-full flex items-center mt-1">
      <div className="absolute left-[10%] h-4 w-[25%] bg-orange-500/10 border border-orange-500/30 rounded-sm" />
      <span className="absolute left-[12%] text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 truncate max-w-[23%]">
        AUTH.validateToken
      </span>
    </div>
    <div className="relative h-5 w-full flex items-center mt-1">
      <div className="absolute left-[35%] h-4 w-[15%] bg-purple-500/10 border border-purple-500/30 rounded-sm" />
      <span className="absolute left-[37%] text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 truncate max-w-[13%]">
        CACHE.getSession
      </span>
    </div>
    <div className="relative h-5 w-full flex items-center mt-1">
      <div className="absolute left-[50%] h-4 w-[40%] bg-emerald-500/10 border border-emerald-500/30 rounded-sm" />
      <span className="absolute left-[52%] text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate max-w-[38%]">
        DB.query.users_and_preferences
      </span>
    </div>
    <div className="relative h-5 w-full flex items-center mt-1">
      <div className="absolute left-[55%] h-4 w-[15%] bg-blue-500/10 border border-blue-500/30 rounded-sm" />
      <span className="absolute left-[57%] text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 truncate max-w-[13%]">
        fetch(/stripe/charge)
      </span>
    </div>
    <div className="relative h-5 w-full flex items-center mt-1">
      <div className="absolute left-[70%] h-4 w-[10%] bg-indigo-500/10 border border-indigo-500/30 rounded-sm" />
      <span className="absolute left-[72%] text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[8%]">
        PUBLISH.topic
      </span>
    </div>
  </TiltedCard>
);

const DiagramOTel = () => (
  <TiltedCard
    color="blue"
    innerClassName="p-6 items-center justify-center relative overflow-hidden"
  >
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px]"></div>

    <div className="flex w-full items-center justify-between relative z-10 max-w-sm mx-auto">
      {/* Left Nodes */}
      <div className="flex flex-col gap-4">
        <div className="px-3 py-1.5 bg-background border border-border rounded-md text-[10px] font-mono font-bold shadow-sm flex items-center gap-2 hover:border-blue-500/50 transition-colors">
          <Box className="w-3 h-3 text-blue-500" /> Go Service
        </div>
        <div className="px-3 py-1.5 bg-background border border-border rounded-md text-[10px] font-mono font-bold shadow-sm flex items-center gap-2 hover:border-orange-500/50 transition-colors">
          <Box className="w-3 h-3 text-orange-500" /> Java Service
        </div>
        <div className="px-3 py-1.5 bg-background border border-border rounded-md text-[10px] font-mono font-bold shadow-sm flex items-center gap-2 hover:border-yellow-500/50 transition-colors">
          <Box className="w-3 h-3 text-yellow-500" /> Python Worker
        </div>
      </div>

      {/* Lines */}
      <div className="flex-1 flex flex-col justify-center items-center opacity-40">
        <svg
          className="w-full h-24 text-blue-500"
          preserveAspectRatio="none"
          viewBox="0 0 100 96"
        >
          <path
            d="M0,20 Q50,48 100,48"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M0,48 L100,48"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M0,76 Q50,48 100,48"
            stroke="currentColor"
            fill="none"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        </svg>
      </div>

      {/* Right Node (Ingestion) */}
      <div className="px-4 py-3 bg-blue-600 border border-blue-500 rounded-lg shadow-lg shadow-blue-500/20 flex flex-col items-center gap-1 text-white">
        <Activity className="w-5 h-5 text-white" />
        <span className="text-[10px] font-bold tracking-wider">
          OTLP INGEST
        </span>
      </div>
    </div>
  </TiltedCard>
);

const DiagramInfra = () => (
  <TiltedCard color="emerald" innerClassName="p-5 gap-5">
    <div className="flex justify-between items-center border-b border-border/40 pb-3">
      <div className="flex items-center gap-2">
        <Server className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-bold font-mono">prod-database-01</span>
      </div>
      <div className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
        ONLINE
      </div>
    </div>
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>CPU Load</span>
        <span className="text-orange-500 font-bold">82%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-orange-500 w-[82%]" />
      </div>
    </div>
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>Memory (RAM)</span>
        <span className="text-blue-500 font-bold">45%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 w-[45%]" />
      </div>
    </div>
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>Disk I/O</span>
        <span className="text-emerald-500 font-bold">15 MB/s</span>
      </div>
      <div className="h-6 w-full bg-emerald-500/10 rounded-md relative overflow-hidden border border-emerald-500/20">
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 24"
        >
          <path
            d="M0,24 L20,15 L40,20 L60,5 L80,18 L100,10 L100,24 Z"
            fill="hsl(var(--emerald-500))"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  </TiltedCard>
);

const DiagramDatabase = () => (
  <TiltedCard color="indigo" innerClassName="p-5">
    <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
        Query Latency (ms)
      </span>
      <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
        Last 1h
      </span>
    </div>
    <div className="flex-1 flex items-end gap-2 px-2">
      {[12, 15, 14, 45, 80, 22, 14, 13, 15, 12, 110, 14, 12].map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm transition-all ${h > 50 ? "bg-orange-500" : "bg-indigo-500"}`}
          style={{ height: `${Math.min(h, 100)}%` }}
        />
      ))}
    </div>
    <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-3 border-t border-border/40 pt-2">
      <span className="text-indigo-600 dark:text-indigo-400">Avg: 24ms</span>
      <span className="text-orange-500">Max: 110ms</span>
    </div>
  </TiltedCard>
);

const DiagramTasks = () => (
  <TiltedCard
    color="violet"
    innerClassName="p-6 justify-center gap-6 relative overflow-hidden"
  >
    <div className="flex items-center justify-between w-full max-w-sm mx-auto relative z-10">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-lg border border-border bg-background shadow-sm flex items-center justify-center">
          <Layers className="w-5 h-5 text-muted-foreground" />
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase">
          Queue
        </span>
      </div>
      <div className="flex-1 h-px bg-border relative">
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-t border-r border-border" />
      </div>

      {/* Accent Worker Node */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-xl border border-violet-500 bg-violet-600 shadow-lg shadow-violet-500/20 flex items-center justify-center z-10">
          <Workflow className="w-6 h-6 text-white" />
        </div>
        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase">
          Worker Node
        </span>
      </div>

      <div className="flex-1 h-px bg-emerald-500/50 relative">
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-t border-r border-emerald-500/50" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
        <span className="text-[10px] font-bold text-emerald-500 uppercase">
          Success
        </span>
      </div>
    </div>
    <div className="w-full max-w-sm mx-auto flex justify-between px-3 py-2 text-[10px] font-mono text-muted-foreground bg-background border border-border/50 shadow-sm rounded-md">
      <span>
        Depth: <span className="text-foreground font-bold">42</span>
      </span>
      <span>
        Delay: <span className="text-foreground font-bold">1.2s</span>
      </span>
      <span className="text-emerald-500 font-bold">99.9% OK</span>
    </div>
  </TiltedCard>
);

const DiagramErrors = () => (
  <TiltedCard color="red" innerClassName="!p-0 overflow-hidden">
    <div className="bg-red-500/10 p-4 border-b border-red-500/20 flex flex-col gap-1.5 shrink-0">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 shadow-sm">
          TypeError
        </span>
        <span className="text-[10px] text-red-600/70 dark:text-red-400/70 font-mono bg-red-500/5 px-2 py-0.5 rounded">
          14 occurrences
        </span>
      </div>
      <span className="text-sm text-foreground font-medium truncate mt-1 px-1">
        Cannot read properties of undefined (reading 'id')
      </span>
    </div>
    <div className="p-4 bg-[#0d1117] flex-1 overflow-hidden border-t border-black/20">
      <div className="text-[11px] font-mono leading-loose">
        <div className="text-[#8b949e]">
          at <span className="text-[#d2a8ff]">processData</span>{" "}
          (/src/services/data.ts:<span className="text-[#79c0ff]">42</span>:
          <span className="text-[#79c0ff]">15</span>)
        </div>
        <div className="text-[#ff7b72] font-bold bg-[#ff7b72]/10 px-1 -mx-1 rounded border-l-2 border-[#ff7b72]">
          at <span className="text-[#d2a8ff]">UserController.get</span>{" "}
          (/src/controllers/user.ts:<span className="text-[#79c0ff]">18</span>:
          <span className="text-[#79c0ff]">22</span>)
        </div>
        <div className="text-[#8b949e]">
          at <span className="text-[#d2a8ff]">Layer.handle</span>{" "}
          (/node_modules/express/lib/router/layer.js:
          <span className="text-[#79c0ff]">95</span>:
          <span className="text-[#79c0ff]">5</span>)
        </div>
        <div className="text-[#8b949e] opacity-50">
          at next (/node_modules/express/lib/router/route.js:144:13)
        </div>
      </div>
    </div>
  </TiltedCard>
);

const DiagramLogs = () => (
  <TiltedCard color="slate" innerClassName="!p-0 overflow-hidden !bg-[#0d1117]">
    <div className="h-10 border-b border-white/10 px-4 flex items-center justify-between bg-[#161b22] shrink-0">
      <div className="text-[11px] text-[#8b949e] font-mono flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-[#79c0ff]" /> level:error OR
        level:warn
      </div>
      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold tracking-wider border border-emerald-500/30">
        LIVE TAIL
      </span>
    </div>
    <div className="p-4 flex flex-col gap-2.5 flex-1 font-mono text-[11px]">
      <div className="text-[#8b949e]">
        <span className="text-[#79c0ff] mr-3">10:42:01.001</span>
        <span className="text-[#3fb950] w-12 inline-block font-bold">
          INFO
        </span>{" "}
        User session validated
      </div>
      <div className="text-[#8b949e]">
        <span className="text-[#79c0ff] mr-3">10:42:05.421</span>
        <span className="text-[#d2a8ff] w-12 inline-block font-bold">
          WARN
        </span>{" "}
        High latency detected on upstream API
      </div>
      <div className="text-[#c9d1d9] bg-[#f85149]/10 -mx-4 px-4 py-1 border-l-2 border-[#f85149]">
        <span className="text-[#79c0ff] mr-3">10:42:09.912</span>
        <span className="text-[#f85149] font-bold w-12 inline-block">
          ERROR
        </span>{" "}
        Database connection timeout on primary cluster
      </div>
      <div className="text-[#8b949e]">
        <span className="text-[#79c0ff] mr-3">10:42:11.001</span>
        <span className="text-[#3fb950] w-12 inline-block font-bold">
          INFO
        </span>{" "}
        Connection pool rebuilt
      </div>
    </div>
  </TiltedCard>
);

const DiagramRum = () => (
  <TiltedCard color="pink" innerClassName="!p-0 overflow-hidden">
    <div className="h-8 bg-muted/40 border-b border-border/40 flex items-center px-3 gap-1.5 shrink-0">
      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
    </div>
    <div className="p-4 flex-1 grid grid-cols-2 gap-3">
      <div className="bg-card shadow-sm rounded-lg border border-border/50 p-2 text-center flex flex-col justify-center">
        <span className="text-[9px] text-muted-foreground font-bold">LCP</span>
        <span className="text-lg font-bold text-emerald-500">1.2s</span>
      </div>
      <div className="bg-card shadow-sm rounded-lg border border-border/50 p-2 text-center flex flex-col justify-center">
        <span className="text-[9px] text-muted-foreground font-bold">CLS</span>
        <span className="text-lg font-bold text-yellow-500">0.14</span>
      </div>
      <div className="col-span-2 bg-red-500/10 rounded-lg border border-red-500/30 p-2 flex items-center justify-center gap-2">
        <div className="flex flex-col items-center justify-center min-w-0">
          <span className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase">
            JS Exception
          </span>
          <span className="text-[10px] font-mono text-red-600/80 dark:text-red-400/80 truncate">
            TypeError: Cannot read properties
          </span>
        </div>
      </div>
    </div>
  </TiltedCard>
);

const DiagramWeb = () => (
  <TiltedCard color="cyan" innerClassName="p-5 gap-5">
    <div className="flex gap-4">
      <div className="flex-1 bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 shadow-sm">
        <div className="text-[10px] text-cyan-700 dark:text-cyan-400 uppercase tracking-widest font-bold mb-1">
          Unique Visitors
        </div>
        <div className="text-2xl font-bold text-foreground">12.4k</div>
      </div>
      <div className="flex-1 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 shadow-sm">
        <div className="text-[10px] text-blue-700 dark:text-blue-400 uppercase tracking-widest font-bold mb-1">
          Pageviews
        </div>
        <div className="text-2xl font-bold text-foreground">45.2k</div>
      </div>
    </div>
    <div className="flex-1 border rounded-md border-cyan-500/30 relative ml-2 mb-2">
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 60"
      >
        <defs>
          <linearGradient id="webGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d="M0,60 L0,40 L20,35 L40,45 L60,25 L80,30 L100,10 L100,60 Z"
          fill="url(#webGrad)"
        />
        <path
          d="M0,40 L20,35 L40,45 L60,25 L80,30 L100,10"
          stroke="#06b6d4"
          strokeWidth="0.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  </TiltedCard>
);

const DiagramUptime = () => (
  <TiltedCard color="green" innerClassName="p-6 justify-center gap-6">
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold font-mono text-foreground">
        api.production.com
      </span>
      <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/20 font-bold shadow-sm">
        99.9% UPTIME
      </span>
    </div>
    <div className="flex items-center gap-1 h-8 bg-card border border-border/40 p-1 rounded-md shadow-inner">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm h-full ${i === 22 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10 relative" : "bg-emerald-500/80 hover:bg-emerald-500"}`}
        />
      ))}
    </div>
    <div className="flex justify-between text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
      <span>24 hours ago</span>
      <span>Now</span>
    </div>
  </TiltedCard>
);

const DiagramAlerts = () => (
  <TiltedCard
    color="rose"
    innerClassName="p-5 justify-center gap-4 relative overflow-hidden"
  >
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex flex-col gap-2 relative z-10 shadow-md mx-auto w-full max-w-sm">
      <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
        <BellRing className="w-3 h-3" /> Evaluation Rule
      </div>
      <div className="font-mono text-xs text-foreground">
        COUNT (status == 500){" "}
        <span className="text-rose-500 font-bold">{">"} 50</span>
      </div>
      <div className="text-[10px] text-muted-foreground font-mono bg-background/50 w-fit px-1.5 py-0.5 rounded">
        in the last 5 minutes
      </div>
    </div>

    <div className="flex justify-center my-1 relative z-0">
      <div className="h-8 w-0 border-l-2 border-dashed border-rose-500/50 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-background border border-rose-500/50 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full absolute" />
        </div>
      </div>
    </div>

    <div className="flex justify-center gap-4 relative z-10">
      <div className="bg-card border border-border/60 shadow-sm rounded-lg p-2.5 flex items-center gap-2">
        <div className="p-1.5 bg-blue-500/10 rounded">
          <Globe className="w-4 h-4 text-blue-500" />
        </div>
        <span className="text-xs font-bold text-foreground">Slack</span>
      </div>
      <div className="bg-card border border-border/60 shadow-sm rounded-lg p-2.5 flex items-center gap-2">
        <div className="p-1.5 bg-orange-500/10 rounded">
          <Terminal className="w-4 h-4 text-orange-500" />
        </div>
        <span className="text-xs font-bold text-foreground">Webhook</span>
      </div>
    </div>
  </TiltedCard>
);

const DiagramMcp = () => (
  <TiltedCard
    color="fuchsia"
    innerClassName="items-center justify-center relative overflow-hidden"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--fuchsia-500)/0.05)_0%,transparent_70%)]" />

    {/* Corrected: Removed absolute, letting flex naturally center the main node */}
    <div className="relative w-48 h-48 border border-fuchsia-500/20 rounded-full flex items-center justify-center border-dashed">
      <div className="w-32 h-32 border border-fuchsia-500/30 rounded-full flex items-center justify-center">
        <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-600 to-indigo-600 border border-indigo-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 z-10">
          <Bot className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>

    {/* Orbiting Nodes (Absolute positioned against the TiltedCard wrapper) */}
    <div className="absolute top-[15%] left-[20%] bg-card border border-border/60 shadow-sm p-1.5 rounded-md">
      <Database className="w-3.5 h-3.5 text-blue-500" />
    </div>
    <div className="absolute bottom-[20%] left-[15%] bg-card border border-border/60 shadow-sm p-1.5 rounded-md">
      <Server className="w-3.5 h-3.5 text-emerald-500" />
    </div>
    <div className="absolute top-[10%] right-[25%] bg-card border border-border/60 shadow-sm p-1.5 rounded-md">
      <Globe className="w-3.5 h-3.5 text-pink-500" />
    </div>
    <div className="absolute bottom-[15%] right-[20%] bg-card border border-border/60 shadow-sm p-1.5 rounded-md">
      <Workflow className="w-3.5 h-3.5 text-indigo-500" />
    </div>
    <div className="absolute top-[40%] left-[8%] bg-card border border-border/60 shadow-sm p-1.5 rounded-md">
      <Code className="w-3.5 h-3.5 text-orange-500" />
    </div>
    <div className="absolute top-[45%] right-[8%] bg-card border border-border/60 shadow-sm p-1.5 rounded-md">
      <LayoutTemplate className="w-3.5 h-3.5 text-teal-500" />
    </div>
    <div className="absolute bottom-[40%] right-[28%] bg-card border border-border/60 shadow-sm p-1.5 rounded-md">
      <BellRing className="w-3.5 h-3.5 text-destructive" />
    </div>
    <div className="absolute bottom-[35%] left-[28%] bg-card border border-border/60 shadow-sm p-1.5 rounded-md">
      <Terminal className="w-3.5 h-3.5 text-yellow-500" />
    </div>
  </TiltedCard>
);

export const renderDiagram = (id: string) => {
  switch (id) {
    case "views":
      return <DiagramViews />;
    case "infra":
      return <DiagramInfra />;
    case "database":
      return <DiagramDatabase />;
    case "web":
      return <DiagramWeb />;
    case "rum":
      return <DiagramRum />;
    case "apm":
      return <DiagramApm />;
    case "otel":
      return <DiagramOTel />;
    case "tasks":
      return <DiagramTasks />;
    case "errors":
      return <DiagramErrors />;
    case "logs":
      return <DiagramLogs />;
    case "mcp":
      return <DiagramMcp />;
    case "alerts":
      return <DiagramAlerts />;
    case "uptime":
      return <DiagramUptime />;
    default:
      return (
        <div className="w-full h-full bg-muted/20 border border-border/50 rounded-xl flex items-center justify-center">
          <Box className="w-6 h-6 text-muted-foreground opacity-30" />
        </div>
      );
  }
};

// ============================================================================
// 2. FEATURE DATA DEFINITIONS
// ============================================================================
export const FEATURES_DATA = [
  {
    id: "views",
    title: "Saved Views & Dashboards",
    subtitle: "Your operational data, perfectly organized.",
    description:
      "Construct bespoke control panels by aggregating metrics, logs, and traces across your entire stack. Drag, drop, and resize visualizations in a unified canvas.",
    points: [
      "Cross-service data aggregation",
      "Interactive time-series and categorical charts",
      "Native Safe MQL filtering engine",
      "Strict tenant data isolation",
    ],
    diagramId: "views",
    href: "/features/views",
    colorClasses: "text-teal-500 bg-teal-500/10 border-teal-500/20",
  },
  {
    id: "apm",
    title: "Application Performance Monitoring",
    subtitle: "Trace requests across distributed architectures.",
    description:
      "Follow every request as it traverses your microservices. Identify latency bottlenecks, analyze upstream dependencies, and optimize your backend logic.",
    points: [
      "Zero-configuration distributed tracing",
      "End-to-end trace waterfall visualizations",
      "Automatic framework instrumentation",
      "Database and external API profiling",
    ],
    diagramId: "apm",
    href: "/features/apm",
    colorClasses: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  },
  {
    id: "opentelemetry",
    title: "Native OpenTelemetry Support",
    subtitle: "Vendor-neutral telemetry ingestion.",
    description:
      "Stream traces and metrics directly from your Go, Java, Python, or Rust applications without proprietary agents. We natively translate OTLP payloads into our specialized dashboard schemas.",
    points: [
      "OTLP HTTP compatible endpoints",
      "Automatic trace and log translation",
      "Zero-config APM & Task monitoring",
      "Standard Semantic Conventions support",
    ],
    diagramId: "otel",
    href: "/features/opentelemetry",
    colorClasses: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "server",
    title: "Infrastructure Monitoring",
    subtitle: "Complete visibility into your compute fleet.",
    description:
      "Track the health of your servers, containers, and virtual machines. Monitor CPU, memory, disk I/O, and network throughput with high-fidelity, low-footprint agents.",
    points: [
      "Real-time CPU and Memory utilization",
      "Storage and Disk I/O analytics",
      "Per-process resource tracking",
      "Secure, outbound-only telemetry",
    ],
    diagramId: "infra",
    href: "/features/server",
    colorClasses: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "database",
    title: "Database Observability",
    subtitle: "Optimize your persistent storage layer.",
    description:
      "Uncover slow queries, monitor connection pools, and track operations per second. Gain deep insights into how your applications interact with your databases.",
    points: [
      "Query latency profiling",
      "Active connection monitoring",
      "Throughput and operations mapping",
      "Support for MongoDB & Redis",
    ],
    diagramId: "database",
    href: "/features/database",
    colorClasses: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "tasks",
    title: "Background Task Monitoring",
    subtitle: "Secure your asynchronous workloads.",
    description:
      "Ensure your queues, cron jobs, and background workers are operating reliably. Track execution times, monitor failure rates, and analyze retry behaviors.",
    points: [
      "Queue depth and processing latency",
      "Job failure and retry analytics",
      "Worker node health tracking",
      "Dead-letter queue detection",
    ],
    diagramId: "tasks",
    href: "/features/tasks",
    colorClasses: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  },
  {
    id: "errors",
    title: "Global Error Tracking",
    subtitle: "Catch exceptions before your users do.",
    description:
      "Automatically capture, fingerprint, and group unhandled exceptions across your entire stack. View full stack traces and contextual environment data.",
    points: [
      "Intelligent error fingerprinting",
      "Full stack trace terminal capture",
      "Cross-service impact analysis",
      "Resolution state tracking",
    ],
    diagramId: "errors",
    href: "/features/errors",
    colorClasses: "text-red-500 bg-red-500/10 border-red-500/20",
  },
  {
    id: "logs",
    title: "Centralized Log Management",
    subtitle: "Search millions of logs in milliseconds.",
    description:
      "Aggregate logs from every service and server into a single, searchable stream. Use our powerful query engine to filter by severity, trace context, or custom attributes.",
    points: [
      "High-throughput log ingestion",
      "Advanced filtering engine (MQL)",
      "Automatic trace correlation",
      "Live-tail streaming capability",
    ],
    diagramId: "logs",
    href: "/features/logs",
    colorClasses: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  },
  {
    id: "rum",
    title: "Real User Monitoring (RUM)",
    subtitle: "Measure exactly what your users experience.",
    description:
      "Capture client-side performance bottlenecks. Monitor Core Web Vitals, network call latency, and frontend JavaScript exceptions directly from the browser.",
    points: [
      "Core Web Vitals (LCP, FID, CLS)",
      "Global geographic latency mapping",
      "Frontend JavaScript error tracking",
      "Rage click & UX frustration metrics",
    ],
    diagramId: "rum",
    href: "/features/rum",
    colorClasses: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  },
  {
    id: "web-analytics",
    title: "Web Analytics",
    subtitle: "Privacy-first traffic insights.",
    description:
      "Understand your audience without compromising their privacy. Track page views, unique visitors, referrers, and geographic distribution with zero cookies.",
    points: [
      "Cookie-less, GDPR-compliant tracking",
      "Real-time visitor analytics",
      "Geographic and device breakdowns",
      "Referrer and acquisition mapping",
    ],
    diagramId: "web",
    href: "/features/web-analytics",
    colorClasses: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "uptime",
    title: "Uptime Monitoring",
    subtitle: "Verify external availability.",
    description:
      "Continuously verify that your APIs and web properties are accessible from the outside world. Track response times globally.",
    points: [
      "High-frequency synthetic checks",
      "Global latency tracking",
      "Endpoint health validation",
      "Downtime incident recording",
    ],
    diagramId: "uptime",
    href: "/features/uptime",
    colorClasses: "text-green-500 bg-green-500/10 border-green-500/20",
  },
  {
    id: "alerts",
    title: "Alerts & Incident Routing",
    subtitle: "Know immediately when things break.",
    description:
      "Define complex alert policies across all your telemetry streams. Route critical incidents to your team via Webhooks, Slack, or Email before customers notice.",
    points: [
      "Multi-condition threshold evaluation",
      "Cross-channel notification routing",
      "Incident lifecycle management",
      "MQL-based custom alert triggers",
    ],
    diagramId: "alerts",
    href: "/features/alerts",
    colorClasses: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "mcp",
    title: "MCP Server",
    subtitle: "AI-driven operational intelligence.",
    description:
      "Seamlessly integrate your telemetry data with advanced Large Language Models. Use the Model Context Protocol to query, summarize, and analyze incidents using natural language.",
    points: [
      "Secure Model Context Protocol integration",
      "Natural language telemetry querying",
      "Automated incident summarization",
      "Granular API key access controls",
    ],
    diagramId: "mcp",
    href: "/features/mcp",
    colorClasses: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20",
  },
];
