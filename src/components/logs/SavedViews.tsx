import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Input, Dialog } from "../Core";
import { Bookmark, BookmarkPlus, Trash2, Search, Inbox } from "lucide-react";

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
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => setViews(read());

  const toggleOpen = () => {
    setOpen((o) => {
      if (!o) refresh();
      return !o;
    });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const canSave = currentSearch.trim().length > 0;

  const openSaveModal = () => {
    if (!canSave) return;
    setName("");
    setOpen(false);
    setSaveOpen(true);
  };

  const confirmSave = () => {
    const trimmedName = name.trim();
    const trimmedSearch = currentSearch.trim();
    if (!trimmedName || !trimmedSearch) return;
    const next = [{ name: trimmedName, search: trimmedSearch }, ...read().filter((v) => v.name !== trimmedName)];
    write(next);
    setViews(next);
    setSaveOpen(false);
    toast.success(`Saved search “${trimmedName}”`);
  };

  const remove = (view: SavedView) => {
    const next = read().filter((v) => v.name !== view.name);
    write(next);
    setViews(next);
    toast.success(`Removed “${view.name}”`, {
      action: {
        label: "Undo",
        onClick: () => {
          const restored = [view, ...read().filter((v) => v.name !== view.name)];
          write(restored);
          setViews(restored);
        },
      },
    });
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" className="h-9" onClick={toggleOpen} title="Saved searches">
        <Bookmark className="h-4 w-4 mr-2" /> Saved
        {views.length > 0 && <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">({views.length})</span>}
      </Button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border/60 bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40 bg-muted/20">
            <span className="text-xs font-semibold text-foreground">Saved searches</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{views.length}</span>
          </div>

          <button
            onClick={openSaveModal}
            disabled={!canSave}
            title={canSave ? "Save the current query" : "Enter a query first"}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 border-b border-border/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          >
            <BookmarkPlus className="h-4 w-4 text-blue-500 shrink-0" /> Save current query
          </button>

          <div className="max-h-72 overflow-y-auto p-1">
            {views.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center gap-2 py-8 px-4">
                <div className="p-2.5 rounded-full bg-muted/50"><Inbox className="h-5 w-5 text-muted-foreground" /></div>
                <p className="text-xs font-medium text-foreground">No saved searches yet</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">Save a query to quickly run it again later.</p>
              </div>
            ) : (
              views.map((v) => (
                <div key={v.name} className="group flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-muted/50 transition-colors">
                  <button onClick={() => { onApply(v.search); setOpen(false); }} className="flex items-start gap-2.5 min-w-0 flex-1 text-left">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-foreground truncate">{v.name}</span>
                      <span className="block text-[10px] font-mono text-muted-foreground truncate">{v.search}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => remove(v)}
                    title="Remove"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Save modal (custom — no native prompt) */}
      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} title="Save search" className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
            <Input
              autoFocus
              placeholder="e.g. Production errors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmSave(); }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Query</label>
            <div className="bg-muted/30 border border-border/50 rounded-md px-3 py-2">
              <code className="text-[11px] font-mono text-foreground break-all">{currentSearch.trim() || "—"}</code>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={confirmSave} disabled={!name.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
