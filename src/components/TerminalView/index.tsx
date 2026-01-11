import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Spinner, Button, cn } from '../Core';
import { AlertCircle, RefreshCw, Terminal as TerminalIcon, Maximize2, Minimize2, X, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  vpsId: string;
}

// 1. Precise Theme Colors (Matching globals.css HSL converted to Hex)
const getThemeColors = (theme: string) => {
  const common = {
    cursorAccent: '#000000',
    selectionForeground: '#ffffff'
  };

  switch (theme) {
    case 'light':
      return {
        ...common,
        background: '#ffffff',
        foreground: '#09090b',
        cursor: '#18181b',
        selectionBackground: '#a1a1aa',
        black: '#000000', red: '#ef4444', green: '#10b981', yellow: '#f59e0b',
        blue: '#3b82f6', magenta: '#d946ef', cyan: '#06b6d4', white: '#71717a',
        brightBlack: '#52525b', brightRed: '#f87171', brightGreen: '#34d399', brightYellow: '#fbbf24',
        brightBlue: '#60a5fa', brightMagenta: '#e879f9', brightCyan: '#22d3ee', brightWhite: '#a1a1aa'
      };
    case 'nord':
      return {
        ...common,
        background: '#2E3440', foreground: '#D8DEE9', cursor: '#88C0D0', selectionBackground: '#434C5E',
        black: '#3B4252', red: '#BF616A', green: '#A3BE8C', yellow: '#EBCB8B',
        blue: '#81A1C1', magenta: '#B48EAD', cyan: '#88C0D0', white: '#E5E9F0',
        brightBlack: '#4C566A', brightRed: '#BF616A', brightGreen: '#A3BE8C', brightYellow: '#EBCB8B',
        brightBlue: '#81A1C1', brightMagenta: '#B48EAD', brightCyan: '#8FBCBB', brightWhite: '#ECEFF4'
      };
    case 'latte':
      return {
        ...common,
        background: '#f5f5f4', foreground: '#44403c', cursor: '#78350f', selectionBackground: '#d6d3d1',
        black: '#292524', red: '#b91c1c', green: '#15803d', yellow: '#b45309',
        blue: '#1d4ed8', magenta: '#be185d', cyan: '#0e7490', white: '#a8a29e',
        brightBlack: '#57534e', brightRed: '#ef4444', brightGreen: '#22c55e', brightYellow: '#f59e0b',
        brightBlue: '#3b82f6', brightMagenta: '#ec4899', brightCyan: '#06b6d4', brightWhite: '#d6d3d1'
      };
    case 'dark':
    default:
      return {
        ...common,
        background: '#09090b', foreground: '#fafafa', cursor: '#fafafa', selectionBackground: '#27272a',
        black: '#27272a', red: '#ef4444', green: '#10b981', yellow: '#f59e0b',
        blue: '#3b82f6', magenta: '#d946ef', cyan: '#06b6d4', white: '#f4f4f5',
        brightBlack: '#52525b', brightRed: '#f87171', brightGreen: '#34d399', brightYellow: '#fbbf24',
        brightBlue: '#60a5fa', brightMagenta: '#e879f9', brightCyan: '#22d3ee', brightWhite: '#ffffff'
      };
  }
};

// --- 2. Helper: Debounce for Resize Performance ---
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedCallback = useCallback((...args: any[]) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  return debouncedCallback;
};

export default function TerminalView({ vpsId }: TerminalViewProps) {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { theme } = useTheme();

  // State
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

  // Refs for Cleanup
  const socketRef = useRef<Socket | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Actions ---
  const handleClose = () => {
    socketRef.current?.disconnect();
    router.push(`/dashboard/server/${vpsId}`);
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    // Wait for CSS transition to finish before refitting text
    setTimeout(() => {
      fitAddonRef.current?.fit();
      termRef.current?.focus();

      // Notify backend of new dimensions
      if (fitAddonRef.current && socketRef.current && socketRef.current.connected) {
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) socketRef.current.emit('term:resize', { vpsId, cols: dims.cols, rows: dims.rows });
      }
    }, 300);
  };

  const handleReconnect = () => {
    window.location.reload();
  };

  // --- Resize Logic ---
  const handleResize = useDebounce(() => {
    if (fitAddonRef.current && socketRef.current && socketRef.current.connected) {
      fitAddonRef.current.fit();
      const dims = fitAddonRef.current.proposeDimensions();
      if (dims) {
        socketRef.current.emit('term:resize', { vpsId, cols: dims.cols, rows: dims.rows });
      }
    }
  }, 150);

  // --- Theme Syncing ---
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getThemeColors(theme);
    }
  }, [theme]);

  // --- Main Initialization ---
  useEffect(() => {
    if (!terminalContainerRef.current || !user) return;

    const initTerminal = async () => {
      try {
        const token = await getIdToken();
        const colors = getThemeColors(theme);

        // 1. Configure Xterm (Production Grade Settings)
        const term = new Terminal({
          cursorBlink: true,
          cursorStyle: 'block',
          cursorWidth: 2,
          fontFamily: 'Menlo, Consolas, "JetBrains Mono", monospace',
          fontSize: 14,
          lineHeight: 1.3,
          theme: colors,
          allowProposedApi: true,
          scrollback: 5000,
          disableStdin: true, // Block input until connected
          macOptionIsMeta: true,
          rightClickSelectsWord: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        // Clean container
        terminalContainerRef.current!.innerHTML = '';
        term.open(terminalContainerRef.current!);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        // 2. Keyboard Shortcuts (Copy/Paste Railguards)
        term.attachCustomKeyEventHandler((event) => {
          // Ctrl+V / Cmd+V (Paste)
          if ((event.ctrlKey || event.metaKey) && event.code === 'KeyV' && event.type === 'keydown') {
            navigator.clipboard.readText()
              .then(text => {
                if (socketRef.current?.connected) {
                  socketRef.current.emit('term:input', { vpsId, data: text });
                }
              })
              .catch(() => toast.error('Clipboard access denied'));
            return false;
          }
          // Ctrl+C / Cmd+C (Copy)
          if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC' && event.type === 'keydown') {
            const selection = term.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection);
              toast.success('Copied to clipboard');
              return false; // Prevent sending Ctrl+C to shell if copying
            }
            return true; // Send SIGINT
          }
          return true;
        });

        // 3. Socket Connection
        let socketUrl = 'http://localhost:5000';
        try {
          const urlObj = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
          socketUrl = urlObj.origin;
        } catch (e) { }

        const socket = io(socketUrl, {
          path: '/api/socket',
          auth: { token, type: 'client' },
          reconnection: false,
          transports: ['websocket'],
          timeout: 10000,
        });

        socketRef.current = socket;

        // --- Connection Railguards ---
        connectionTimeoutRef.current = setTimeout(() => {
          if (!socket.connected) {
            socket.disconnect();
            setStatus('error');
            setErrorMsg('Connection timed out. Agent may be offline.');
          }
        }, 15000);

        socket.on('connect', () => {
          if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
          setStatus('connected');
          term.options.disableStdin = false; // Enable input

          socket.emit('term:connect', { vpsId });

          // Resize handshake after connection settles
          setTimeout(() => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) socket.emit('term:resize', { vpsId, cols: dims.cols, rows: dims.rows });
            term.focus();
          }, 200);
        });

        socket.on('disconnect', (reason) => {
          setStatus('disconnected');
          term.options.disableStdin = true;
          if (reason !== 'io client disconnect') {
            term.write('\r\n\x1b[33m[Connection Closed]\x1b[0m\r\n');
          }
        });

        socket.on('connect_error', (err) => {
          if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
          setStatus('error');
          setErrorMsg(err.message === 'xhr poll error' ? 'Network error' : err.message);
          term.options.disableStdin = true;
        });

        // --- Data Flow ---
        socket.on('term:output', (data) => {
          // Write directly. The Agent now handles PS1 colorization.
          term.write(data);
        });

        socket.on('term:error', (msg) => {
          term.write(`\r\n\x1b[31mSystem Error: ${msg}\x1b[0m\r\n`);
        });

        term.onData((data) => {
          if (socket.connected) {
            socket.emit('term:input', { vpsId, data });
          }
        });

        // Window Resize Listener
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
          socket.disconnect();
          term.dispose();
        };

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message);
      }
    };

    initTerminal();

    return () => {
      socketRef.current?.disconnect();
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, [vpsId, user]);

  // --- Render ---
  const currentColors = getThemeColors(theme);

  // Error State UI
  if (status === 'error' || status === 'disconnected') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-card rounded-lg border border-border p-8 shadow-lg">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4 border border-destructive/20 animate-in fade-in zoom-in-95">
          {status === 'error' ? <AlertCircle className="h-10 w-10" /> : <ZapOff className="h-10 w-10" />}
        </div>
        <h3 className="text-xl font-bold mb-2">Session Ended</h3>
        <p className="text-sm text-muted-foreground mb-8 text-center max-w-xs leading-relaxed">
          {errorMsg || 'The secure connection was closed. Check if the server agent is running.'}
        </p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleClose}>Back to Dashboard</Button>
          <Button onClick={handleReconnect} className="shadow-lg shadow-primary/20">
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
        isMaximized ? "fixed inset-0 z-[100] rounded-none border-0" : "h-full w-full rounded-xl relative"
      )}
    >
      {/* Mac-Style Header */}
      <div className="h-10 bg-muted/40 border-b border-border flex items-center justify-between px-4 shrink-0 select-none backdrop-blur-sm">
        {/* Window Controls */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['✕'] after:text-[8px] after:text-black/50"
            title="Close Session"
          />
          <button
            onClick={isMaximized ? handleMaximize : undefined}
            className={`w-3 h-3 rounded-full border transition-all shadow-sm flex items-center justify-center ${isMaximized ? 'bg-[#ffbd2e] border-[#dea123] hover:brightness-90 cursor-pointer group-hover:after:content-[\'−\'] after:text-[8px] after:text-black/50' : 'bg-secondary border-border cursor-default opacity-50'}`}
            title="Minimize"
          />
          <button
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['⤢'] after:text-[8px] after:text-black/50"
            title="Fullscreen"
          />
        </div>

        {/* Session Identity */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground opacity-90 absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span>root@{vpsId.slice(0, 8)}</span>
        </div>

        {/* Connection Indicator */}
        <div className="flex items-center">
          {status === 'connected' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
              SSH-WS
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-pulse">
              Connecting...
            </div>
          )}
        </div>
      </div>

      {/* Terminal Canvas */}
      <div
        className="flex-1 relative p-4 overflow-hidden cursor-text"
        style={{ backgroundColor: currentColors.background }}
        onClick={() => termRef.current?.focus()}
      >
        <div ref={terminalContainerRef} className="h-full w-full outline-none" />

        {/* Centered Loading Overlay */}
        {status === 'connecting' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm animate-in fade-in">
            <Spinner className="h-10 w-10 text-primary mb-4" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Secure Session...</p>
          </div>
        )}
      </div>
    </div>
  );
};