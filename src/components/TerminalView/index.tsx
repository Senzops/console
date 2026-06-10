import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../lib/auth";
import { useOrg } from "../../lib/org";
import { useTheme } from "../../lib/theme";
import {
  Spinner,
  Button,
  cn,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../Core";
import {
  AlertCircle,
  RefreshCw,
  Lock,
  ClipboardCheck,
  ArrowRight,
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Copy,
  ClipboardPaste,
  TextSelect,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import "xterm/css/xterm.css";

interface TerminalViewProps {
  vpsId: string;
}

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_DEFAULT = 14;
const SCROLLBACK_LINES = 10000;
const RECONNECT_ATTEMPTS = 5;
const CONNECTION_TIMEOUT_MS = 15000;
const CONTEXT_MENU_WIDTH = 220;
const CONTEXT_MENU_HEIGHT = 320;

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";
const SHIFT = isMac ? "⇧" : "Shift+";

const getThemeColors = (theme: string) => {
  const common = { cursorAccent: "#000000", selectionForeground: "#ffffff" };
  switch (theme) {
    case "light":
      return {
        ...common,
        background: "#ffffff",
        foreground: "#09090b",
        cursor: "#18181b",
        selectionBackground: "#a1a1aa",
        black: "#000000",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#d946ef",
        cyan: "#06b6d4",
        white: "#71717a",
        brightBlack: "#52525b",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#e879f9",
        brightCyan: "#22d3ee",
        brightWhite: "#a1a1aa",
      };
    case "nord":
      return {
        ...common,
        background: "#2E3440",
        foreground: "#D8DEE9",
        cursor: "#88C0D0",
        selectionBackground: "#434C5E",
        black: "#3B4252",
        red: "#BF616A",
        green: "#A3BE8C",
        yellow: "#EBCB8B",
        blue: "#81A1C1",
        magenta: "#B48EAD",
        cyan: "#88C0D0",
        white: "#E5E9F0",
        brightBlack: "#4C566A",
        brightRed: "#BF616A",
        brightGreen: "#A3BE8C",
        brightYellow: "#EBCB8B",
        brightBlue: "#81A1C1",
        brightMagenta: "#B48EAD",
        brightCyan: "#8FBCBB",
        brightWhite: "#ECEFF4",
      };
    case "latte":
      return {
        ...common,
        background: "#f5f5f4",
        foreground: "#44403c",
        cursor: "#78350f",
        selectionBackground: "#d6d3d1",
        black: "#292524",
        red: "#b91c1c",
        green: "#15803d",
        yellow: "#b45309",
        blue: "#1d4ed8",
        magenta: "#be185d",
        cyan: "#0e7490",
        white: "#a8a29e",
        brightBlack: "#57534e",
        brightRed: "#ef4444",
        brightGreen: "#22c55e",
        brightYellow: "#f59e0b",
        brightBlue: "#3b82f6",
        brightMagenta: "#ec4899",
        brightCyan: "#06b6d4",
        brightWhite: "#d6d3d1",
      };
    case "dark":
    default:
      return {
        ...common,
        background: "#09090b",
        foreground: "#fafafa",
        cursor: "#fafafa",
        selectionBackground: "#27272a",
        black: "#27272a",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f59e0b",
        blue: "#3b82f6",
        magenta: "#d946ef",
        cyan: "#06b6d4",
        white: "#f4f4f5",
        brightBlack: "#52525b",
        brightRed: "#f87171",
        brightGreen: "#34d399",
        brightYellow: "#fbbf24",
        brightBlue: "#60a5fa",
        brightMagenta: "#e879f9",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      };
  }
};

const formatDuration = (start: Date | null): string => {
  if (!start) return "0:00";
  const total = Math.floor((Date.now() - start.getTime()) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function TerminalView({ vpsId }: TerminalViewProps) {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { activeOrg } = useOrg();
  const { theme } = useTheme();

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);

  const [fontSize, setFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem("senzor_term_font_size");
      if (saved) {
        const size = parseInt(saved, 10);
        if (size >= FONT_SIZE_MIN && size <= FONT_SIZE_MAX) return size;
      }
    } catch {
      /* noop */
    }
    return FONT_SIZE_DEFAULT;
  });

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  const [pasteContent, setPasteContent] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState<"flatten" | "raw">("flatten");

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnectedRef = useRef(false);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    socketRef.current?.disconnect();
    router.push(`/dashboard/server/${vpsId}`);
  }, [router, vpsId]);

  const handleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
    setTimeout(() => {
      fitAddonRef.current?.fit();
      const dims = fitAddonRef.current?.proposeDimensions();
      if (dims && socketRef.current?.connected) {
        socketRef.current.emit("term:resize", { vpsId, ...dims });
        setDimensions({ cols: dims.cols, rows: dims.rows });
      }
    }, 100);
  }, [vpsId]);

  const handleReconnect = useCallback(() => window.location.reload(), []);

  const adjustFontSize = useCallback((delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(
        FONT_SIZE_MAX,
        Math.max(FONT_SIZE_MIN, prev + delta),
      );
      try {
        localStorage.setItem("senzor_term_font_size", String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const resetFontSize = useCallback(() => {
    setFontSize(FONT_SIZE_DEFAULT);
    try {
      localStorage.setItem(
        "senzor_term_font_size",
        String(FONT_SIZE_DEFAULT),
      );
    } catch {
      /* noop */
    }
  }, []);

  const openSearch = useCallback(() => {
    setShowSearch(true);
    setContextMenu(null);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
    searchAddonRef.current?.clearDecorations();
    termRef.current?.focus();
  }, []);

  const confirmPaste = useCallback(() => {
    if (!pasteContent || !termRef.current) return;
    let textToSend = pasteContent;
    if (pasteMode === "flatten") {
      const lines = pasteContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      textToSend = lines.join("; ");
    } else {
      textToSend = pasteContent.replace(/\r?\n/g, "\r");
    }
    termRef.current.paste(textToSend);
    setPasteContent(null);
    termRef.current.focus();
  }, [pasteContent, pasteMode]);

  const handleCopy = useCallback(() => {
    const sel = termRef.current?.getSelection();
    if (sel) {
      navigator.clipboard.writeText(sel);
      toast.success("Copied to clipboard");
    }
    setContextMenu(null);
  }, []);

  const handleCtxPaste = useCallback(() => {
    setContextMenu(null);
    navigator.clipboard
      .readText()
      .then((text) => {
        if (text.includes("\n") || text.includes("\r")) {
          setPasteContent(text);
        } else {
          termRef.current?.paste(text);
        }
      })
      .catch(() => toast.error("Clipboard access denied"));
  }, []);

  const handleSelectAll = useCallback(() => {
    termRef.current?.selectAll();
    setContextMenu(null);
  }, []);

  const handleClearTerminal = useCallback(() => {
    termRef.current?.clear();
    setContextMenu(null);
  }, []);

  // ── Effects ────────────────────────────────────────────────────────

  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.fontSize = fontSize;
      fitAddonRef.current?.fit();
      const dims = fitAddonRef.current?.proposeDimensions();
      if (dims && socketRef.current?.connected) {
        socketRef.current.emit("term:resize", { vpsId, ...dims });
        setDimensions({ cols: dims.cols, rows: dims.rows });
      }
    }
  }, [fontSize, vpsId]);

  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = getThemeColors(theme);
  }, [theme]);

  useEffect(() => {
    if (!sessionStart) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("click", dismiss);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu]);

  // ── Main terminal init ─────────────────────────────────────────────

  useEffect(() => {
    if (!terminalContainerRef.current || !user) return;

    let disposed = false;
    let term: Terminal | null = null;
    let socket: Socket | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: NodeJS.Timeout | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctxHandler: any = null;
    let containerEl: HTMLElement | null = null;

    const init = async () => {
      try {
        const token = await getIdToken();
        if (disposed) return;

        const colors = getThemeColors(theme);

        term = new Terminal({
          cursorBlink: true,
          cursorStyle: "block",
          fontFamily:
            'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize,
          lineHeight: 1.2,
          theme: colors,
          allowProposedApi: true,
          scrollback: SCROLLBACK_LINES,
          disableStdin: true,
          macOptionIsMeta: true,
          rightClickSelectsWord: false,
          scrollOnUserInput: true,
        });

        const fitAddon = new FitAddon();
        const searchAddon = new SearchAddon();

        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());
        term.loadAddon(searchAddon);

        containerEl = terminalContainerRef.current!;
        containerEl.innerHTML = "";
        term.open(containerEl);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;
        searchAddonRef.current = searchAddon;

        // ── Key handler ────────────────────────────────────────────
        term.attachCustomKeyEventHandler((event) => {
          if (event.type !== "keydown") return true;
          const mod = event.ctrlKey || event.metaKey;

          // Ctrl+Shift+F → search
          if (mod && event.shiftKey && event.code === "KeyF") {
            event.preventDefault();
            openSearch();
            return false;
          }
          // Ctrl+Shift+K → clear terminal
          if (mod && event.shiftKey && event.code === "KeyK") {
            event.preventDefault();
            term!.clear();
            return false;
          }
          // Ctrl+= / Ctrl+NumpadAdd → zoom in
          if (
            mod &&
            !event.shiftKey &&
            (event.code === "Equal" || event.code === "NumpadAdd")
          ) {
            event.preventDefault();
            adjustFontSize(1);
            return false;
          }
          // Ctrl+- / Ctrl+NumpadSubtract → zoom out
          if (
            mod &&
            !event.shiftKey &&
            (event.code === "Minus" || event.code === "NumpadSubtract")
          ) {
            event.preventDefault();
            adjustFontSize(-1);
            return false;
          }
          // Ctrl+0 → reset zoom
          if (mod && !event.shiftKey && event.code === "Digit0") {
            event.preventDefault();
            resetFontSize();
            return false;
          }

          // Ctrl+C → copy when selection, SIGINT otherwise
          if (mod && event.code === "KeyC") {
            if (event.shiftKey || term!.getSelection()) {
              const sel = term!.getSelection();
              if (sel) {
                event.preventDefault();
                navigator.clipboard.writeText(sel);
                toast.success("Copied");
              }
              return false;
            }
            return true;
          }

          // Ctrl+V / Ctrl+Shift+V → paste
          if (mod && event.code === "KeyV") {
            event.preventDefault();
            event.stopPropagation();
            navigator.clipboard
              .readText()
              .then((text) => {
                if (text.includes("\n") || text.includes("\r")) {
                  setPasteContent(text);
                } else {
                  term!.paste(text);
                }
              })
              .catch(() => toast.error("Clipboard access denied"));
            return false;
          }

          return true;
        });

        // ── Socket ─────────────────────────────────────────────────
        let socketUrl = "http://localhost:5000";
        try {
          socketUrl = new URL(
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
          ).origin;
        } catch {
          /* noop */
        }

        socket = io(socketUrl, {
          path: "/api/socket",
          auth: {
            token,
            type: "client",
            orgId: activeOrg?._id || undefined,
          },
          reconnection: true,
          reconnectionAttempts: RECONNECT_ATTEMPTS,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          transports: ["websocket"],
          timeout: 10000,
        });
        socketRef.current = socket;

        connectionTimeoutRef.current = setTimeout(() => {
          if (socket && !socket.connected) {
            socket.disconnect();
            setStatus("error");
            setErrorMsg(
              "Connection timed out. Please check your network and try again.",
            );
          }
        }, CONNECTION_TIMEOUT_MS);

        socket.on("connect", () => {
          if (connectionTimeoutRef.current)
            clearTimeout(connectionTimeoutRef.current);

          if (hasConnectedRef.current) {
            term!.write(
              "\r\n\x1b[33m[Reconnected — new session]\x1b[0m\r\n",
            );
          } else {
            hasConnectedRef.current = true;
            setSessionStart(new Date());
          }

          setStatus("connected");
          term!.options.disableStdin = false;
          socket!.emit("term:connect", { vpsId });

          setTimeout(() => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) {
              socket!.emit("term:resize", { vpsId, ...dims });
              setDimensions({ cols: dims.cols, rows: dims.rows });
            }
            term!.focus();
          }, 200);
        });

        socket.on("disconnect", (reason) => {
          setPasteContent(null);
          term!.options.disableStdin = true;

          if (reason === "io client disconnect") {
            setStatus("disconnected");
          } else {
            setStatus("reconnecting");
            term!.write(
              "\r\n\x1b[33m[Connection lost — reconnecting…]\x1b[0m\r\n",
            );
          }
        });

        socket.on("connect_error", (e) => {
          if (!hasConnectedRef.current) {
            setStatus("error");
            setErrorMsg(e.message);
            term!.options.disableStdin = true;
          }
        });

        socket.io.on("reconnect_failed", () => {
          setStatus("error");
          setErrorMsg("Failed to reconnect after multiple attempts.");
          term!.options.disableStdin = true;
        });

        socket.on("term:output", (data) => {
          term!.write(data);
        });

        socket.on("term:error", (msg) => {
          setStatus("error");
          setErrorMsg(typeof msg === "string" ? msg : "Terminal error");
          term!.options.disableStdin = true;
        });

        // ── Data relay ──────────────────────────────────────────────
        term.onData((data) => {
          if (socket?.connected) {
            socket.emit("term:input", { vpsId, data });
          }
        });

        term.onBinary((data) => {
          if (socket?.connected) {
            socket.emit("term:input", { vpsId, data });
          }
        });

        // ── Resize ─────────────────────────────────────────────────
        const emitResize = () => {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims && socket?.connected) {
              socket.emit("term:resize", { vpsId, ...dims });
              setDimensions({ cols: dims.cols, rows: dims.rows });
            }
          }, 150);
        };

        resizeObserver = new ResizeObserver(emitResize);
        resizeObserver.observe(containerEl);
        window.addEventListener("resize", emitResize);

        // ── Context menu ───────────────────────────────────────────
        ctxHandler = (e: MouseEvent) => {
          e.preventDefault();
          const rect = containerEl!.getBoundingClientRect();
          let x = e.clientX - rect.left;
          let y = e.clientY - rect.top;
          if (x + CONTEXT_MENU_WIDTH > rect.width)
            x = rect.width - CONTEXT_MENU_WIDTH;
          if (y + CONTEXT_MENU_HEIGHT > rect.height)
            y = rect.height - CONTEXT_MENU_HEIGHT;
          if (x < 0) x = 0;
          if (y < 0) y = 0;
          setContextMenu({ x, y });
        };
        containerEl.addEventListener("contextmenu", ctxHandler);

        // Store for cleanup
        return () => {
          window.removeEventListener("resize", emitResize);
          if (containerEl && ctxHandler)
            containerEl.removeEventListener("contextmenu", ctxHandler);
          if (resizeTimer) clearTimeout(resizeTimer);
          if (resizeObserver) resizeObserver.disconnect();
          if (connectionTimeoutRef.current)
            clearTimeout(connectionTimeoutRef.current);
          socket?.disconnect();
          term?.dispose();
          socketRef.current = null;
          termRef.current = null;
          fitAddonRef.current = null;
          searchAddonRef.current = null;
          hasConnectedRef.current = false;
        };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize terminal";
        setStatus("error");
        setErrorMsg(message);
      }
    };

    let cleanupFn: (() => void) | undefined;
    init().then((fn) => {
      if (fn) cleanupFn = fn;
    });

    return () => {
      disposed = true;
      cleanupFn?.();
      socketRef.current?.disconnect();
      if (connectionTimeoutRef.current)
        clearTimeout(connectionTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vpsId, user, activeOrg?._id]);

  // ── Render helpers ─────────────────────────────────────────────────

  const currentColors = getThemeColors(theme);

  const renderSearchBar = () => {
    if (!showSearch) return null;

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSearch();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (searchQuery)
          searchAddonRef.current?.findPrevious(searchQuery, {
            caseSensitive: false,
          });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (searchQuery)
          searchAddonRef.current?.findNext(searchQuery, {
            caseSensitive: false,
          });
      }
    };

    const onInput = (val: string) => {
      setSearchQuery(val);
      if (val) {
        searchAddonRef.current?.findNext(val, {
          caseSensitive: false,
          incremental: true,
        });
      } else {
        searchAddonRef.current?.clearDecorations();
      }
    };

    return (
      <div className="absolute top-0 right-0 z-30 flex items-center gap-1 rounded-bl-lg border-b border-l border-border bg-card/95 backdrop-blur-sm px-2 py-1.5 shadow-lg">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          className="w-48 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          spellCheck={false}
        />
        <button
          onClick={() =>
            searchQuery &&
            searchAddonRef.current?.findPrevious(searchQuery, {
              caseSensitive: false,
            })
          }
          className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() =>
            searchQuery &&
            searchAddonRef.current?.findNext(searchQuery, {
              caseSensitive: false,
            })
          }
          className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Next match (Enter)"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={closeSearch}
          className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Close (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    const hasSelection = !!termRef.current?.getSelection();

    const Item = ({
      icon,
      label,
      shortcut,
      onClick,
      disabled,
      destructive,
    }: {
      icon: React.ReactNode;
      label: string;
      shortcut: string;
      onClick: () => void;
      disabled?: boolean;
      destructive?: boolean;
    }) => (
      <button
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          "flex items-center gap-2.5 w-full px-3 py-1.5 text-[13px] rounded-md transition-colors text-left",
          disabled
            ? "opacity-35 cursor-not-allowed"
            : destructive
              ? "hover:bg-destructive/10 hover:text-destructive"
              : "hover:bg-accent",
        )}
      >
        {icon}
        <span className="flex-1">{label}</span>
        <span className="text-[10px] text-muted-foreground/70 font-mono ml-3">
          {shortcut}
        </span>
      </button>
    );

    const Separator = () => <div className="my-1 h-px bg-border/60" />;

    return (
      <div
        className="absolute z-40 w-[220px] rounded-lg border border-border bg-card/95 backdrop-blur-md shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ top: contextMenu.y, left: contextMenu.x }}
        onClick={(e) => e.stopPropagation()}
      >
        <Item
          icon={<Copy className="h-3.5 w-3.5" />}
          label="Copy"
          shortcut={`${MOD}C`}
          onClick={handleCopy}
          disabled={!hasSelection}
        />
        <Item
          icon={<ClipboardPaste className="h-3.5 w-3.5" />}
          label="Paste"
          shortcut={`${MOD}V`}
          onClick={handleCtxPaste}
        />
        <Item
          icon={<TextSelect className="h-3.5 w-3.5" />}
          label="Select All"
          shortcut=""
          onClick={handleSelectAll}
        />
        <Separator />
        <Item
          icon={<Trash2 className="h-3.5 w-3.5" />}
          label="Clear Terminal"
          shortcut={`${SHIFT}${MOD}K`}
          onClick={handleClearTerminal}
          destructive
        />
        <Item
          icon={<Search className="h-3.5 w-3.5" />}
          label="Find"
          shortcut={`${SHIFT}${MOD}F`}
          onClick={() => {
            setContextMenu(null);
            openSearch();
          }}
        />
        <Separator />
        <Item
          icon={<ZoomIn className="h-3.5 w-3.5" />}
          label="Zoom In"
          shortcut={`${MOD}=`}
          onClick={() => {
            adjustFontSize(1);
            setContextMenu(null);
          }}
        />
        <Item
          icon={<ZoomOut className="h-3.5 w-3.5" />}
          label="Zoom Out"
          shortcut={`${MOD}-`}
          onClick={() => {
            adjustFontSize(-1);
            setContextMenu(null);
          }}
        />
        <Item
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          label="Reset Zoom"
          shortcut={`${MOD}0`}
          onClick={() => {
            resetFontSize();
            setContextMenu(null);
          }}
        />
      </div>
    );
  };

  const renderPasteModal = () => {
    if (!pasteContent) return null;
    const lines = pasteContent.split(/\r?\n/);
    const preview =
      lines.slice(0, 5).join("\n") +
      (lines.length > 5 ? `\n… (+${lines.length - 5} more lines)` : "");

    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <Card className="w-full max-w-lg shadow-2xl border-primary/20 bg-card">
          <CardHeader className="pb-2 border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Confirm Paste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="text-sm text-muted-foreground">
              You are about to paste <strong>{lines.length} lines</strong> of
              text. How would you like to handle newlines?
            </div>

            <div className="bg-muted/50 p-3 rounded-md font-mono text-xs overflow-x-auto max-h-32 border border-border/50">
              <pre>{preview}</pre>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPasteMode("flatten")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  pasteMode === "flatten"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-border/80",
                )}
              >
                <div className="font-semibold text-sm mb-1">Flatten (Safe)</div>
                <div className="text-[10px] text-muted-foreground">
                  Replaces newlines with semicolons. Executes as single command
                  block.
                </div>
              </button>
              <button
                onClick={() => setPasteMode("raw")}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  pasteMode === "raw"
                    ? "border-destructive bg-destructive/5 ring-1 ring-destructive"
                    : "border-border hover:border-border/80",
                )}
              >
                <div className="font-semibold text-sm mb-1">Raw (Direct)</div>
                <div className="text-[10px] text-muted-foreground">
                  Sends actual newlines. Commands may execute immediately.
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setPasteContent(null);
                  termRef.current?.focus();
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmPaste} className="gap-2">
                Paste <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStatusBar = () => (
    <div className="h-7 bg-muted/30 border-t border-border flex items-center justify-between px-3 shrink-0 select-none text-[11px] text-muted-foreground font-mono">
      <div className="flex items-center gap-3">
        {dimensions.cols > 0 && (
          <span title="Terminal dimensions">
            {dimensions.cols}&times;{dimensions.rows}
          </span>
        )}
        <span className="text-border">|</span>
        <span title="Session duration">{formatDuration(sessionStart)}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => adjustFontSize(-1)}
            disabled={fontSize <= FONT_SIZE_MIN}
            className="p-0.5 rounded hover:bg-accent disabled:opacity-30 transition-colors"
            title="Zoom out (Ctrl+-)"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <span className="w-8 text-center tabular-nums">{fontSize}px</span>
          <button
            onClick={() => adjustFontSize(1)}
            disabled={fontSize >= FONT_SIZE_MAX}
            className="p-0.5 rounded hover:bg-accent disabled:opacity-30 transition-colors"
            title="Zoom in (Ctrl+=)"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
        </div>
        <span className="text-border">|</span>
        {status === "connected" ? (
          <span className="flex items-center gap-1.5 text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SSH-WS
          </span>
        ) : status === "reconnecting" ? (
          <span className="flex items-center gap-1.5 text-amber-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Reconnecting
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <Spinner className="h-3 w-3" />
            Connecting
          </span>
        )}
      </div>
    </div>
  );

  // ── Error / Disconnected ───────────────────────────────────────────

  if (status === "error" || status === "disconnected") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-card rounded-lg border border-border p-8 shadow-lg">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-bold mb-2">Session Ended</h3>
        <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">
          {errorMsg || "Connection closed."}
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleClose}>
            Back
          </Button>
          <Button onClick={handleReconnect}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reconnect
          </Button>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-col bg-card overflow-hidden transition-all duration-300 ease-in-out border border-border shadow-2xl",
        isMaximized
          ? "fixed inset-0 z-50 rounded-none"
          : "h-full w-full rounded-xl relative",
      )}
    >
      {/* Title bar */}
      <div className="h-10 bg-muted/40 border-b border-border flex items-center justify-between px-4 shrink-0 select-none backdrop-blur-sm">
        <div className="flex items-center gap-2 group">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['✕'] after:text-[8px] after:text-black/50"
            title="Close"
          />
          <button
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-[#ffbd2e] border-[#dea123] border hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['−'] after:text-[8px] after:text-black/50 cursor-pointer"
            title={isMaximized ? "Restore" : "Minimize"}
          />
          <button
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['⤢'] after:text-[8px] after:text-black/50"
            title={isMaximized ? "Restore" : "Maximize"}
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground opacity-90 absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span>root@{vpsId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-3">
          {status === "connected" ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </div>
          ) : status === "reconnecting" ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Reconnecting
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Spinner className="h-3 w-3" /> Connecting…
            </div>
          )}
        </div>
      </div>

      {/* Terminal area */}
      <div
        className="flex-1 relative overflow-hidden cursor-text"
        style={{ backgroundColor: currentColors.background }}
        onClick={() => termRef.current?.focus()}
      >
        {renderSearchBar()}
        <div
          ref={terminalContainerRef}
          className="h-full w-full outline-none"
        />

        {status === "connecting" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in">
            <Spinner className="h-10 w-10 text-primary mb-4" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Initializing Secure Session…
            </p>
          </div>
        )}

        {status === "reconnecting" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/30 backdrop-blur-[2px] animate-in fade-in">
            <Spinner className="h-8 w-8 text-amber-500 mb-3" />
            <p className="text-sm font-medium text-amber-500 animate-pulse">
              Reconnecting…
            </p>
          </div>
        )}

        {renderPasteModal()}
        {renderContextMenu()}
      </div>

      {/* Status bar */}
      {renderStatusBar()}
    </div>
  );
}
