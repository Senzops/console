import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../Core";
import { Bookmark, BookmarkPlus, Trash2, Check } from "lucide-react";

const STORAGE_KEY = "senzor:log-saved-views";

interface SavedView { name: string; search: string }

const read = (): SavedView[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (views: SavedView[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(views.slice(0, 50))); } catch { /* ignore */ }
};

export const SavedViews = ({
  currentSearch,
  onApply,
}: {
  currentSearch: string;
  onApply: (search: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>(() => read());
  const ref = useRef<HTMLDivElement>(null);

  // Refresh the list when the panel is opened (re-reads localStorage).
  const toggleOpen = () => {
    setOpen((o) => {
      if (!o) setViews(read());
      return !o;
    });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const save = () => {
    const trimmed = currentSearch.trim();
    if (!trimmed) { toast.error("Nothing to save — enter a query first"); return; }
    const name = window.prompt("Name this view", trimmed.slice(0, 40));
    if (!name) return;
    const next = [{ name, search: trimmed }, ...read().filter((v) => v.name !== name)];
    write(next);
    setViews(next);
    toast.success(`Saved view "${name}"`);
  };

  const remove = (name: string) => {
    const next = read().filter((v) => v.name !== name);
    write(next);
    setViews(next);
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" className="h-9" onClick={toggleOpen}>
        <Bookmark className="h-4 w-4 mr-2" /> Views
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border/60 bg-card shadow-xl z-50 overflow-hidden">
          <button onClick={save} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 border-b border-border/40">
            <BookmarkPlus className="h-4 w-4 text-blue-500" /> Save current query
          </button>
          <div className="max-h-64 overflow-y-auto">
            {views.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-6 px-3">No saved views yet.</div>
            ) : (
              views.map((v) => (
                <div key={v.name} className="group flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/40">
                  <button onClick={() => { onApply(v.search); setOpen(false); }} className="flex items-center gap-2 min-w-0 text-left flex-1">
                    <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-foreground truncate">{v.name}</span>
                      <span className="block text-[10px] font-mono text-muted-foreground truncate">{v.search}</span>
                    </span>
                  </button>
                  <button onClick={() => remove(v.name)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
