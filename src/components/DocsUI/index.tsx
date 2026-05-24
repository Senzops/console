import React, { useState, useRef } from "react";
import { Copy, Check, Terminal, AlertTriangle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { InstallationSnippet } from "../../static/docsData";
import { cn } from "../Core";

// --- TYPOGRAPHY ---
export const DocHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="mb-10 pb-6 border-b border-border/40">
    <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-foreground mb-4">
      {title}
    </h1>
    <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
      {description}
    </p>
  </div>
);

export const DocSection = ({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn("mb-12", className)}>
    <h2 className="text-2xl font-bold font-display tracking-tight text-foreground mb-6 border-b border-border/40 pb-2">
      {title}
    </h2>
    {children}
  </section>
);

// --- CODE TABS (MULTI-FRAMEWORK) ---
export const CodeTabs = ({ snippets }: { snippets: InstallationSnippet[] }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const showArrows = snippets.length > 3;

  const activeSnippet = snippets[activeIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsRef.current) return;
    tabsRef.current.scrollBy({ left: direction === "left" ? -160 : 160, behavior: "smooth" });
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border/60 shadow-sm my-6 bg-[#0d1117]">
      {/* Tabs Header */}
      {snippets.length > 1 && (
        <div className="relative flex items-center bg-white/5">
          {showArrows && (
            <button
              onClick={() => scrollTabs("left")}
              className="absolute left-0 z-10 h-full px-1.5 bg-gradient-to-r from-[#0d1117] via-[#0d1117]/80 to-transparent text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <div
            ref={tabsRef}
            className={cn(
              "flex items-center overflow-x-auto border-b border-white/10 no-scrollbar w-full",
              showArrows && "px-6",
            )}
          >
            {snippets.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                  activeIdx === idx
                    ? "border-emerald-500 text-emerald-400 bg-white/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5",
                )}
              >
                {s.framework}
              </button>
            ))}
          </div>
          {showArrows && (
            <button
              onClick={() => scrollTabs("right")}
              className="absolute right-0 z-10 h-full px-1.5 bg-gradient-to-l from-[#0d1117] via-[#0d1117]/80 to-transparent text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Code Editor Body */}
      <div className="relative group">
        <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-slate-300">
          <code>{activeSnippet.code}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 rounded-lg bg-white/10 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-white/20 hover:text-white transition-all border border-white/10"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Snippet Notes */}
      {activeSnippet.notes && (
        <div className="bg-emerald-500/10 border-t border-emerald-500/20 px-4 py-3 text-xs text-emerald-200/90 flex items-start gap-2">
          <Terminal className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />
          <p className="leading-relaxed">{activeSnippet.notes}</p>
        </div>
      )}
    </div>
  );
};

// --- VISUAL STEP LIST ---
export const StepList = ({
  steps,
}: {
  steps: { title: string; description: string }[];
}) => (
  <div className="ml-2 py-4">
    {steps.map((step, idx) => (
      <div key={idx} className="relative pl-8 pb-8 last:pb-0">
        {/* Vertical Line */}
        {idx !== steps.length - 1 && (
          <div className="absolute top-8 left-[11px] bottom-0 w-px bg-border" />
        )}
        {/* Circle Indicator */}
        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-secondary border-2 border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shadow-sm">
          {idx + 1}
        </div>
        {/* Content */}
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>
    ))}
  </div>
);

// --- ADMONITION CALLOUTS ---
export const Callout = ({
  type = "info",
  title,
  children,
}: {
  type?: "info" | "warning" | "error";
  title: string;
  children: React.ReactNode;
}) => {
  const styles = {
    info: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    warning:
      "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-500",
    error: "bg-destructive/10 border-destructive/20 text-destructive",
  };

  const icons = {
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    error: <AlertTriangle className="w-5 h-5" />,
  };

  return (
    <div
      className={cn(
        "my-6 rounded-xl border p-4 flex gap-3 shadow-sm",
        styles[type],
      )}
    >
      <div className="shrink-0 mt-0.5 opacity-80">{icons[type]}</div>
      <div>
        <h4 className="font-bold text-sm mb-1">{title}</h4>
        <div className="text-sm opacity-90 leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
};
