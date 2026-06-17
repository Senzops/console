/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { createPortal } from "react-dom";

export interface UptimeCheck {
  _id?: string;
  status: "up" | "down" | "timeout" | string;
  latency: number;
  statusCode: number;
  createdAt: string | Date;
}

/** A pre-bucketed availability segment (oldest → newest), or null for no data. */
export interface UptimeSegment {
  status: "up" | "down" | "timeout" | string;
  latency: number;
  count: number;
  t: number; // bucket start (epoch ms)
}

interface UptimeStripProps {
  /** Legacy mode: raw checks newest-first (per-monitor detail page). */
  history?: UptimeCheck[];
  /** Range-bucketed segments oldest-first (Status Board cards). Takes precedence. */
  segments?: (UptimeSegment | null)[];
  /** Width of a segment's time window in ms (for segment tooltips). */
  bucketMs?: number;
  /** Number of buckets to render in legacy mode. */
  count?: number;
  /** Dense variant for compact cards (tighter padding, no legend). */
  dense?: boolean;
  /** Stretch the bars to fill the available height (removes whitespace in a grid cell). */
  fill?: boolean;
  label?: string;
  className?: string;
}

const barColor = (status: string) =>
  status === "down" ? "bg-destructive" : status === "timeout" ? "bg-yellow-500" : "bg-emerald-500";

const fmtTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * The signature uptime "stripe". Shared by the per-monitor detail page (raw
 * checks) and the Status Board cards (range-bucketed segments).
 *
 * The hover tooltip is rendered through a portal to <body> with fixed,
 * viewport-clamped coordinates, so it is never clipped by an ancestor's
 * `overflow-hidden` (e.g. the Status Board card) and never runs off-screen.
 */
export const UptimeStrip = ({
  history,
  segments,
  bucketMs,
  count = 60,
  dense = false,
  fill = false,
  label,
  className = "",
}: UptimeStripProps) => {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);

  const showTip = (e: React.MouseEvent, text: string) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // Centre on the bar; clamp horizontally so the bubble stays on-screen, and
    // flip below the bar when there isn't room above it near the viewport top.
    const x = Math.min(Math.max(r.left + r.width / 2, 120), window.innerWidth - 120);
    const below = r.top < 48;
    setTip({ text, x, y: below ? r.bottom + 8 : r.top - 8, below });
  };
  const hideTip = () => setTip(null);
  // Build a unified list of bars (oldest → newest).
  let bars: { key: string; color: string; tooltip: string }[];
  let heading: string;

  if (segments) {
    heading = label ?? "Availability";
    bars = segments.map((seg, i) => {
      if (!seg || seg.count === 0) {
        return { key: `s${i}`, color: "bg-secondary/30", tooltip: "No data" };
      }
      const end = bucketMs ? ` – ${new Date(seg.t + bucketMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "";
      return {
        key: `s${i}`,
        color: barColor(seg.status),
        tooltip: `${fmtTime(seg.t)}${end} • ${seg.status} • ${seg.latency}ms · ${seg.count} check${seg.count === 1 ? "" : "s"}`,
      };
    });
  } else {
    heading = label ?? `Last ${count} Checks`;
    const checks = (history || []).slice(0, count).reverse();
    const filled = [...Array(Math.max(0, count - checks.length)).fill(null), ...checks];
    bars = filled.map((run: UptimeCheck | null, i) => {
      if (!run) return { key: `h${i}`, color: "bg-secondary/30", tooltip: "No data" };
      return {
        key: run._id || `h${i}`,
        color: barColor(run.status),
        tooltip: `${fmtTime(new Date(run.createdAt).getTime())} • ${run.latency}ms • ${run.statusCode || "Err"}`,
      };
    });
  }

  return (
    <div
      className={`flex flex-col bg-card/50 rounded-xl border ${dense ? "p-3" : "p-4"} ${
        fill ? "h-full min-h-0" : ""
      } ${className}`}
    >
      <div className="flex justify-between items-center text-[11px] text-muted-foreground uppercase tracking-wider font-medium shrink-0">
        <span>{heading}</span>
        {!dense && (
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Up
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive" /> Down
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Timeout
            </span>
          </span>
        )}
      </div>
      <div className={`w-full flex gap-[2px] mt-2 ${fill ? "flex-1 min-h-0" : dense ? "h-7" : "h-8"}`}>
        {bars.map((bar) => (
          <div
            key={bar.key}
            className={`flex-1 rounded-sm ${bar.color} transition-all hover:opacity-80`}
            onMouseEnter={(e) => showTip(e, bar.tooltip)}
            onMouseLeave={hideTip}
          />
        ))}
      </div>

      {/* Portal tooltip — escapes the card's overflow-hidden, never clipped. */}
      {tip &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: tip.x,
              top: tip.y,
              transform: tip.below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
            }}
            className="z-[9999] pointer-events-none bg-popover border border-border text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap text-foreground"
          >
            {tip.text}
          </div>,
          document.body
        )}
    </div>
  );
};

export default UptimeStrip;
