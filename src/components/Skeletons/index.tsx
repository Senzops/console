import * as React from "react"
import { Card, CardContent, CardHeader, Skeleton, cn } from "../Core"

/*
  Skeleton library
  -----------------
  Composable, theme-aware loading placeholders that mirror the real dashboard
  layouts so there is no content shift (CLS) when data arrives. The base
  `<Skeleton />` primitive lives in components/Core; this module composes it into
  reusable blocks (stat cards, chart cards, tables, headers) and page-level
  skeletons that each dashboard renders during its initial load.

  Accessibility: wrap a screen in <SkeletonScreen> (or set role="status" +
  aria-busy on the outer container yourself) so the loading state is announced
  once; the individual <Skeleton /> blocks are aria-hidden.
*/

// --- Screen wrapper -----------------------------------------------------------
// Announces a single loading state to assistive tech and provides the standard
// dashboard page padding/width so skeletons line up with real content.
export const SkeletonScreen = ({
  className,
  label = "Loading",
  children,
}: {
  className?: string
  label?: string
  children: React.ReactNode
}) => (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    className={cn("p-6 md:p-8 max-w-7xl mx-auto", className)}
  >
    {/* The visually-hidden label must NOT sit inside the spaced flow below:
        as a layout sibling it would push the first real block down by one
        `space-y` step (a phantom top margin the loaded page doesn't have).
        Keeping it as a sibling of the spaced container avoids that gap. */}
    <span className="sr-only">{label}</span>
    <div className="space-y-6">{children}</div>
  </div>
)

// --- Primitive blocks ---------------------------------------------------------

/** A single line of text. Width via className (e.g. "w-32"). */
export const SkeletonLine = ({ className }: { className?: string }) => (
  <Skeleton className={cn("h-4", className)} />
)

/** A pill/badge-shaped placeholder. */
export const SkeletonPill = ({ className }: { className?: string }) => (
  <Skeleton className={cn("h-5 w-16 rounded-full", className)} />
)

/** A square icon-button placeholder (matches Button size="icon" → h-9 w-9). */
export const SkeletonIconButton = ({ className }: { className?: string }) => (
  <Skeleton className={cn("h-9 w-9 rounded-md", className)} />
)

// --- Composite blocks ---------------------------------------------------------

/** Mirrors the dashboard page header bar (title + meta + action buttons). */
export const SkeletonHeaderBar = ({ actions = 4 }: { actions?: number }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-48" />
        <SkeletonPill />
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="h-9 w-32 rounded-md" />
      {Array.from({ length: actions }).map((_, i) => (
        <SkeletonIconButton key={i} />
      ))}
    </div>
  </div>
)

/**
 * Header for list / management pages (Logs, Errors, Incidents, etc.): an icon
 * tile + title + one-line description on the left, optional time-range picker
 * and a few action buttons on the right. Lighter than <SkeletonHeaderBar>,
 * which is tuned for entity dashboards with a status badge + metadata row.
 */
export const SkeletonListHeader = ({
  actions = 1,
  picker = true,
  icon = true,
  badge = false,
}: {
  actions?: number
  picker?: boolean
  /** Show the leading icon tile (Logs/Errors have one; Alerts/Incidents don't). */
  icon?: boolean
  /** Show a status badge next to the title. */
  badge?: boolean
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border">
    <div className="flex items-center gap-3">
      {icon && <Skeleton className="h-9 w-9 rounded-lg shrink-0" />}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-52" />
          {badge && <SkeletonPill />}
        </div>
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {picker && <Skeleton className="h-9 w-32 rounded-md" />}
      {Array.from({ length: actions }).map((_, i) => (
        <SkeletonIconButton key={i} />
      ))}
    </div>
  </div>
)

/** A "← Back" link placeholder shown above detail-page headers. */
export const SkeletonBackLink = () => <Skeleton className="h-4 w-32" />

/**
 * "Media" header used by integration/child pages (Nginx, Traefik, a container):
 * an icon tile, a title + subtitle, and a status badge pushed to the right.
 */
export const SkeletonMediaHeader = () => (
  <div className="flex items-center gap-4">
    <Skeleton className="h-12 w-12 rounded shrink-0" />
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-3 w-44 max-w-full" />
    </div>
    <Skeleton className="ml-auto h-7 w-20 rounded-full shrink-0" />
  </div>
)

/**
 * Header for entity detail pages (a single error group, incident, alert
 * policy): an optional badge above the title, the title, and a metadata row.
 */
export const SkeletonDetailHeader = ({
  badge = true,
  badgeInline = false,
  actions = 0,
  picker = false,
}: {
  badge?: boolean
  /** Place the badge beside the title (true) instead of stacked above it (false). */
  badgeInline?: boolean
  actions?: number
  picker?: boolean
}) => (
  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-card/50 p-4 rounded-xl border">
    <div className="space-y-2.5">
      {badge && !badgeInline && <SkeletonPill className="w-24" />}
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-64 max-w-full" />
        {badge && badgeInline && <SkeletonPill className="w-20" />}
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    {(actions > 0 || picker) && (
      <div className="flex items-center gap-2 shrink-0">
        {picker && <Skeleton className="h-9 w-32 rounded-md" />}
        {Array.from({ length: actions }).map((_, i) => (
          <SkeletonIconButton key={i} />
        ))}
      </div>
    )}
  </div>
)

/** Mirrors the real-time availability / uptime strip. */
export const SkeletonUptimeStrip = () => (
  <div className="space-y-2 bg-card/50 p-4 rounded-xl border">
    <div className="flex justify-between items-center">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-3 w-10" />
    </div>
    <Skeleton className="h-2 w-full rounded-full" />
    <div className="flex justify-between">
      <Skeleton className="h-2 w-12" />
      <Skeleton className="h-2 w-10" />
    </div>
  </div>
)

/** Mirrors a <StatCard /> (title + icon, large value, sub label, progress bar). */
export const SkeletonStatCard = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-md" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-28 mt-2" />
      <Skeleton className="h-1.5 w-full mt-3 rounded-full" />
    </CardContent>
  </Card>
)

/** A responsive grid of stat-card skeletons. */
export const SkeletonStatGrid = ({
  count = 4,
  className = "grid grid-cols-2 md:grid-cols-4 gap-4",
}: {
  count?: number
  className?: string
}) => (
  <div className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonStatCard key={i} />
    ))}
  </div>
)

/** Mirrors a <ChartCard /> (header with title + action, fixed-height chart body). */
export const SkeletonChartCard = ({ className }: { className?: string }) => (
  <Card className={cn("flex flex-col h-[300px]", className)}>
    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-6 w-6 rounded-md" />
    </CardHeader>
    <CardContent className="flex-1 min-h-0 pt-2">
      <Skeleton className="h-full w-full rounded-lg" />
    </CardContent>
  </Card>
)

/** A grid of chart-card skeletons. */
export const SkeletonChartGrid = ({
  count = 4,
  className = "grid grid-cols-1 md:grid-cols-2 gap-6",
}: {
  count?: number
  className?: string
}) => (
  <div className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonChartCard key={i} />
    ))}
  </div>
)

/** A plain full-width card placeholder. Height via className (default h-24). */
export const SkeletonWideCard = ({ className }: { className?: string }) => (
  <Card className={cn("h-24", className)}>
    <CardContent className="p-6 h-full flex flex-col justify-center gap-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-1/2" />
    </CardContent>
  </Card>
)

/**
 * Mirrors the saved-view "canvas": a 12-column grid of variable-width widget
 * tiles. Uses inline `gridColumn` spans (like the real page) so the spans don't
 * depend on Tailwind generating md:col-span-* classes; on mobile the single
 * column makes every tile full width.
 */
/**
 * A saved-view widget tile placeholder: mirrors <WidgetWrapper> — a card with a
 * header (title + action icon) over a chart body. Fills its grid cell (h-full).
 */
export const SkeletonWidgetTile = () => (
  <Card className="flex flex-col h-full overflow-hidden">
    <CardHeader className="pt-3 px-4 pb-0 flex flex-row items-center justify-between space-y-0 h-11 shrink-0">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-6 w-6 rounded-md" />
    </CardHeader>
    <CardContent className="flex-1 min-h-0 px-4 pb-4 pt-2">
      <Skeleton className="h-full w-full rounded-lg" />
    </CardContent>
  </Card>
)

/**
 * A status-board monitor tile placeholder: mirrors <MonitorCard> — header
 * (name + url, status badge + action), an availability strip, a 4-cell stat
 * grid, and a footer. Fills its grid cell (h-full).
 */
export const SkeletonMonitorTile = () => (
  <Card className="flex flex-col h-full overflow-hidden">
    <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2.5 shrink-0">
      <div className="space-y-1.5 min-w-0">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <SkeletonPill className="w-14" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
    </div>
    <div className="flex flex-col gap-3 px-4 pb-4 flex-1 min-h-0">
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-auto pt-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  </Card>
)

/**
 * Mirrors the saved-view / status-board "canvas": a 12-column grid of
 * variable-width tiles. Uses inline `gridColumn` spans (like the real pages) so
 * the spans don't depend on Tailwind generating md:col-span-* classes; on mobile
 * the single column makes every tile full width. The cell sets the tile height;
 * the `Tile` component fills it (h-full) and supplies the internal structure.
 */
export const SkeletonWidgetGrid = ({
  spans = [4, 4, 4, 8, 4, 6, 6],
  tileHeight = "h-[300px]",
  Tile = SkeletonWidgetTile,
}: {
  /** Per-tile column spans out of 12. */
  spans?: number[]
  /** Tailwind height class for each grid cell (match the page's tile size). */
  tileHeight?: string
  /** Tile placeholder rendered in each cell (e.g. widget vs monitor card). */
  Tile?: React.ComponentType
}) => (
  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
    {spans.map((span, i) => (
      <div key={i} style={{ gridColumn: `span ${span}` }} className={tileHeight}>
        <Tile />
      </div>
    ))}
  </div>
)

/** A table-shaped skeleton (header row + body rows) inside a Card. */
export const SkeletonTable = ({
  columns = 5,
  rows = 6,
}: {
  columns?: number
  rows?: number
}) => (
  <Card className="overflow-hidden">
    <div className="bg-muted/30 px-6 py-3 flex gap-6">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-6 py-4 flex gap-6 items-center">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </Card>
)

/**
 * Ghost nav rows for the sidebar service lists while they load. Mirrors the
 * real nav <Button> rows (h-8, icon + label) and is meant to render inside the
 * existing branch-line container in <SidebarSection>. Widths vary slightly so
 * the placeholder reads as a list of items rather than identical bars.
 */
export const SkeletonSidebarItems = ({ count = 2 }: { count?: number }) => {
  const widths = ["w-24", "w-20", "w-28", "w-16", "w-24"]
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 h-8 px-2">
          <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
          <Skeleton className={cn("h-3", widths[i % widths.length])} />
        </div>
      ))}
    </>
  )
}

/**
 * Generic skeleton for list / management pages: a list-style header, an optional
 * summary stat row, an optional overview chart, and a table. Covers the many
 * "summary + table" pages (Logs, Errors, Alerts, Incidents, ...). Pass
 * `maxWidthClass` for pages that use a non-default container width.
 */
export const TablePageSkeleton = ({
  stats = 0,
  chart = false,
  actions = 1,
  picker = true,
  icon = true,
  badge = false,
  chips = 0,
  tables = 1,
  columns = 6,
  rows = 8,
  label = "Loading",
  maxWidthClass,
}: {
  stats?: number
  chart?: boolean
  actions?: number
  picker?: boolean
  icon?: boolean
  badge?: boolean
  /** Count of summary filter chips rendered as a row under the header. */
  chips?: number
  /** Number of stacked tables (e.g. Alerts: Policies + Channels + Silences). */
  tables?: number
  columns?: number
  rows?: number
  label?: string
  maxWidthClass?: string
}) => (
  <SkeletonScreen label={label} className={maxWidthClass}>
    <SkeletonListHeader actions={actions} picker={picker} icon={icon} badge={badge} />
    {chips > 0 && (
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: chips }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
    )}
    {stats > 0 && <SkeletonStatGrid count={stats} />}
    {chart && <SkeletonChartCard />}
    {Array.from({ length: tables }).map((_, i) => (
      <SkeletonTable key={i} columns={columns} rows={rows} />
    ))}
  </SkeletonScreen>
)

/**
 * Detail page for a single entity (error group, incident, alert policy):
 * optional back link, a detail header (badge + title + meta), and a body of
 * optional stats / lead chart / chart grid / table. `twoColumn` renders a
 * side-by-side detail card + table (e.g. incident detail + timeline).
 */
export const DetailPageSkeleton = ({
  backLink = true,
  badge = true,
  badgeInline = false,
  headerActions = 0,
  headerPicker = false,
  stats = 0,
  chart = false,
  charts = 0,
  table = false,
  twoColumn = false,
  label = "Loading",
  maxWidthClass,
}: {
  backLink?: boolean
  badge?: boolean
  badgeInline?: boolean
  headerActions?: number
  headerPicker?: boolean
  stats?: number
  chart?: boolean
  charts?: number
  table?: boolean
  twoColumn?: boolean
  label?: string
  maxWidthClass?: string
}) => (
  <SkeletonScreen label={label} className={maxWidthClass}>
    {backLink && <SkeletonBackLink />}
    <SkeletonDetailHeader badge={badge} badgeInline={badgeInline} actions={headerActions} picker={headerPicker} />
    {stats > 0 && <SkeletonStatGrid count={stats} />}
    {chart && <SkeletonChartCard />}
    {charts > 0 && <SkeletonChartGrid count={charts} />}
    {twoColumn ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonWideCard className="h-72" />
        <SkeletonTable columns={3} rows={6} />
      </div>
    ) : (
      table && <SkeletonTable columns={5} rows={6} />
    )}
  </SkeletonScreen>
)

/**
 * "Media" detail page for integration/child views (Nginx, Traefik, container):
 * back link, media header, an optional 3-up stat row, and a 2-up chart grid.
 */
export const MediaDetailSkeleton = ({
  stats = 0,
  charts = 2,
  table = false,
  label = "Loading",
  maxWidthClass,
}: {
  stats?: number
  charts?: number
  table?: boolean
  label?: string
  maxWidthClass?: string
}) => (
  <SkeletonScreen label={label} className={maxWidthClass}>
    <SkeletonBackLink />
    <SkeletonMediaHeader />
    {stats > 0 && (
      <SkeletonStatGrid count={stats} className="grid grid-cols-1 md:grid-cols-3 gap-6" />
    )}
    {charts > 0 && <SkeletonChartGrid count={charts} />}
    {table && <SkeletonTable columns={5} rows={6} />}
  </SkeletonScreen>
)

/**
 * Saved view / custom dashboard canvas (pages/dashboard/views/[id]).
 * Title + "SAVED VIEW" badge + description header (time-range picker + edit
 * controls), then the 12-column widget canvas.
 */
export const SavedViewSkeleton = () => (
  <SkeletonScreen label="Loading saved view">
    <SkeletonListHeader icon={false} badge picker actions={3} />
    <SkeletonWidgetGrid />
  </SkeletonScreen>
)

/**
 * Status board (pages/dashboard/monitor/board/[id]). Title + "STATUS BOARD"
 * badge + description header (time-range picker + share/edit/delete controls),
 * then the 12-column grid of monitor tiles (default tile w:12 h:2 → wider,
 * shorter than saved-view widgets).
 */
export const StatusBoardSkeleton = () => (
  <SkeletonScreen label="Loading status board">
    <SkeletonListHeader icon={false} badge picker actions={4} />
    {/* Monitor tiles default to full width (DEFAULT_CARD w:12 h:2), stacked. */}
    <SkeletonWidgetGrid spans={[12, 12, 12]} tileHeight="h-[240px]" Tile={SkeletonMonitorTile} />
  </SkeletonScreen>
)

/**
 * Incident detail (pages/dashboard/incidents/[id]). Back link, a tall header
 * card (status + severity badges, title, meta, action buttons), a 4-cell
 * summary strip, a full-width AI analysis card, the condition/policy pair, and
 * the timeline card.
 */
export const IncidentDetailSkeleton = () => (
  <SkeletonScreen label="Loading incident">
    <SkeletonBackLink />

    {/* Header card */}
    <div className="bg-card/50 p-5 rounded-xl border space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <SkeletonPill className="w-16" />
            <SkeletonPill className="w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-80 max-w-full" />
          <div className="flex items-center gap-4 flex-wrap">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <SkeletonIconButton />
        </div>
      </div>
    </div>

    {/* Summary strip */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* AI analysis */}
    <SkeletonWideCard className="h-32" />

    {/* Condition & Policy */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SkeletonWideCard className="h-44" />
      <SkeletonWideCard className="h-44" />
    </div>

    {/* Timeline */}
    <SkeletonTable columns={2} rows={6} />
  </SkeletonScreen>
)

// --- Page-level skeletons -----------------------------------------------------

/**
 * Reference skeleton for the Server detail dashboard
 * (pages/dashboard/server/[id]). Mirrors: header bar, uptime strip, a 4-up stat
 * row, and the 2-column chart grid.
 */
export const ServerDashboardSkeleton = () => (
  <SkeletonScreen label="Loading server dashboard">
    <SkeletonHeaderBar />
    <SkeletonUptimeStrip />
    <SkeletonStatGrid count={4} />
    <SkeletonChartGrid count={6} />
  </SkeletonScreen>
)

/**
 * Uptime monitor detail dashboard (pages/dashboard/monitor/[id]).
 * Header, availability strip, 4 stats, Domain/SSL card, response-time chart,
 * and the recent-checks table.
 */
export const MonitorDashboardSkeleton = () => (
  <SkeletonScreen label="Loading monitor dashboard">
    <SkeletonHeaderBar />
    <SkeletonUptimeStrip />
    <SkeletonStatGrid count={4} />
    <SkeletonWideCard className="h-24" />
    <SkeletonChartCard />
    <SkeletonTable columns={4} rows={5} />
  </SkeletonScreen>
)

/**
 * Web analytics dashboard (pages/dashboard/web/[id]).
 * Header, 4 stats, full-width traffic chart, then two rows of distribution
 * cards (Top Pages/Sources, System/Geo).
 */
export const WebDashboardSkeleton = () => (
  <SkeletonScreen label="Loading web analytics">
    <SkeletonHeaderBar />
    <SkeletonStatGrid count={4} />
    <SkeletonChartCard />
    <SkeletonChartGrid count={4} />
  </SkeletonScreen>
)

/**
 * Database dashboard (pages/dashboard/db/[id]).
 * Header, 4 stats, full-width throughput chart, the configuration-driven chart
 * grid, and the collections table.
 */
export const DbDashboardSkeleton = () => (
  <SkeletonScreen label="Loading database dashboard">
    <SkeletonHeaderBar />
    <SkeletonStatGrid count={4} />
    <SkeletonChartCard className="h-[350px]" />
    <SkeletonChartGrid count={6} />
    <SkeletonTable columns={5} rows={5} />
  </SkeletonScreen>
)

/**
 * Firebase dashboard (pages/dashboard/firebase/[id]).
 * Header, 4 stats, chart grid, and the recent-users table.
 */
export const FirebaseDashboardSkeleton = () => (
  <SkeletonScreen label="Loading Firebase dashboard">
    <SkeletonHeaderBar />
    <SkeletonStatGrid count={4} />
    <SkeletonChartGrid count={4} />
    <SkeletonTable columns={5} rows={5} />
  </SkeletonScreen>
)

/**
 * Web APM / RUM dashboard (pages/dashboard/rum/[id]).
 * Header, 4 Core-Web-Vitals stats, full-width sessions chart, chart grid, and
 * the recent-traces table.
 */
export const RumDashboardSkeleton = () => (
  <SkeletonScreen label="Loading Web APM dashboard">
    <SkeletonHeaderBar />
    <SkeletonStatGrid count={4} />
    <SkeletonChartCard />
    <SkeletonChartGrid count={4} />
    <SkeletonTable columns={5} rows={5} />
  </SkeletonScreen>
)

/**
 * Background task dashboard (pages/dashboard/task/[id]).
 * Header, 4 stats, full-width throughput chart, chart grid, and the tasks table.
 */
export const TaskDashboardSkeleton = () => (
  <SkeletonScreen label="Loading task dashboard">
    <SkeletonHeaderBar />
    <SkeletonStatGrid count={4} />
    <SkeletonChartCard />
    <SkeletonChartGrid count={2} />
    <SkeletonTable columns={5} rows={5} />
  </SkeletonScreen>
)

/**
 * APM service dashboard (components/ApmView, used by pages/dashboard/apm/[id]).
 * Header, 4 stats, full-width RPS chart, latency/status chart row, endpoints
 * table, and the context-charts row.
 */
export const ApmDashboardSkeleton = () => (
  <SkeletonScreen label="Loading APM dashboard">
    <SkeletonHeaderBar />
    <SkeletonStatGrid count={4} />
    <SkeletonChartCard />
    <SkeletonChartGrid count={2} />
    <SkeletonTable columns={5} rows={5} />
    <SkeletonChartGrid count={2} />
  </SkeletonScreen>
)
