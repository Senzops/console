import React, { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import { cn, Button } from '../Core';
import { Clock, Calendar, ChevronDown } from 'lucide-react';
import { useRecentRanges } from './useRecentRanges';
import { useTheme } from '../../lib/theme';

// --- Types ---
export type TimeRangeRelative = { type: 'relative'; range: string };
export type TimeRangeCustom = { type: 'custom'; start: string; end: string };
export type TimeRangeValue = TimeRangeRelative | TimeRangeCustom;

interface TimeRangePickerProps {
  value: TimeRangeValue;
  onChange: (value: TimeRangeValue) => void;
  maxRetentionDays?: number;
  className?: string;
}

// --- Constants ---
const PRESETS = [
  { value: '30m', label: '30 Minutes', hours: 0.5 },
  { value: '1h', label: '60 Minutes', hours: 1 },
  { value: '3h', label: '3 Hours', hours: 3 },
  { value: '6h', label: '6 Hours', hours: 6 },
  { value: '12h', label: '12 Hours', hours: 12 },
  { value: '24h', label: '24 Hours', hours: 24 },
  { value: '3d', label: '3 Days', hours: 72 },
  { value: '7d', label: '7 Days', hours: 168 },
] as const;

/** Preset values after which a visual separator is rendered */
const SEPARATOR_AFTER = new Set(['1h', '24h']);

// --- Helpers ---
function toLocalDatetimeString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatDisplayLabel(value: TimeRangeValue): string {
  if (value.type === 'relative') {
    return PRESETS.find(p => p.value === value.range)?.label || value.range;
  }
  const start = new Date(value.start);
  const end = new Date(value.end);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${fmt(start)} — ${fmt(end)}`;
}

function formatRecentLabel(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)} — ${fmt(e)}`;
}

/** True for themes that need inverted (light) calendar picker icons */
function isDarkTheme(theme: string): boolean {
  return theme === 'dark' || theme === 'nord';
}

/** Returns the color-scheme value matching the active theme */
function getColorScheme(theme: string): 'dark' | 'light' {
  return isDarkTheme(theme) ? 'dark' : 'light';
}

// --- Popover position ---
type PopoverAlign = { horizontal: 'left' | 'right'; vertical: 'top' | 'bottom' };

function computeAlign(trigger: HTMLElement): PopoverAlign {
  const rect = trigger.getBoundingClientRect();
  const POPOVER_W = 560;
  const POPOVER_H = 420;

  const horizontal: 'left' | 'right' =
    rect.right - POPOVER_W < 0 ? 'left' : 'right';

  const vertical: 'top' | 'bottom' =
    window.innerHeight - rect.bottom < POPOVER_H && rect.top > POPOVER_H
      ? 'top'
      : 'bottom';

  return { horizontal, vertical };
}

// --- Themed Calendar Button ---
function CalendarPickerButton({ inputRef, dark }: { inputRef: React.RefObject<HTMLInputElement | null>; dark: boolean }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => {
        try { inputRef.current?.showPicker(); } catch { inputRef.current?.focus(); }
      }}
      className={cn(
        'flex items-center justify-center h-8 w-8 shrink-0 rounded-md border border-input bg-transparent transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
    >
      <Calendar className={cn('h-3.5 w-3.5', dark ? 'text-muted-foreground' : 'text-muted-foreground')} />
    </button>
  );
}

// --- Component ---
export function TimeRangePicker({ value, onChange, maxRetentionDays = 7, className }: TimeRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customError, setCustomError] = useState('');
  const [align, setAlign] = useState<PopoverAlign>({ horizontal: 'right', vertical: 'bottom' });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const { recentRanges, addRecent } = useRecentRanges();
  const { theme } = useTheme();
  const colorScheme = getColorScheme(theme);
  const dark = isDarkTheme(theme);

  const retentionHours = maxRetentionDays * 24;

  // Compute min/max for datetime-local inputs
  const { minDatetime, maxDatetime } = useMemo(() => {
    const now = new Date();
    const min = new Date(now.getTime() - maxRetentionDays * 24 * 60 * 60 * 1000);
    return {
      minDatetime: toLocalDatetimeString(min),
      maxDatetime: toLocalDatetimeString(now),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxRetentionDays, open]);

  // Initialize custom inputs when popover opens
  useEffect(() => {
    if (open) {
      if (value.type === 'custom') {
        setCustomStart(toLocalDatetimeString(new Date(value.start)));
        setCustomEnd(toLocalDatetimeString(new Date(value.end)));
      } else {
        const now = new Date();
        const preset = PRESETS.find(p => p.value === value.range);
        const hoursBack = preset?.hours || 24;
        setCustomStart(toLocalDatetimeString(new Date(now.getTime() - hoursBack * 60 * 60 * 1000)));
        setCustomEnd(toLocalDatetimeString(now));
      }
      setCustomError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Viewport-aware popover positioning
  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      setAlign(computeAlign(triggerRef.current));
    }
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handlePresetSelect = useCallback((preset: string) => {
    onChange({ type: 'relative', range: preset });
    setOpen(false);
  }, [onChange]);

  const handleCustomApply = useCallback(() => {
    if (!customStart || !customEnd) {
      setCustomError('Both start and end are required');
      return;
    }
    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setCustomError('Invalid date format');
      return;
    }
    if (startDate >= endDate) {
      setCustomError('Start must be before end');
      return;
    }
    if (endDate > new Date()) {
      setCustomError('End cannot be in the future');
      return;
    }

    const startUtc = startDate.toISOString();
    const endUtc = endDate.toISOString();
    const label = formatRecentLabel(startUtc, endUtc);

    addRecent(startUtc, endUtc, label);
    onChange({ type: 'custom', start: startUtc, end: endUtc });
    setCustomError('');
    setOpen(false);
  }, [customStart, customEnd, onChange, addRecent]);

  const handleSetEndNow = useCallback(() => {
    setCustomEnd(toLocalDatetimeString(new Date()));
    setCustomError('');
  }, []);

  const handleRecentSelect = useCallback((r: { start: string; end: string; label: string }) => {
    addRecent(r.start, r.end, r.label);
    onChange({ type: 'custom', start: r.start, end: r.end });
    setOpen(false);
  }, [onChange, addRecent]);

  const displayLabel = formatDisplayLabel(value);

  // Dynamic popover classes based on viewport measurement
  const popoverPositionCls = cn(
    align.horizontal === 'right' ? 'right-0' : 'left-0',
    align.vertical === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
  );

  // Shared datetime input classes — hide native picker icon (replaced by CalendarPickerButton)
  const dateInputCls = cn(
    'flex h-8 w-full min-w-0 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm transition-colors',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
    '[&::-webkit-calendar-picker-indicator]:hidden',
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm',
          'ring-offset-background transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          open && 'ring-1 ring-ring',
        )}
      >
        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[220px]">{displayLabel}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Popover */}
      {open && (
        <div className={cn(
          'absolute z-[300] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
          'animate-in fade-in slide-in-from-top-1 duration-150',
          'flex flex-col sm:flex-row',
          'max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-4rem)] overflow-y-auto',
          popoverPositionCls,
        )}>
          {/* Left Panel — Relative Presets */}
          <div className="w-full sm:w-40 border-b sm:border-b-0 sm:border-r border-border p-1.5 shrink-0">
            <div className="px-2 py-1.5 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Relative</span>
            </div>
            {PRESETS.map(preset => {
              const disabled = preset.hours > retentionHours;
              const isActive = value.type === 'relative' && value.range === preset.value;
              return (
                <React.Fragment key={preset.value}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handlePresetSelect(preset.value)}
                    className={cn(
                      'flex items-center w-full px-2.5 py-1.5 rounded-md text-sm transition-colors text-left',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent text-foreground',
                      disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                    )}
                    title={disabled ? `Data not available beyond ${maxRetentionDays} days` : undefined}
                  >
                    {preset.label}
                  </button>
                  {SEPARATOR_AFTER.has(preset.value) && (
                    <div className="h-px bg-border mx-2 my-1" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right Panel — Custom Range */}
          <div className="w-full sm:w-[380px] p-3 flex flex-col">
            <div className="mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Custom Range</span>
            </div>

            {/* Start / End — Single Row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">From</label>
                <div className="flex items-center gap-1">
                  <input
                    ref={startInputRef}
                    type="datetime-local"
                    value={customStart}
                    onChange={(e) => { setCustomStart(e.target.value); setCustomError(''); }}
                    min={minDatetime}
                    max={maxDatetime}
                    style={{ colorScheme }}
                    className={dateInputCls}
                  />
                  <CalendarPickerButton inputRef={startInputRef} dark={dark} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">To</label>
                <div className="flex items-center gap-1">
                  <input
                    ref={endInputRef}
                    type="datetime-local"
                    value={customEnd}
                    onChange={(e) => { setCustomEnd(e.target.value); setCustomError(''); }}
                    min={minDatetime}
                    max={maxDatetime}
                    style={{ colorScheme }}
                    className={dateInputCls}
                  />
                  <CalendarPickerButton inputRef={endInputRef} dark={dark} />
                </div>
              </div>
            </div>

            {/* Error */}
            {customError && (
              <p className="text-xs text-destructive mb-2">{customError}</p>
            )}

            {/* Action Buttons — Set End Now + Apply */}
            <div className="flex items-center gap-2 mb-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetEndNow}
                className="flex-1 text-xs h-8"
              >
                Set End to Now
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCustomApply}
                className="flex-1 text-xs h-8"
              >
                Apply
              </Button>
            </div>

            {/* Recently Used */}
            {recentRanges.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 mb-1.5 border-t border-border pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recently Used</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {recentRanges.slice(0, 3).map((r) => {
                    const isActive = value.type === 'custom' && value.start === r.start && value.end === r.end;
                    return (
                      <button
                        key={`${r.start}_${r.end}`}
                        type="button"
                        onClick={() => handleRecentSelect(r)}
                        className={cn(
                          'flex items-center px-2 py-1.5 rounded-md text-xs transition-colors text-left',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-accent text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span className="truncate">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Utility: Build query string from TimeRangeValue ---
export function buildTimeRangeQuery(value: TimeRangeValue): string {
  if (value.type === 'relative') {
    return `range=${value.range}`;
  }
  return `start=${encodeURIComponent(value.start)}&end=${encodeURIComponent(value.end)}`;
}

// --- Re-exports ---
export { usePersistedTimeRange } from './usePersistedTimeRange';
export type { TimeRangePickerProps };
