import React, { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { api, useAuth } from "../../lib/auth";
import { Button, Spinner } from "../Core";
import { SlidersHorizontal, Filter } from "lucide-react";
import { formatNumber, getLevelColors } from "./shared";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const QUERY_FIELD: Record<string, string> = {
  severityText: "level",
  source: "source",
  host: "host",
  environment: "env",
  serviceModel: "service",
};

const FACET_LABELS: Record<string, string> = {
  severityText: "Severity",
  source: "Source",
  host: "Host",
  environment: "Environment",
  serviceModel: "Service Type",
};

const VALUES_PER_GROUP = 8;

// "Filters" as a button-anchored popover — consistent with Columns / Saved Views,
// rather than an inline panel. Stays open while clicking values; closes on outside click.
export const LogFacetsPopover = ({
  queryString,
  onAddFilter,
}: {
  queryString: string;
  onAddFilter: (field: string, value: string) => void;
}) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isLoading } = useSWR(token && open ? `/logs/facets?${queryString}` : null, fetcher, { keepPreviousData: true });
  const facets = data?.facets || {};
  const order = ["severityText", "source", "serviceModel", "environment", "host"];
  const fields = order.filter((f) => facets[f]?.length);

  return (
    <div className="relative" ref={ref}>
      <Button variant={open ? "default" : "outline"} size="sm" className="h-9" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal className="h-4 w-4 mr-2" /> Filters
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(36rem,calc(100vw-2rem))] rounded-lg border border-border/60 bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Filters</span>
            <span className="text-[11px] text-muted-foreground">— click a value to refine</span>
          </div>
          {isLoading && !data ? (
            <div className="flex justify-center py-8"><Spinner className="h-5 w-5 text-blue-500" /></div>
          ) : fields.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8 px-3">No fields to filter in this range.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border/40 max-h-[60vh] overflow-y-auto">
              {fields.map((f) => (
                <div key={f} className="p-3 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-1">{FACET_LABELS[f] || f}</p>
                  <div className="space-y-0.5">
                    {facets[f].slice(0, VALUES_PER_GROUP).map((v: { value: any; count: number }) => {
                      const label = String(v.value);
                      const colors = f === "severityText" ? getLevelColors(label) : null;
                      return (
                        <button
                          key={label}
                          onClick={() => onAddFilter(QUERY_FIELD[f] || `attributes.${f}`, label)}
                          className="group flex items-center justify-between gap-2 w-full px-1.5 py-1 rounded-md hover:bg-muted/50 transition-colors text-left"
                          title={`Filter by ${label}`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            {colors && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`} />}
                            <span className={`text-xs truncate ${colors ? colors.text : "text-foreground"}`}>{label}</span>
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{formatNumber(v.count)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
