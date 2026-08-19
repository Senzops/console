import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AlertCircle, RefreshCw, ChevronDown, Check } from "lucide-react"
import { createPortal } from "react-dom"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Spinner ---
// An "alive" indeterminate spinner: the ring rotates continuously while its
// arc grows and shrinks (Material/Linear style). Color follows `currentColor`
// (e.g. text-primary) and size follows width/height (e.g. h-4 w-4) — fully
// drop-in compatible with the previous icon-style spinner.
export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  /** Accessible name announced by screen readers. Defaults to "Loading". */
  label?: string
}
export const Spinner = ({ className, label = "Loading", ...props }: SpinnerProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    role="status"
    aria-label={label}
    className={cn(className)}
    {...props}
  >
    <circle
      className="spinner-arc"
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

// --- Skeleton ---
// A theme-aware content placeholder with a soft shimmer (see `.skeleton` in
// globals.css). Use it to mirror the shape of content that is still loading so
// the layout doesn't shift when data arrives. Size/shape via className, e.g.
// <Skeleton className="h-4 w-32" /> or <Skeleton className="h-9 w-9 rounded-full" />.
// Purely decorative: it is aria-hidden, so the loading state must be announced
// by an ancestor (e.g. a container with role="status" aria-busy).
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}
export const Skeleton = ({ className, ...props }: SkeletonProps) => (
  <div aria-hidden="true" className={cn("skeleton rounded-md", className)} {...props} />
)

// --- Card ---
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />
))
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

// --- Button ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  }
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  }
  return (
    <button ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} {...props} />
  )
})
Button.displayName = "Button"

// --- Select (Custom Dropdown) ---
interface SelectContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  value: string
  onValueChange: (value: string) => void
  disabled: boolean
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentId: string
  highlightedValue: string | null
  setHighlightedValue: (value: string | null) => void
  itemMap: React.MutableRefObject<Map<string, { label: string; disabled: boolean; ref: HTMLDivElement | null }>>
  registerItem: (value: string, label: string, disabled: boolean, ref: HTMLDivElement | null) => void
  unregisterItem: (value: string) => void
  labelMap: Map<string, string>
  setLabelMap: React.Dispatch<React.SetStateAction<Map<string, string>>>
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const ctx = React.useContext(SelectContext)
  if (!ctx) throw new Error("Select compound components must be used within <Select>")
  return ctx
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  name?: string
  children: React.ReactNode
}

export function Select({ value, onValueChange, disabled = false, open: controlledOpen, onOpenChange, name, children }: SelectProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = React.useCallback((v: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(v)
    onOpenChange?.(v)
  }, [controlledOpen, onOpenChange])

  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const contentId = React.useId()
  const [highlightedValue, setHighlightedValue] = React.useState<string | null>(null)
  const itemMap = React.useRef(new Map<string, { label: string; disabled: boolean; ref: HTMLDivElement | null }>())
  const [labelMap, setLabelMap] = React.useState<Map<string, string>>(() => new Map())

  const registerItem = React.useCallback((val: string, label: string, dis: boolean, ref: HTMLDivElement | null) => {
    itemMap.current.set(val, { label, disabled: dis, ref })
    setLabelMap(prev => {
      if (prev.get(val) === label) return prev
      const next = new Map(prev)
      next.set(val, label)
      return next
    })
  }, [])

  const unregisterItem = React.useCallback((val: string) => {
    itemMap.current.delete(val)
  }, [])

  const ctx = React.useMemo<SelectContextValue>(() => ({
    open, setOpen, value, onValueChange, disabled, triggerRef, contentId,
    highlightedValue, setHighlightedValue, itemMap, registerItem, unregisterItem,
    labelMap, setLabelMap,
  }), [open, setOpen, value, onValueChange, disabled, contentId, highlightedValue, registerItem, unregisterItem, labelMap])

  return (
    <SelectContext.Provider value={ctx}>
      {children}
      {name && <input type="hidden" name={name} value={value} />}
    </SelectContext.Provider>
  )
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, forwardedRef) => {
    const ctx = useSelectContext()
    const composedRef = React.useCallback((node: HTMLButtonElement | null) => {
      (ctx.triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    }, [ctx.triggerRef, forwardedRef])

    const getOrderedEnabledValues = React.useCallback(() => {
      const items = Array.from(ctx.itemMap.current.entries()).filter(([, item]) => !item.disabled)
      const contentEl = document.getElementById(ctx.contentId)
      if (!contentEl) return items.map(([v]) => v)
      const orderedValues: string[] = []
      const allOptionEls = contentEl.querySelectorAll<HTMLDivElement>("[data-select-item-value]")
      allOptionEls.forEach((el) => {
        const v = el.getAttribute("data-select-item-value")
        if (v && items.some(([iv]) => iv === v)) orderedValues.push(v)
      })
      return orderedValues
    }, [ctx.itemMap, ctx.contentId])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      if (ctx.disabled) return
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        if (!ctx.open) {
          ctx.setOpen(true)
          const vals = getOrderedEnabledValues()
          const idx = vals.indexOf(ctx.value)
          ctx.setHighlightedValue(idx >= 0 ? vals[idx] : vals[0] ?? null)
        }
      }
    }, [ctx, getOrderedEnabledValues])

    return (
      <button
        ref={composedRef}
        type="button"
        role="combobox"
        aria-expanded={ctx.open}
        aria-haspopup="listbox"
        aria-controls={ctx.contentId}
        disabled={ctx.disabled}
        onClick={() => {
          if (!ctx.disabled) {
            ctx.setOpen(!ctx.open)
            if (!ctx.open) {
              const vals = getOrderedEnabledValues()
              const idx = vals.indexOf(ctx.value)
              ctx.setHighlightedValue(idx >= 0 ? vals[idx] : vals[0] ?? null)
            }
          }
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <span className="truncate">{children}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = useSelectContext()
  const label = ctx.labelMap.get(ctx.value)
  return <>{label ?? placeholder ?? ""}</>
}

function useFloatingPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
  open: boolean,
) {
  const [style, setStyle] = React.useState<React.CSSProperties>({ position: "fixed", opacity: 0, pointerEvents: "none" })
  const [side, setSide] = React.useState<"bottom" | "top">("bottom")

  const recompute = React.useCallback(() => {
    const trigger = triggerRef.current
    const content = contentRef.current
    if (!trigger || !content) return
    const rect = trigger.getBoundingClientRect()
    const contentHeight = content.scrollHeight
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const gap = 4
    const spaceBelow = viewportHeight - rect.bottom - gap
    const spaceAbove = rect.top - gap
    const fitsBelow = spaceBelow >= Math.min(contentHeight, 256)
    const placeSide = fitsBelow ? "bottom" : spaceAbove > spaceBelow ? "top" : "bottom"
    setSide(placeSide)

    let top: number
    if (placeSide === "bottom") {
      top = rect.bottom + gap
    } else {
      top = rect.top - gap - Math.min(contentHeight, 256)
    }
    let left = rect.left
    const width = rect.width
    if (left + width > viewportWidth - 8) left = viewportWidth - width - 8
    if (left < 8) left = 8
    top = Math.max(8, Math.min(top, viewportHeight - 8 - Math.min(contentHeight, 256)))

    setStyle({
      position: "fixed",
      top,
      left,
      width,
      maxHeight: Math.min(256, placeSide === "bottom" ? spaceBelow - 8 : spaceAbove - 8),
      opacity: 1,
      pointerEvents: "auto",
      zIndex: 9999,
    })
  }, [triggerRef, contentRef])

  React.useEffect(() => {
    if (!open) return
    recompute()
    const onUpdate = () => recompute()
    window.addEventListener("scroll", onUpdate, true)
    window.addEventListener("resize", onUpdate)
    return () => {
      window.removeEventListener("scroll", onUpdate, true)
      window.removeEventListener("resize", onUpdate)
    }
  }, [open, recompute])

  return { style, side }
}

function SelectScrollIndicators({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [canScrollUp, setCanScrollUp] = React.useState(false)
  const [canScrollDown, setCanScrollDown] = React.useState(false)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const check = () => {
      setCanScrollUp(el.scrollTop > 2)
      setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", check); ro.disconnect() }
  }, [containerRef])

  return (
    <>
      {canScrollUp && (
        <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none rounded-t-md z-10" style={{ background: "linear-gradient(to bottom, hsl(var(--popover)), transparent)" }} />
      )}
      {canScrollDown && (
        <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none rounded-b-md z-10" style={{ background: "linear-gradient(to top, hsl(var(--popover)), transparent)" }} />
      )}
    </>
  )
}

export function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = useSelectContext()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const { style, side } = useFloatingPosition(ctx.triggerRef, contentRef, ctx.open)

  const getOrderedEnabledValues = React.useCallback(() => {
    const contentEl = contentRef.current
    if (!contentEl) return []
    const vals: string[] = []
    contentEl.querySelectorAll<HTMLDivElement>("[data-select-item-value]").forEach((el) => {
      const v = el.getAttribute("data-select-item-value")
      const d = el.getAttribute("data-disabled")
      if (v && d !== "true") vals.push(v)
    })
    return vals
  }, [])

  React.useEffect(() => {
    if (!ctx.open) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (ctx.triggerRef.current?.contains(target)) return
      if (contentRef.current?.contains(target)) return
      ctx.setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [ctx.open, ctx])

  React.useEffect(() => {
    if (!ctx.open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const vals = getOrderedEnabledValues()
      if (!vals.length) return
      const currentIdx = ctx.highlightedValue ? vals.indexOf(ctx.highlightedValue) : -1

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault()
          const next = currentIdx < vals.length - 1 ? currentIdx + 1 : 0
          ctx.setHighlightedValue(vals[next])
          ctx.itemMap.current.get(vals[next])?.ref?.scrollIntoView({ block: "nearest" })
          break
        }
        case "ArrowUp": {
          e.preventDefault()
          const prev = currentIdx > 0 ? currentIdx - 1 : vals.length - 1
          ctx.setHighlightedValue(vals[prev])
          ctx.itemMap.current.get(vals[prev])?.ref?.scrollIntoView({ block: "nearest" })
          break
        }
        case "Home": {
          e.preventDefault()
          ctx.setHighlightedValue(vals[0])
          ctx.itemMap.current.get(vals[0])?.ref?.scrollIntoView({ block: "nearest" })
          break
        }
        case "End": {
          e.preventDefault()
          ctx.setHighlightedValue(vals[vals.length - 1])
          ctx.itemMap.current.get(vals[vals.length - 1])?.ref?.scrollIntoView({ block: "nearest" })
          break
        }
        case "Enter":
        case " ": {
          e.preventDefault()
          if (ctx.highlightedValue) {
            ctx.onValueChange(ctx.highlightedValue)
            ctx.setOpen(false)
            ctx.triggerRef.current?.focus()
          }
          break
        }
        case "Escape": {
          e.preventDefault()
          ctx.setOpen(false)
          ctx.triggerRef.current?.focus()
          break
        }
        case "Tab": {
          ctx.setOpen(false)
          break
        }
        default: {
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const char = e.key.toLowerCase()
            const match = vals.find((v) => {
              const item = ctx.itemMap.current.get(v)
              return item?.label.toLowerCase().startsWith(char)
            })
            if (match) {
              ctx.setHighlightedValue(match)
              ctx.itemMap.current.get(match)?.ref?.scrollIntoView({ block: "nearest" })
            }
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [ctx, getOrderedEnabledValues])

  const animClass = side === "bottom"
    ? "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
    : "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"

  return (
    <>
      {/* Hidden collector: always rendered so items register their labels for SelectValue */}
      {!ctx.open && <div style={{ display: "none" }}>{children}</div>}
      {ctx.open && createPortal(
        <div className="relative" style={style}>
          <SelectScrollIndicators containerRef={contentRef} />
          <div
            ref={contentRef}
            id={ctx.contentId}
            role="listbox"
            aria-activedescendant={ctx.highlightedValue ? `select-item-${ctx.highlightedValue}` : undefined}
            style={{ maxHeight: "inherit" }}
            className={cn(
              "overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none no-scrollbar",
              animClass,
              "duration-150",
              className
            )}
          >
            <div className="p-1">{children}</div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

interface SelectItemProps {
  value: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export function SelectItem({ value, disabled = false, className, children }: SelectItemProps) {
  const ctx = useSelectContext()
  const ref = React.useRef<HTMLDivElement>(null)
  const textRef = React.useRef<HTMLSpanElement>(null)

  React.useLayoutEffect(() => {
    const el = ref.current
    const label = textRef.current?.textContent ?? ""
    ctx.registerItem(value, label, disabled, el)
    return () => ctx.unregisterItem(value)
  }, [value, children, disabled, ctx.registerItem, ctx.unregisterItem])

  const isSelected = ctx.value === value
  const isHighlighted = ctx.highlightedValue === value

  return (
    <div
      ref={ref}
      id={`select-item-${value}`}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled}
      data-select-item-value={value}
      data-disabled={disabled}
      onMouseEnter={() => { if (!disabled) ctx.setHighlightedValue(value) }}
      onMouseLeave={() => { if (ctx.highlightedValue === value) ctx.setHighlightedValue(null) }}
      onClick={() => {
        if (disabled) return
        ctx.onValueChange(value)
        ctx.setOpen(false)
        ctx.triggerRef.current?.focus()
      }}
      className={cn(
        "relative flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm py-1.5 px-2 text-sm outline-none transition-colors",
        isHighlighted && !disabled && "bg-accent text-accent-foreground",
        disabled && "opacity-50 pointer-events-none",
        !disabled && "cursor-pointer",
        className
      )}
    >
      <span ref={textRef} className="truncate">{children}</span>
      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
    </div>
  )
}

export function SelectGroup({ children }: { children: React.ReactNode }) {
  return <div role="group">{children}</div>
}

export function SelectLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("py-1.5 px-2 text-xs font-semibold text-muted-foreground", className)}>
      {children}
    </div>
  )
}

export function SelectSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} />
}

// --- Badge ---
export const Badge = ({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }) => {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
    success: "border-transparent bg-emerald-500/15 text-emerald-500",
    warning: "border-transparent bg-yellow-500/15 text-yellow-500",
  }
  return <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props} />
}

// --- Modal (Dialog) ---
export const Dialog = ({ open, onClose, children, title, className }: { open: boolean; onClose: () => void; children: React.ReactNode; title: string; className?: string }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className={cn("relative w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col rounded-xl border bg-card text-card-foreground shadow-lg animate-in fade-in zoom-in-95 duration-200", className)}>
        <div className="flex flex-col space-y-1.5 p-6 pb-4 border-b border-border/50 shrink-0">
          <h3 className="font-semibold leading-none tracking-tight text-lg">{title}</h3>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
        <div className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 cursor-pointer" onClick={onClose}>
          ✕
        </div>
      </div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>,
    document.body
  );
}

// --- Avatar ---
export const Avatar = ({ src, fallback, className }: { src?: string; fallback: string; className?: string }) => (
  <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted", className)}>
    {src ? (
      <img className="aspect-square h-full w-full object-cover" src={src} alt="Avatar" />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
        {fallback}
      </div>
    )}
  </div>
)

// --- Input ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

// --- Label ---
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
    {...props}
  />
))
Label.displayName = "Label"

// --- Reusable Data Error Component ---
export const DataError = ({ onRetry, message }: { onRetry?: () => Promise<any> | void, message?: string }) => {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 600);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card border border-destructive/20 rounded-xl shadow-sm w-full max-w-md mx-auto my-8">
      <div className="p-4 bg-destructive/10 rounded-full mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Failed to load data</h3>
      <p className="text-sm text-muted-foreground mb-6">
        {message || "We encountered an error while communicating with the server. Please check your connection and try again."}
      </p>
      <Button 
        onClick={handleRetry} 
        disabled={isRetrying}
        variant="outline" 
        className="gap-2 border-border hover:bg-secondary"
      >
        {isRetrying ? (
          <><Spinner className="h-4 w-4 mr-1" /> Retrying...</>
        ) : (
          <><RefreshCw className="h-4 w-4" /> Try Again</>
        )}
      </Button>
    </div>
  );
};
// --- Tabs ---
// Codifies the two tab treatments already in use rather than introducing a
// third: the underline style from the log detail drawer (page and panel level
// navigation) and the segmented pill from the web analytics distribution cards
// (in-card view switching). Adds the keyboard and ARIA semantics those inline
// implementations lack — arrow keys move between tabs, Home/End jump to the
// ends, and the active tab is announced.
export interface TabItem {
  id: string;
  label: string;
  /** Optional trailing count/status, e.g. a Badge. */
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  variant?: "underline" | "segmented";
  className?: string;
  /** Accessible name for the tab list. */
  label?: string;
}

export const Tabs = ({
  items,
  value,
  onChange,
  variant = "underline",
  className,
  label = "Sections",
}: TabsProps) => {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const enabled = items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => !item.disabled);
    if (enabled.length === 0) return;
    const position = enabled.findIndex(({ i }) => i === from);
    const next = enabled[(position + delta + enabled.length) % enabled.length];
    refs.current[next.i]?.focus();
    onChange(next.item.id);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") { e.preventDefault(); move(index, 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); move(index, -1); }
    if (e.key === "Home") {
      e.preventDefault();
      const first = items.findIndex((i) => !i.disabled);
      if (first >= 0) { refs.current[first]?.focus(); onChange(items[first].id); }
    }
    if (e.key === "End") {
      e.preventDefault();
      for (let i = items.length - 1; i >= 0; i--) {
        if (!items[i].disabled) { refs.current[i]?.focus(); onChange(items[i].id); break; }
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        variant === "underline"
          ? "flex items-center gap-1 border-b border-border/60"
          : "inline-flex bg-muted/50 rounded-lg p-0.5",
        className
      )}
    >
      {items.map((item, index) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => { refs.current[index] = el; }}
            role="tab"
            type="button"
            aria-selected={active}
            aria-disabled={item.disabled || undefined}
            disabled={item.disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => !item.disabled && onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              variant === "underline"
                ? cn(
                    "px-3 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px",
                    active
                      ? "border-blue-500 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )
                : cn(
                    "px-2 py-0.5 text-[10px] uppercase font-bold rounded-md",
                    active
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )
            )}
          >
            {item.label}
            {item.badge}
          </button>
        );
      })}
    </div>
  );
};
