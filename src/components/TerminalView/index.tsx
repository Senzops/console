import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Spinner, Button } from '../Core';
import { AlertCircle, RefreshCw, Copy, Terminal as TerminalIcon } from 'lucide-react';
import 'xterm/css/xterm.css';
import { toast } from 'sonner';

interface TerminalViewProps {
  vpsId: string;
}

// 1. Theme Configuration
const getThemeColors = (theme: string) => {
  const common = {
    cursor: '#a1a1aa',
    cursorAccent: '#000',
    selectionForeground: '#ffffff',
  };

  switch (theme) {
    case 'light':
      return { ...common, background: '#ffffff', foreground: '#18181b', selectionBackground: '#3b82f6' };
    case 'nord':
      return { ...common, background: '#2E3440', foreground: '#D8DEE9', selectionBackground: '#4C566A' };
    case 'latte':
      return { ...common, background: '#f5f5f4', foreground: '#44403c', selectionBackground: '#d6d3d1' };
    case 'dark':
    default:
      return {
        ...common,
        background: '#09090b', // Zinc-950
        foreground: '#fafafa',
        selectionBackground: '#27272a',
        black: '#09090b',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#fafafa',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      };
  }
};

export default function TerminalView({ vpsId }: TerminalViewProps) {
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const { user, getIdToken } = useAuth();
  const { theme } = useTheme();

  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // --- Initialize Terminal ---
  useEffect(() => {
    if (!terminalContainerRef.current || !user) return;

    const initTerminal = async () => {
      try {
        const token = await getIdToken();
        const colors = getThemeColors(theme);

        // Xterm Setup
        const term = new Terminal({
          cursorBlink: true,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          fontSize: 14,
          lineHeight: 1.2,
          theme: colors,
          allowProposedApi: true,
          convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        term.open(terminalContainerRef.current!);
        fitAddon.fit();

        termRef.current = term;
        fitAddonRef.current = fitAddon;

        // Custom Key Handling (Ctrl+Shift+C/V)
        term.attachCustomKeyEventHandler((event) => {
          // Copy: Ctrl + Shift + C
          if (event.ctrlKey && event.shiftKey && event.code === 'KeyC' && event.type === 'keydown') {
            const selection = term.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection);
              toast.success('Copied to clipboard');
            }
            return false;
          }
          // Paste: Ctrl + Shift + V
          if (event.ctrlKey && event.shiftKey && event.code === 'KeyV' && event.type === 'keydown') {
            navigator.clipboard.readText().then(text => {
              socketRef.current?.emit('term:input', { vpsId, data: text });
            });
            return false;
          }
          return true;
        });

        // Socket Setup
        let socketUrl = 'http://localhost:5000';
        try {
          const urlObj = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
          socketUrl = urlObj.origin;
        } catch (e) { }

        const socket = io(socketUrl, {
          path: '/api/socket',
          auth: { token, type: 'client' },
          reconnection: false
        });

        socketRef.current = socket;

        // Events
        socket.on('connect', () => {
          setStatus('connected');
          socket.emit('term:connect', { vpsId });
          // Send initial resize
          if (fitAddonRef.current) {
            const { cols, rows } = fitAddonRef.current.proposeDimensions() || { cols: 80, rows: 24 };
            socket.emit('term:resize', { vpsId, cols, rows });
          }
        });

        socket.on('connect_error', (err) => {
          setStatus('error');
          setErrorMsg(err.message);
          term.write(`\r\n\x1b[31mConnection Error: ${err.message}\x1b[0m\r\n`);
        });

        socket.on('disconnect', () => {
          setStatus('disconnected');
          term.write('\r\n\x1b[33mDisconnected from server.\x1b[0m\r\n');
        });

        socket.on('term:output', (data) => term.write(data));
        socket.on('term:error', (msg) => term.write(`\r\n\x1b[31mRemote Error: ${msg}\x1b[0m\r\n`));

        // Input Handling
        term.onData((data) => socket.emit('term:input', { vpsId, data }));

        term.onResize(({ cols, rows }) => socket.emit('term:resize', { vpsId, cols, rows }));

        // Window Resize Observer
        const resizeObserver = new ResizeObserver(() => {
          if (fitAddonRef.current && socketRef.current) {
            fitAddonRef.current.fit();
            const dims = fitAddonRef.current.proposeDimensions();
            if (dims) {
              socketRef.current.emit('term:resize', { vpsId, cols: dims.cols, rows: dims.rows });
            }
          }
        });
        resizeObserver.observe(terminalContainerRef.current);

        return () => {
          resizeObserver.disconnect();
          socket.disconnect();
          term.dispose();
        };

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message);
      }
    };

    const cleanup = initTerminal();
    return () => { socketRef.current?.disconnect(); };

  }, [vpsId, user]);

  // Dynamic Theme Update
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = getThemeColors(theme);
    }
  }, [theme]);

  if (status === 'error' || status === 'disconnected') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-card rounded-b-lg p-8">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold mb-2">Connection Lost</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs text-center">{errorMsg || 'Socket connection closed.'}</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Reconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full rounded-xl overflow-hidden border border-border shadow-2xl bg-card">
      {/* Modern Header / Title Bar */}
      <div className="h-9 bg-muted/50 border-b border-border flex items-center px-4 justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 group">
            <div className="w-3 h-3 rounded-full bg-red-500/80 group-hover:bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 group-hover:bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 group-hover:bg-green-500" />
          </div>
          <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <TerminalIcon className="h-3 w-3" />
            <span>root@senzor-agent:~</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-background/50 px-2 py-0.5 rounded border border-border/50">
          {status === 'connected' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> : <Spinner className="h-3 w-3" />}
          <span>{status === 'connected' ? 'SSH-Over-WS' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 relative bg-card p-1">
        <div ref={terminalContainerRef} className="h-full w-full" />
      </div>
    </div>
  );
};