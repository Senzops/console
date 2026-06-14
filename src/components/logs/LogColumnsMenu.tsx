import React, { useEffect, useRef, useState } from "react";
import { Button } from "../Core";
import { Columns3, Check } from "lucide-react";

// Built-in (top-level) columns available in the table picker.
export const BUILTIN_COLUMNS: { key: string; label: string }[] = [
  { key: "source", label: "Source" },
  { key: "host", label: "Host" },
  { key: "environment", label: "Environment" },
  { key: "serviceModel", label: "Service" },
  { key: "traceId", label: "Trace ID" },
];

const STORAGE_KEY = "senzor:log-columns";

export const readColumns = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeColumns = (cols: string[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cols.slice(0, 12))); } catch { /* ignore */ }
};

export const columnLabel = (key: string): string => {
  if (key.startsWith("attributes.")) return key.slice("attributes.".length);
  return BUILTIN_COLUMNS.find((c) => c.key === key)?.label || key;
};

export const getColumnValue = (log: any, key: string): any => {
  if (key.startsWith("attributes.")) return log?.attributes?.[key.slice("attributes.".length)];
  return log?.[key];
};

export const LogColumnsMenu = ({
  attrKeys,
  selected,
  onChange,
}: {
  attrKeys: string[];
  selected: string[];
  onChange: (cols: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter((c) => c !== key) : [...selected, key]);
  };

  const attrCols = attrKeys.map((k) => `attributes.${k}`);

  const renderRow = (colKey: string) => (
    <button
      key={colKey}
      onClick={() => toggle(colKey)}
      className="flex items-center justify-between gap-2 w-full px-3 py-1.5 rounded hover:bg-muted/50 text-left"
    >
      <span className="text-xs text-foreground truncate">{columnLabel(colKey)}</span>
      {selected.includes(colKey) && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" className="h-9" onClick={() => setOpen((o) => !o)}>
        <Columns3 className="h-4 w-4 mr-2" /> Columns
        {selected.length > 0 && <span className="ml-1.5 text-[10px] text-muted-foreground">({selected.length})</span>}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-lg border border-border/60 bg-card shadow-xl z-50 p-1.5 max-h-80 overflow-y-auto">
          <p className="text-[10px] text-muted-foreground px-3 py-1 font-semibold uppercase tracking-wider">Fields</p>
          {BUILTIN_COLUMNS.map((c) => renderRow(c.key))}
          {attrCols.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground px-3 py-1 mt-1 font-semibold uppercase tracking-wider border-t border-border/40">Attributes</p>
              {attrCols.map((c) => renderRow(c))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
