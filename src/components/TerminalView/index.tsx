import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Spinner, Button, cn } from '../Core';
import { AlertCircle, RefreshCw, Terminal as TerminalIcon, Maximize2, Minimize2, X, Lock, Activity } from 'lucide-react';
import { toast } from 'sonner';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
  vpsId: string;
}

// 1. Precise Theme Colors
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

export default function TerminalView({ vpsId }: TerminalViewProps) {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const { theme } = useTheme();

  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = () => {
    socketRef.current?.disconnect();
    router.push(`/dashboard/server/${vpsId}`);
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    setTimeout(() => fitAddonRef.current?.fit(), 100);
  };

  // --- Theme Syncing ---
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getThemeColors(theme);
    }
  }, [theme]);

  // --- Init ---
  useEffect(() => {
    if (!terminalContainerRef.current || !user) return;

    const initTerminal = async () => {
      try {
        const token = await getIdToken();
        const colors = getThemeColors(theme);

        // Xterm Configuration
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
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        terminalContainerRef.current!.innerHTML = '';
        term.open(terminalContainerRef.current!);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        // Clipboard Handlers
        term.attachCustomKeyEventHandler((event) => {
          if (event.ctrlKey && event.code === 'KeyV' && event.type === 'keydown') {
            navigator.clipboard.readText().then(text => {
              socketRef.current?.emit('term:input', { vpsId, data: text });
              // Trigger processing on paste too
              setIsProcessing(true);
              if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
              processingTimeoutRef.current = setTimeout(() => setIsProcessing(false), 2000);
            }).catch(() => toast.error('Clipboard access denied'));
            return false;
          }
          if (event.ctrlKey && event.code === 'KeyC' && event.type === 'keydown') {
            const selection = term.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection);
              toast.success('Copied');
              return false;
            }
            return true;
          }
          return true;
        });

        // Socket Connection
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
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setStatus('connected');
          socket.emit('term:connect', { vpsId });

          setTimeout(() => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) socket.emit('term:resize', { vpsId, cols: dims.cols, rows: dims.rows });
            term.focus();
          }, 150);
        });

        socket.on('disconnect', () => setStatus('disconnected'));
        socket.on('connect_error', (err) => {
          setStatus('error');
          setErrorMsg(err.message);
        });

        // Handle Output with Colorization
        socket.on('term:output', (data) => {
          // Reset processing state on response
          setIsProcessing(false);
          if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);

          const brokenPromptRegex = /\\u@HOST:\\w\\\$/g;
          const containerRegex = /\\u@CONTAINER:\\w\\\$/g;

          let processed = data;

          if (brokenPromptRegex.test(data) || containerRegex.test(data)) {
            const colorized = '\r\n\x1b[1;32mroot@server\x1b[0m:\x1b[1;34m~\x1b[0m\x1b[1;36m$\x1b[0m \x1b[1;93m';
            processed = data.replace(brokenPromptRegex, colorized).replace(containerRegex, colorized);
          } else {
            if (processed.includes('\r')) {
              processed = processed.replace(/\r/g, '\x1b[0m\r');
            }
          }

          term.write(processed);
        });

        term.onData((data) => {
          if (socket.connected) {
            socket.emit('term:input', { vpsId, data });
            // Indicate processing
            setIsProcessing(true);
            if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
            // Timeout to clear processing if server hangs/is silent
            processingTimeoutRef.current = setTimeout(() => setIsProcessing(false), 2000);
          }
        });

        term.onResize(({ cols, rows }) => socket.emit('term:resize', { vpsId, cols, rows }));

        const handleResize = () => fitAddon.fit();
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          socket.disconnect();
          term.dispose();
        };

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message);
      }
    };

    initTerminal();
    return () => { socketRef.current?.disconnect(); };
  }, [vpsId, user]);

  const currentColors = getThemeColors(theme);

  if (status === 'error' || status === 'disconnected') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-card rounded-lg border border-border p-8 shadow-lg">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4"><AlertCircle className="h-10 w-10" /></div>
        <h3 className="text-xl font-bold mb-2">Session Terminated</h3>
        <p className="text-sm text-muted-foreground mb-8 text-center max-w-sm">{errorMsg || 'Connection closed.'}</p>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleClose}>Back</Button>
          <Button onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" /> Reconnect</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-card overflow-hidden transition-all duration-300 ease-in-out border border-border shadow-2xl",
        isMaximized ? "fixed inset-0 z-50 rounded-none" : "h-full w-full rounded-xl relative"
      )}
    >
      {/* Header */}
      <div className="h-10 bg-muted/40 border-b border-border flex items-center justify-between px-4 shrink-0 select-none backdrop-blur-sm">
        {/* Mac-style Controls */}
        <div className="flex items-center gap-2 group">
          <button onClick={handleClose} className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['✕'] after:text-[8px] after:text-black/50" />
          <button onClick={isMaximized ? handleMaximize : undefined} className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-90 transition-all shadow-sm" />
          <button onClick={handleMaximize} className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-90 transition-all shadow-sm flex items-center justify-center group-hover:after:content-['⤢'] after:text-[8px] after:text-black/50" />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground opacity-90 absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <Lock className="h-3 w-3 text-emerald-500" />
          <span>root@{vpsId.slice(0, 8)}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-medium animate-in fade-in duration-200">
              <Activity className="h-3 w-3 animate-pulse" />
              <span className="hidden sm:inline">Processing</span>
            </div>
          )}

          {status === 'connected' ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
              SSH-WS
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Spinner className="h-3 w-3" /> Connecting...</div>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div
        className="flex-1 relative p-4 overflow-hidden cursor-text"
        style={{ backgroundColor: currentColors.background }}
        onClick={() => termRef.current?.focus()}
      >
        <div ref={terminalContainerRef} className="h-full w-full outline-none" />
      </div>
    </div>
  );
};