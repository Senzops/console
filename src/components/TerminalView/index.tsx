/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../lib/auth";
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
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  X,
  Lock,
  Activity,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import "xterm/css/xterm.css";

interface TerminalViewProps {
  vpsId: string;
}

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

const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
};

export default function TerminalView({ vpsId }: TerminalViewProps) {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { theme } = useTheme();

  const [status, setStatus] = useState<
    "connecting" | "connected" | "error" | "disconnected"
  >("connecting");
  const [errorMsg, setErrorMsg] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Paste Modal State
  const [pasteContent, setPasteContent] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState<"flatten" | "raw">("flatten");

  const socketRef = useRef<Socket | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // --- HISTORY STATE ---
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const currentLineBufferRef = useRef<string>("");

  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    socketRef.current?.disconnect();
    router.push(`/dashboard/server/${vpsId}`);
  };
  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    setTimeout(() => fitAddonRef.current?.fit(), 100);
  };
  const handleReconnect = () => window.location.reload();
  const handleResize = useDebounce(() => {
    if (fitAddonRef.current?.proposeDimensions())
      socketRef.current?.emit("term:resize", {
        vpsId,
        ...fitAddonRef.current.proposeDimensions(),
      });
  }, 150);

  // Load history from storage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`term_history_${vpsId}`);
      if (saved) historyRef.current = JSON.parse(saved);
    } catch (e) {}
  }, [vpsId]);

  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = getThemeColors(theme);
  }, [theme]);

  // --- CONFIRM PASTE HANDLER ---
  const confirmPaste = () => {
    if (!pasteContent || !termRef.current) return;

    let textToSend = pasteContent;

    if (pasteMode === "flatten") {
      // Replace newlines with "; " to execute sequentially but stay on prompt (usually)
      // Removes blank lines and trims
      const lines = pasteContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      textToSend = lines.join("; ");
    } else {
      // Raw mode: convert all to \r for execution
      textToSend = pasteContent.replace(/\r?\n/g, "\r");
    }

    termRef.current.paste(textToSend); // Feeds into onData
    setPasteContent(null);
    termRef.current.focus();
  };

  useEffect(() => {
    if (!terminalContainerRef.current || !user) return;

    const initTerminal = async () => {
      try {
        const token = await getIdToken();
        const colors = getThemeColors(theme);

        const term = new Terminal({
          cursorBlink: true,
          cursorStyle: "block",
          cursorWidth: 2,
          fontFamily: 'Menlo, Consolas, "JetBrains Mono", monospace',
          fontSize: 14,
          lineHeight: 1.3,
          theme: colors,
          allowProposedApi: true,
          scrollback: 5000,
          disableStdin: true,
          macOptionIsMeta: true,
          rightClickSelectsWord: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        terminalContainerRef.current!.innerHTML = "";
        term.open(terminalContainerRef.current!);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        // --- KEY HANDLER ---
        term.attachCustomKeyEventHandler((event) => {
          if (event.type !== "keydown") return true;

          // 1. Paste (Ctrl+V)
          if ((event.ctrlKey || event.metaKey) && event.code === "KeyV") {
            event.preventDefault();
            event.stopPropagation();
            navigator.clipboard
              .readText()
              .then((text) => {
                // Multiline Check
                if (text.includes("\n") || text.includes("\r")) {
                  setPasteContent(text);
                } else {
                  term.paste(text); // Single line is safe to paste directly
                }
              })
              .catch(() => toast.error("Clipboard access denied"));
            return false;
          }

          // 2. Copy (Ctrl+C)
          if ((event.ctrlKey || event.metaKey) && event.code === "KeyC") {
            if (term.getSelection()) {
              navigator.clipboard.writeText(term.getSelection());
              toast.success("Copied");
              return false;
            }
            return true; // SigInt
          }

          // 3. History Up
          if (event.code === "ArrowUp") {
            const history = historyRef.current;
            const idx = historyIndexRef.current;
            if (history.length > 0) {
              const newIdx = idx + 1;
              if (newIdx < history.length) {
                historyIndexRef.current = newIdx;
                const cmd = history[history.length - 1 - newIdx];
                if (socketRef.current?.connected) {
                  socketRef.current.emit("term:input", {
                    vpsId,
                    data: "\x15" + cmd,
                  });
                  currentLineBufferRef.current = cmd;
                }
                return false;
              }
            }
            return true;
          }

          // 4. History Down
          if (event.code === "ArrowDown") {
            const idx = historyIndexRef.current;
            if (idx !== -1) {
              const newIdx = idx - 1;
              historyIndexRef.current = newIdx;
              let cmd = "";
              if (newIdx === -1) cmd = "";
              else
                cmd =
                  historyRef.current[historyRef.current.length - 1 - newIdx];

              if (socketRef.current?.connected) {
                socketRef.current.emit("term:input", {
                  vpsId,
                  data: "\x15" + cmd,
                });
                currentLineBufferRef.current = cmd;
              }
              return false;
            }
            return true;
          }

          return true;
        });

        let socketUrl = "http://localhost:5000";
        try {
          socketUrl = new URL(
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
          ).origin;
        } catch (e) {}

        const socket = io(socketUrl, {
          path: "/api/socket",
          auth: { token, type: "client" },
          reconnection: false,
          transports: ["websocket"],
          timeout: 10000,
        });
        socketRef.current = socket;

        connectionTimeoutRef.current = setTimeout(() => {
          if (!socket.connected) {
            socket.disconnect();
            setStatus("error");
            setErrorMsg("Connection timed out.");
          }
        }, 15000);

        socket.on("connect", () => {
          if (connectionTimeoutRef.current)
            clearTimeout(connectionTimeoutRef.current);
          setStatus("connected");
          term.options.disableStdin = false;
          socket.emit("term:connect", { vpsId });
          setTimeout(() => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) socket.emit("term:resize", { vpsId, ...dims });
            term.focus();
          }, 200);
        });

        socket.on("disconnect", (r) => {
          setStatus("disconnected");
          term.options.disableStdin = true;
          if (r !== "io client disconnect")
            term.write("\r\n\x1b[33m[Connection Closed]\x1b[0m\r\n");
        });
        socket.on("connect_error", (e) => {
          setStatus("error");
          setErrorMsg(e.message);
          term.options.disableStdin = true;
        });

        socket.on("term:output", (data) => {
          setIsProcessing(false);
          if (processingTimeoutRef.current)
            clearTimeout(processingTimeoutRef.current);
          term.write(data);
        });

        // --- DATA INTERCEPTION & BUFFERING ---
        term.onData((data) => {
          if (socket.connected) {
            socket.emit("term:input", { vpsId, data });

            if (data.charCodeAt(0) === 27) return;

            for (let i = 0; i < data.length; i++) {
              const char = data[i];
              const code = char.charCodeAt(0);

              if (char === "\r") {
                const cmd = currentLineBufferRef.current.trim();
                if (cmd.length > 0) {
                  const history = historyRef.current;
                  if (
                    history.length === 0 ||
                    history[history.length - 1] !== cmd
                  ) {
                    history.push(cmd);
                    if (history.length > 100) history.shift();
                    try {
                      sessionStorage.setItem(
                        `term_history_${vpsId}`,
                        JSON.stringify(history),
                      );
                    } catch (e) {}
                  }
                }
                currentLineBufferRef.current = "";
                historyIndexRef.current = -1;
              } else if (char === "\x7f") {
                currentLineBufferRef.current =
                  currentLineBufferRef.current.slice(0, -1);
              } else if (char === "\x03" || char === "\x15") {
                currentLineBufferRef.current = "";
              } else if (code >= 32) {
                currentLineBufferRef.current += char;
              }
            }

            setIsProcessing(true);
            if (processingTimeoutRef.current)
              clearTimeout(processingTimeoutRef.current);
            processingTimeoutRef.current = setTimeout(
              () => setIsProcessing(false),
              2000,
            );
          }
        });

        window.addEventListener("resize", handleResize);
        return () => {
          window.removeEventListener("resize", handleResize);
          if (connectionTimeoutRef.current)
            clearTimeout(connectionTimeoutRef.current);
          socket.disconnect();
          term.dispose();
        };
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message);
      }
    };

    initTerminal();
    return () => {
      socketRef.current?.disconnect();
      if (connectionTimeoutRef.current)
        clearTimeout(connectionTimeoutRef.current);
    };
  }, [vpsId, user]);

  const currentColors = getThemeColors(theme);

  // --- PASTE MODAL RENDER ---
  const renderPasteModal = () => {
    if (!pasteContent) return null;
    const lines = pasteContent.split(/\r?\n/);
    const displayPreview =
      lines.slice(0, 5).join("\n") +
      (lines.length > 5 ? `\n... (+${lines.length - 5} more lines)` : "");

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
              <pre>{displayPreview}</pre>
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
              <Button variant="ghost" onClick={() => setPasteContent(null)}>
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

  return (
    <div
      className={cn(
        "flex flex-col bg-card overflow-hidden transition-all duration-300 ease-in-out border border-border shadow-2xl",
        isMaximized
          ? "fixed inset-0 z-50 rounded-none"
          : "h-full w-full rounded-xl relative",
      )}
    >
      <div className="h-10 bg-muted/40 border-b border-border flex items-center justify-between px-4 shrink-0 select-none backdrop-blur-sm">
        <div className="flex items-center gap-2 group">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['✕'] after:text-[8px] after:text-black/50"
          />
          <button
            onClick={isMaximized ? handleMaximize : undefined}
            className={`w-3 h-3 rounded-full border ${isMaximized ? "bg-[#ffbd2e] border-[#dea123] hover:brightness-90 cursor-pointer group-hover:after:content-['−']" : "bg-secondary border-border cursor-default opacity-50"} after:text-[8px] after:text-black/50`}
          />
          <button
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['⤢'] after:text-[8px] after:text-black/50"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground opacity-90 absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span>root@{vpsId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-3">
          {isProcessing && (
            <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-medium animate-in fade-in">
              <Activity className="h-3 w-3 animate-pulse" />
              <span className="hidden sm:inline">Processing</span>
            </div>
          )}
          {status === "connected" ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SSH-WS
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Spinner className="h-3 w-3" /> Connecting...
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-1 relative p-4 overflow-hidden cursor-text"
        style={{ backgroundColor: currentColors.background }}
        onClick={() => termRef.current?.focus()}
      >
        <div
          ref={terminalContainerRef}
          className="h-full w-full outline-none"
        />
        {status === "connecting" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in">
            <Spinner className="h-10 w-10 text-primary mb-4" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
              Initializing Secure Session...
            </p>
          </div>
        )}
        {renderPasteModal()}
      </div>
    </div>
  );
}
