import React from "react";
import { interpolate } from "remotion";
import { COLORS, DASH, withAlpha } from "../lib/theme";
import { FONT_SANS } from "../lib/fonts";
import { easeOutCubic, easeOutQuart } from "../lib/easing";

interface ProductDashboardProps {
  slideOffset: number;
  viewAnimationStarts: [number, number, number, number];
  globalFrame: number;
}

const SIDEBAR_WIDTH = 230;
const CONTENT_WIDTH = 1370;
const DASH_WIDTH = SIDEBAR_WIDTH + CONTENT_WIDTH;
const DASH_HEIGHT = 900;

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const VIEW_SECTIONS = ["", "APM Services", "Log Management", "Error Tracking"];

const SIDEBAR_SECTIONS = [
  {
    title: "Saved Views",
    items: [{ name: "Production Overview", icon: "layout-template", color: COLORS.teal }],
  },
  {
    title: "Servers",
    items: [
      { name: "api-prod-us-1", icon: "server", color: COLORS.emerald, status: "ONLINE" },
      { name: "worker-eu-2", icon: "server", color: COLORS.emerald, status: "ONLINE" },
      { name: "cache-ap-1", icon: "server", color: COLORS.emerald, status: "ONLINE" },
    ],
  },
  {
    title: "Databases",
    items: [
      { name: "postgres-primary", icon: "database", color: COLORS.emerald, status: "ONLINE" },
      { name: "redis-sessions", icon: "database", color: COLORS.emerald, status: "ONLINE" },
    ],
  },
  {
    title: "APM Services",
    items: [
      { name: "payment-service", icon: "code", color: COLORS.orange, status: "LIVE" },
    ],
  },
  {
    title: "Background Tasks",
    items: [{ name: "report-scheduler", icon: "workflow", color: COLORS.indigo, status: "ACTIVE" }],
  },
  {
    title: "Error Tracking",
    items: [{ name: "Error Explorer", icon: "alert-octagon", color: COLORS.red }],
  },
  {
    title: "Log Management",
    items: [{ name: "Log Explorer", icon: "terminal", color: COLORS.blue }],
  },
];

const HEXAGON_RESOURCES = [
  { name: "api-prod-us-1", type: "server", status: "ONLINE", color: COLORS.emerald, meta: "Ubuntu" },
  { name: "payment-service", type: "apm", status: "LIVE", color: COLORS.orange, meta: "Express" },
  { name: "worker-eu-2", type: "server", status: "ONLINE", color: COLORS.emerald, meta: "Debian" },
  { name: "postgres-primary", type: "database", status: "ONLINE", color: COLORS.emerald, meta: "PostgreSQL" },
  { name: "senzor.dev", type: "web", status: "", color: COLORS.blue, meta: "Analytics" },
  { name: "report-scheduler", type: "task", status: "ACTIVE", color: COLORS.indigo, meta: "Background Jobs" },
  { name: "redis-sessions", type: "database", status: "ONLINE", color: COLORS.emerald, meta: "Redis" },
  { name: "auth-gateway", type: "apm", status: "LIVE", color: COLORS.orange, meta: "Fastify" },
  { name: "cache-ap-1", type: "server", status: "ONLINE", color: COLORS.emerald, meta: "Alpine" },
  { name: "console-rum", type: "rum", status: "LIVE", color: COLORS.pink, meta: "Web APM" },
  { name: "api-healthcheck", type: "monitor", status: "UP", color: COLORS.green, meta: "5m Check" },
  { name: "firebase-prod", type: "firebase", status: "ONLINE", color: COLORS.amber, meta: "senzor-prod" },
];

const LOG_ENTRIES = [
  { time: "14:23:41.234", level: "INFO", msg: "POST /api/checkout 200 OK (142ms)", service: "api-prod-us-1", levelColor: COLORS.emerald },
  { time: "14:23:41.567", level: "DEBUG", msg: "Token validated for user_8f3a2b", service: "auth-gateway", levelColor: COLORS.purple },
  { time: "14:23:42.012", level: "INFO", msg: "Charge created: $49.99 via Stripe", service: "payment-service", levelColor: COLORS.emerald },
  { time: "14:23:42.890", level: "WARN", msg: "Cache miss: session_key_4f2c — fallback to DB", service: "redis-sessions", levelColor: COLORS.amber },
  { time: "14:23:43.123", level: "INFO", msg: "SELECT users WHERE id=$1 — 12ms", service: "postgres-primary", levelColor: COLORS.emerald },
  { time: "14:23:43.567", level: "ERROR", msg: "Webhook timeout: endpoint unreachable after 30s", service: "payment-service", levelColor: COLORS.red },
  { time: "14:23:44.012", level: "INFO", msg: "Health check passed — all systems nominal", service: "api-prod-us-1", levelColor: COLORS.emerald },
  { time: "14:23:44.234", level: "DEBUG", msg: "Cron completed: daily_report (4.2s)", service: "report-scheduler", levelColor: COLORS.purple },
  { time: "14:23:44.890", level: "INFO", msg: "GET /api/dashboard 200 OK (89ms)", service: "api-prod-us-1", levelColor: COLORS.emerald },
  { time: "14:23:45.123", level: "WARN", msg: "Rate limit approaching: 850/1000 req/min", service: "auth-gateway", levelColor: COLORS.amber },
];

const APM_ENDPOINTS = [
  { method: "GET", path: "/api/dashboard", rpm: 342, p95: "89ms", errors: "0.01%", methodColor: COLORS.blue },
  { method: "POST", path: "/api/checkout", rpm: 128, p95: "142ms", errors: "0.03%", methodColor: COLORS.emerald },
  { method: "GET", path: "/api/users/:id", rpm: 96, p95: "34ms", errors: "0.00%", methodColor: COLORS.blue },
  { method: "PUT", path: "/api/settings", rpm: 24, p95: "67ms", errors: "0.02%", methodColor: COLORS.orange },
  { method: "DELETE", path: "/api/sessions/:id", rpm: 18, p95: "23ms", errors: "0.00%", methodColor: COLORS.red },
  { method: "POST", path: "/api/webhooks", rpm: 56, p95: "312ms", errors: "0.12%", methodColor: COLORS.emerald },
];

const ERROR_ITEMS = [
  { service: "payment-service", serviceColor: COLORS.orange, error: "TypeError: Cannot read property 'id' of undefined", status: "Unresolved", count: 142, lastSeen: "2m ago" },
  { service: "auth-gateway", serviceColor: COLORS.orange, error: "RangeError: Maximum call stack size exceeded", status: "Unresolved", count: 38, lastSeen: "14m ago" },
  { service: "report-scheduler", serviceColor: COLORS.indigo, error: "TimeoutError: Database query exceeded 30s limit", status: "Unresolved", count: 3, lastSeen: "1h ago" },
  { service: "payment-service", serviceColor: COLORS.orange, error: "NetworkError: Failed to fetch /api/billing", status: "Resolved", count: 15, lastSeen: "3h ago" },
  { service: "console-rum", serviceColor: COLORS.pink, error: "SyntaxError: Unexpected token in JSON at position 0", status: "Resolved", count: 7, lastSeen: "1d ago" },
];

export const ProductDashboard: React.FC<ProductDashboardProps> = ({
  slideOffset,
  viewAnimationStarts,
  globalFrame,
}) => {
  const activeIdx = Math.round(Math.min(Math.max(slideOffset, 0), 3));
  const highlightSection = VIEW_SECTIONS[activeIdx];

  return (
    <div
      style={{
        width: DASH_WIDTH,
        height: DASH_HEIGHT,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: DASH.background,
        border: `1px solid ${DASH.border}`,
        display: "flex",
        boxShadow: `0 20px 60px ${withAlpha("#3a2e20", 0.25)}`,
        fontFamily: FONT_SANS,
      }}
    >
      <Sidebar highlightSection={highlightSection} />
      <div style={{ width: CONTENT_WIDTH, overflow: "hidden", position: "relative" }}>
        <div
          style={{
            display: "flex",
            width: CONTENT_WIDTH * 4,
            height: "100%",
            transform: `translateX(${-slideOffset * CONTENT_WIDTH}px)`,
            willChange: "transform",
          }}
        >
          <div style={{ width: CONTENT_WIDTH, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <DashboardGrid localFrame={globalFrame - viewAnimationStarts[0]} />
          </div>
          <div style={{ width: CONTENT_WIDTH, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <ApmDetailView localFrame={globalFrame - viewAnimationStarts[1]} />
          </div>
          <div style={{ width: CONTENT_WIDTH, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <LogsExplorer localFrame={globalFrame - viewAnimationStarts[2]} />
          </div>
          <div style={{ width: CONTENT_WIDTH, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <ErrorTracker localFrame={globalFrame - viewAnimationStarts[3]} />
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC<{ highlightSection: string }> = ({ highlightSection }) => {
  return (
    <div
      style={{
        width: SIDEBAR_WIDTH,
        backgroundColor: DASH.card,
        borderRight: `1px solid ${DASH.border}`,
        padding: "16px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "4px 12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", backgroundColor: DASH.background, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 744 744" width={20} height={20}>
            <g transform="translate(0,744) scale(0.1,-0.1)" fill={DASH.foreground} stroke="none">
              <path d="M3110 6639 c-127 -8 -278 -40 -462 -98 -301 -96 -481 -182 -728 -350 -276 -187 -436 -323 -667 -566 -228 -240 -317 -358 -441 -580 -143 -258 -204 -442 -268 -810 -28 -155 -25 -497 4 -675 32 -189 108 -555 121 -578 6 -11 47 24 162 139 135 135 159 164 192 231 56 116 64 183 44 369 -24 220 -20 399 14 554 45 208 156 464 279 643 283 412 803 855 1224 1040 290 127 516 170 850 159 261 -9 434 -52 681 -171 229 -110 441 -256 666 -458 117 -105 178 -141 266 -157 68 -13 161 1 223 35 55 30 220 178 220 198 0 21 -172 179 -350 321 -21 17 -86 72 -144 122 -111 97 -314 238 -475 329 -51 30 -95 54 -96 54 -2 0 -50 22 -107 49 -210 100 -489 175 -750 201 -116 11 -276 11 -458 -1z" />
              <path d="M6855 6443 c-22 -5 -292 -65 -425 -93 -47 -11 -146 -33 -220 -50 -419 -96 -395 -87 -366 -146 9 -20 71 -89 137 -152 65 -63 119 -120 119 -125 0 -18 -1110 -1128 -1175 -1176 -22 -16 -69 -44 -104 -62 -60 -32 -71 -34 -160 -34 -88 0 -101 3 -161 32 -36 18 -105 58 -155 89 -172 108 -311 168 -480 206 -108 24 -357 35 -460 20 -144 -22 -201 -33 -220 -42 -11 -5 -47 -16 -79 -25 -73 -20 -272 -122 -341 -174 -95 -72 -200 -175 -1273 -1243 -822 -818 -1068 -1069 -1083 -1103 -39 -87 -24 -203 37 -282 76 -100 248 -128 352 -58 20 14 348 336 729 715 527 525 693 685 693 668 0 -42 50 -232 85 -323 137 -357 454 -663 810 -784 165 -55 283 -75 455 -75 310 0 528 64 775 228 132 89 214 166 326 308 141 179 234 385 264 588 27 173 17 256 -37 337 -49 73 -113 106 -203 104 -56 -2 -143 -38 -189 -80 -33 -30 -86 -135 -86 -171 -1 -109 -85 -330 -164 -430 -38 -48 -154 -170 -162 -170 -1 0 -33 -21 -71 -46 -128 -86 -245 -124 -408 -131 -196 -9 -318 23 -475 126 -248 161 -389 420 -390 712 0 123 10 174 59 298 50 126 96 196 186 284 200 195 436 274 707 238 109 -15 195 -49 319 -128 167 -107 321 -178 438 -203 89 -20 123 -22 240 -17 161 6 253 31 396 106 203 108 252 152 884 791 l514 519 116 -107 c64 -59 135 -122 159 -141 39 -30 44 -32 64 -19 17 11 26 35 39 104 10 49 41 199 69 334 75 361 117 578 122 637 6 60 -8 88 -62 128 -33 24 -88 31 -145 18z" />
              <path d="M6049 4719 c-219 -220 -257 -291 -246 -457 3 -48 13 -112 22 -142 33 -118 76 -341 91 -475 50 -438 -87 -908 -376 -1293 -119 -159 -373 -406 -615 -598 -55 -43 -102 -81 -105 -84 -3 -3 -14 -10 -25 -17 -11 -6 -72 -44 -135 -84 -184 -116 -339 -186 -570 -258 -115 -35 -362 -71 -495 -71 -110 0 -320 25 -395 46 -30 9 -68 18 -84 21 -42 7 -238 84 -324 127 -105 53 -194 112 -307 204 -98 79 -427 398 -597 579 -92 98 -149 135 -239 154 -68 15 -153 -9 -226 -62 -64 -48 -183 -158 -183 -170 0 -10 190 -223 259 -289 25 -25 94 -97 153 -160 201 -217 502 -484 667 -595 106 -70 344 -187 486 -239 301 -110 638 -158 951 -137 409 28 795 156 1170 387 219 135 386 263 629 484 466 424 730 850 846 1367 61 274 72 460 44 748 -23 239 -47 354 -190 895 -24 90 -36 157 -36 202 0 38 -5 68 -10 68 -6 0 -78 -68 -160 -151z" />
              <path d="M3460 4033 c-25 -9 -62 -27 -82 -40 -21 -12 -41 -23 -44 -23 -14 0 -101 -87 -132 -133 -65 -94 -84 -203 -58 -325 27 -130 95 -230 200 -297 84 -53 144 -68 256 -63 88 3 104 7 172 40 85 42 167 119 203 189 29 56 55 154 55 206 0 58 -36 189 -66 242 -41 70 -120 140 -204 180 -67 32 -85 36 -165 38 -63 2 -104 -3 -135 -14z" />
            </g>
          </svg>
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: DASH.foreground, letterSpacing: "-0.02em" }}>Senzor</span>
      </div>

      {SIDEBAR_SECTIONS.map((section) => {
        const isHighlighted = section.title === highlightSection;
        return (
          <div key={section.title} style={{ marginBottom: 2 }}>
            <div style={{
              padding: "6px 12px",
              fontSize: 10,
              fontWeight: 600,
              color: isHighlighted ? DASH.foreground : DASH.mutedForeground,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              <ChevronIcon expanded={isHighlighted} />
              {section.title}
            </div>
            {isHighlighted && section.items.map((item) => (
              <div
                key={item.name}
                style={{
                  padding: "5px 12px 5px 24px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: DASH.foreground,
                  backgroundColor: withAlpha(DASH.secondary, 0.5),
                  borderRadius: 6,
                  marginBottom: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                {item.status && (
                  <span style={{
                    marginLeft: "auto",
                    fontSize: 8,
                    fontWeight: 700,
                    color: item.status === "ONLINE" || item.status === "UP" ? COLORS.emerald : item.color,
                    letterSpacing: "0.04em",
                    flexShrink: 0,
                  }}>
                    {item.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}

      <div style={{ marginTop: "auto", padding: "12px", borderTop: `1px solid ${DASH.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: DASH.secondary, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: DASH.mutedForeground }}>DG</span>
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: DASH.foreground }}>Demo Guest</div>
          <div style={{ fontSize: 9, color: DASH.mutedForeground }}>guest@senzor.dev</div>
        </div>
        <div style={{
          marginLeft: "auto",
          padding: "2px 6px",
          borderRadius: 4,
          backgroundColor: withAlpha(COLORS.amber, 0.1),
          border: `1px solid ${withAlpha(COLORS.amber, 0.2)}`,
          fontSize: 8,
          fontWeight: 700,
          color: COLORS.amber,
          letterSpacing: "0.04em",
        }}>
          DEMO
        </div>
      </div>
    </div>
  );
};

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke={expanded ? DASH.foreground : DASH.mutedForeground} strokeWidth={1.5} strokeLinecap="round">
    {expanded
      ? <polyline points="2,3 5,6 8,3" />
      : <polyline points="3,2 6,5 3,8" />
    }
  </svg>
);

const DashboardGrid: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 32px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: DASH.foreground, letterSpacing: "-0.02em" }}>Global Infra</div>
          <div style={{ fontSize: 12, color: DASH.mutedForeground, marginTop: 2 }}>12 resources active</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 200, height: 32, borderRadius: 8, border: `1px solid ${DASH.border}`, backgroundColor: DASH.card, display: "flex", alignItems: "center", padding: "0 10px", gap: 6 }}>
            <SearchIcon />
            <span style={{ fontSize: 11, color: DASH.mutedForeground }}>Search resources...</span>
          </div>
          <div style={{ display: "flex", backgroundColor: withAlpha(DASH.muted, 0.5), borderRadius: 8, border: `1px solid ${DASH.border}`, padding: 3 }}>
            <div style={{ padding: "4px 6px", borderRadius: 5, backgroundColor: DASH.background, boxShadow: `0 1px 2px ${withAlpha("#000", 0.2)}` }}>
              <GridIcon />
            </div>
            <div style={{ padding: "4px 6px" }}>
              <ListIcon />
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "16px 32px", overflow: "hidden" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0px", maxWidth: 900 }}>
          {HEXAGON_RESOURCES.map((res, i) => {
            const delay = 20 + i * 5;
            const hexOpacity = interpolate(localFrame, [delay, delay + 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const hexScale = interpolate(localFrame, [delay, delay + 20], [0.8, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOutCubic,
            });

            const isEven = i % 2 === 1;
            return (
              <div
                key={res.name}
                style={{
                  width: 130,
                  height: 150,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  backgroundColor: DASH.card,
                  clipPath: HEX_CLIP,
                  margin: "-8px -4px",
                  marginTop: isEven ? 60 : -8,
                  opacity: hexOpacity,
                  transform: `scale(${hexScale})`,
                  position: "relative",
                  padding: "16px 8px",
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: withAlpha(res.color, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 6,
                }}>
                  <ResourceIcon type={res.type} color={res.color} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: DASH.foreground, marginBottom: 2, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {res.name}
                </div>
                <div style={{ fontSize: 8, color: DASH.mutedForeground, marginBottom: 4 }}>{res.meta}</div>
                {res.status && (
                  <div style={{
                    fontSize: 7,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    padding: "1px 6px",
                    borderRadius: 3,
                    backgroundColor: res.status === "ONLINE" || res.status === "UP"
                      ? withAlpha(COLORS.emerald, 0.1)
                      : withAlpha(res.color, 0.1),
                    color: res.status === "ONLINE" || res.status === "UP" ? COLORS.emerald : res.color,
                    border: `1px solid ${res.status === "ONLINE" || res.status === "UP"
                      ? withAlpha(COLORS.emerald, 0.2)
                      : withAlpha(res.color, 0.2)}`,
                  }}>
                    {res.status}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const LogsExplorer: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, gap: 16, overflow: "hidden" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        backgroundColor: DASH.card,
        borderRadius: 10,
        border: `1px solid ${DASH.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: withAlpha(COLORS.blue, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TerminalIcon color={COLORS.blue} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DASH.foreground }}>Log Management</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ padding: "4px 10px", borderRadius: 6, backgroundColor: DASH.secondary, fontSize: 11, color: DASH.mutedForeground, fontWeight: 500 }}>Last 24 hours</div>
          <div style={{ padding: "4px 10px", borderRadius: 6, backgroundColor: DASH.secondary, fontSize: 11, color: DASH.mutedForeground, fontWeight: 500 }}>⟳ Refresh</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "Total Logs", value: "24,847" },
          { label: "Log Velocity", value: "142/min" },
          { label: "Error Count", value: "23" },
          { label: "Active Services", value: "6" },
        ].map((stat) => {
          const cp = interpolate(localFrame, [5, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
          return (
            <div key={stat.label} style={{ flex: 1, padding: "14px 16px", backgroundColor: DASH.card, border: `1px solid ${DASH.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: DASH.mutedForeground, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: DASH.foreground, fontVariantNumeric: "tabular-nums" }}>{countUp(stat.value, cp)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 120, backgroundColor: DASH.card, borderRadius: 10, border: `1px solid ${DASH.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: DASH.foreground, marginBottom: 4 }}>Log Volume</div>
        <AreaChart localFrame={localFrame} color={COLORS.blue} offset={30} seed={42} />
      </div>

      <div style={{ flex: 1, backgroundColor: DASH.card, borderRadius: 10, border: `1px solid ${DASH.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", padding: "10px 16px", borderBottom: `1px solid ${DASH.border}`, fontSize: 10, fontWeight: 600, color: DASH.mutedForeground, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span style={{ width: 100, flexShrink: 0 }}>Timestamp</span>
          <span style={{ width: 56, flexShrink: 0 }}>Level</span>
          <span style={{ flex: 1 }}>Message</span>
        </div>
        {LOG_ENTRIES.map((entry, i) => {
          const delay = 40 + i * 6;
          const entryOpacity = interpolate(localFrame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const slideX = interpolate(localFrame, [delay, delay + 12], [-15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
          return (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 16px",
              opacity: entryOpacity,
              transform: `translateX(${slideX}px)`,
              fontSize: 11,
              fontFamily: "monospace",
              backgroundColor: i % 2 === 0 ? "transparent" : withAlpha(DASH.secondary, 0.2),
              borderBottom: `1px solid ${withAlpha(DASH.border, 0.3)}`,
            }}>
              <span style={{ width: 100, flexShrink: 0, color: DASH.mutedForeground, fontSize: 10 }}>{entry.time}</span>
              <span style={{
                width: 56,
                flexShrink: 0,
                fontWeight: 700,
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 3,
                textAlign: "center",
                color: entry.levelColor,
                backgroundColor: withAlpha(entry.levelColor, 0.1),
                border: `1px solid ${withAlpha(entry.levelColor, 0.15)}`,
              }}>
                {entry.level}
              </span>
              <span style={{ flex: 1, color: DASH.foreground, paddingLeft: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.msg}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ApmDetailView: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, gap: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: withAlpha(COLORS.orange, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CodeIcon color={COLORS.orange} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: DASH.foreground }}>payment-service</div>
          <div style={{ fontSize: 11, color: DASH.mutedForeground }}>Express · Node.js 20</div>
        </div>
        <div style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, backgroundColor: DASH.secondary, fontSize: 11, color: DASH.mutedForeground }}>Last 24 hours</div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "Request Count", value: "48.2K", trend: "+12%", positive: true },
          { label: "Error Rate", value: "0.03%", trend: "-8%", positive: true },
          { label: "P95 Latency", value: "142ms", trend: "-3%", positive: true },
          { label: "Throughput", value: "1.2K/s", trend: "+5%", positive: true },
        ].map((stat) => {
          const cp = interpolate(localFrame, [5, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
          const trendOpacity = interpolate(localFrame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={stat.label} style={{ flex: 1, padding: "14px 16px", backgroundColor: DASH.card, border: `1px solid ${DASH.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: DASH.mutedForeground, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: DASH.foreground, fontVariantNumeric: "tabular-nums" }}>{countUp(stat.value, cp)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: stat.positive ? COLORS.emerald : COLORS.red, opacity: trendOpacity }}>{stat.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, height: 130 }}>
        {[
          { title: "Request Rate", color: COLORS.orange, offset: 40, seed: 150 },
          { title: "Error Rate", color: COLORS.red, offset: 50, seed: 99 },
          { title: "Latency (P95)", color: COLORS.blue, offset: 60, seed: 200 },
        ].map((chart) => (
          <div key={chart.title} style={{ flex: 1, backgroundColor: DASH.card, borderRadius: 10, border: `1px solid ${DASH.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: DASH.foreground, marginBottom: 4 }}>{chart.title}</div>
            <AreaChart localFrame={localFrame} color={chart.color} offset={chart.offset} seed={chart.seed} />
          </div>
        ))}
      </div>

      <div style={{ flex: 1, backgroundColor: DASH.card, borderRadius: 10, border: `1px solid ${DASH.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${DASH.border}`, fontSize: 12, fontWeight: 600, color: DASH.foreground }}>Endpoint Distribution</div>
        <div style={{ display: "flex", padding: "8px 16px", borderBottom: `1px solid ${withAlpha(DASH.border, 0.5)}`, fontSize: 10, fontWeight: 600, color: DASH.mutedForeground, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span style={{ width: 60, flexShrink: 0 }}>Method</span>
          <span style={{ flex: 1 }}>Endpoint</span>
          <span style={{ width: 80, textAlign: "right" }}>RPM</span>
          <span style={{ width: 80, textAlign: "right" }}>P95</span>
          <span style={{ width: 80, textAlign: "right" }}>Error %</span>
        </div>
        {APM_ENDPOINTS.map((ep, i) => {
          const delay = 50 + i * 6;
          const o = interpolate(localFrame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={ep.path} style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              fontSize: 11,
              opacity: o,
              borderBottom: `1px solid ${withAlpha(DASH.border, 0.3)}`,
              fontFamily: "monospace",
            }}>
              <span style={{
                width: 50,
                flexShrink: 0,
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 3,
                textAlign: "center",
                color: ep.methodColor,
                backgroundColor: withAlpha(ep.methodColor, 0.1),
                border: `1px solid ${withAlpha(ep.methodColor, 0.15)}`,
              }}>
                {ep.method}
              </span>
              <span style={{ flex: 1, color: DASH.foreground, paddingLeft: 12 }}>{ep.path}</span>
              <span style={{ width: 80, textAlign: "right", color: DASH.mutedForeground, fontVariantNumeric: "tabular-nums" }}>{ep.rpm}</span>
              <span style={{ width: 80, textAlign: "right", color: DASH.mutedForeground, fontVariantNumeric: "tabular-nums" }}>{ep.p95}</span>
              <span style={{ width: 80, textAlign: "right", color: DASH.mutedForeground, fontVariantNumeric: "tabular-nums" }}>{ep.errors}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ErrorTracker: React.FC<{ localFrame: number }> = ({ localFrame }) => {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, gap: 16, overflow: "hidden" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        backgroundColor: DASH.card,
        borderRadius: 10,
        border: `1px solid ${DASH.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: withAlpha(COLORS.red, 0.1), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertIcon color={COLORS.red} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: DASH.foreground }}>Global Exception Tracker</span>
        </div>
        <div style={{ padding: "4px 10px", borderRadius: 6, backgroundColor: DASH.secondary, fontSize: 11, color: DASH.mutedForeground }}>Last 30 days</div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "Total Errors", value: "205", color: COLORS.red },
          { label: "Unresolved Issues", value: "3", color: COLORS.amber },
          { label: "Affected Services", value: "4", color: COLORS.orange },
          { label: "Error Velocity", value: "8.5/hr", color: COLORS.rose },
        ].map((stat) => {
          const cp = interpolate(localFrame, [5, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutCubic });
          return (
            <div key={stat.label} style={{ flex: 1, padding: "14px 16px", backgroundColor: DASH.card, border: `1px solid ${DASH.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: DASH.mutedForeground, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontVariantNumeric: "tabular-nums" }}>{countUp(stat.value, cp)}</div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 110, backgroundColor: DASH.card, borderRadius: 10, border: `1px solid ${DASH.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: DASH.foreground, marginBottom: 4 }}>Error Trend</div>
        <AreaChart localFrame={localFrame} color={COLORS.red} offset={30} seed={77} />
      </div>

      <div style={{ flex: 1, backgroundColor: DASH.card, borderRadius: 10, border: `1px solid ${DASH.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", padding: "10px 16px", borderBottom: `1px solid ${DASH.border}`, fontSize: 10, fontWeight: 600, color: DASH.mutedForeground, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span style={{ width: 120, flexShrink: 0 }}>Service</span>
          <span style={{ flex: 1 }}>Error Event</span>
          <span style={{ width: 80, textAlign: "center" }}>Status</span>
          <span style={{ width: 60, textAlign: "right" }}>Count</span>
          <span style={{ width: 70, textAlign: "right" }}>Last Seen</span>
        </div>
        {ERROR_ITEMS.map((err, i) => {
          const delay = 40 + i * 8;
          const o = interpolate(localFrame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isUnresolved = err.status === "Unresolved";
          return (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: `1px solid ${withAlpha(DASH.border, 0.4)}`,
              opacity: o,
              fontSize: 11,
            }}>
              <div style={{ width: 120, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: err.serviceColor }} />
                <span style={{ color: DASH.mutedForeground, fontSize: 10, fontWeight: 500 }}>{err.service}</span>
              </div>
              <div style={{ flex: 1, color: COLORS.red, fontFamily: "monospace", fontSize: 10, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{err.error}</div>
              <div style={{ width: 80, textAlign: "center" }}>
                <span style={{
                  fontSize: 8,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: "2px 8px",
                  borderRadius: 4,
                  backgroundColor: isUnresolved ? withAlpha(COLORS.red, 0.1) : withAlpha(COLORS.emerald, 0.1),
                  color: isUnresolved ? COLORS.red : COLORS.emerald,
                  border: `1px solid ${isUnresolved ? withAlpha(COLORS.red, 0.2) : withAlpha(COLORS.emerald, 0.2)}`,
                }}>
                  {err.status}
                </span>
              </div>
              <span style={{ width: 60, textAlign: "right", fontSize: 12, fontWeight: 800, color: DASH.foreground, fontVariantNumeric: "tabular-nums" }}>{err.count}</span>
              <span style={{ width: 70, textAlign: "right", fontSize: 10, color: DASH.mutedForeground }}>{err.lastSeen}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AreaChart: React.FC<{ localFrame: number; color: string; offset?: number; seed?: number }> = ({
  localFrame,
  color,
  offset = 0,
  seed = 42,
}) => {
  const rng = seededRandom(seed);
  const points = 30;
  const data: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 100;
    const y = 15 + rng() * 55;
    data.push({ x, y });
  }

  const drawProgress = interpolate(localFrame, [offset, offset + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutQuart,
  });

  const visibleCount = Math.floor(drawProgress * data.length);
  if (visibleCount < 2) return <div style={{ flex: 1 }} />;

  const visible = data.slice(0, visibleCount);
  const pathData = smoothPath(visible);
  const areaPath = `${pathData} L ${visible[visible.length - 1].x.toFixed(2)} 95 L ${visible[0].x.toFixed(2)} 95 Z`;

  return (
    <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id={`chart-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={withAlpha(color, 0.2)} />
            <stop offset="100%" stopColor={withAlpha(color, 0)} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#chart-${seed})`} />
        <path d={pathData} fill="none" stroke={color} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};

const SearchIcon: React.FC = () => (
  <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke={DASH.mutedForeground} strokeWidth={1.5} strokeLinecap="round">
    <circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
  </svg>
);

const GridIcon: React.FC = () => (
  <svg width={12} height={12} viewBox="0 0 16 16" fill={DASH.foreground} stroke="none">
    <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
);

const ListIcon: React.FC = () => (
  <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke={DASH.mutedForeground} strokeWidth={1.5} strokeLinecap="round">
    <line x1="3" y1="4" x2="13" y2="4" /><line x1="3" y1="8" x2="13" y2="8" /><line x1="3" y1="12" x2="13" y2="12" />
  </svg>
);

const TerminalIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <polyline points="5,7 7,9 5,11" />
    <line x1="9" y1="11" x2="11" y2="11" />
  </svg>
);

const CodeIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5,4 2,8 5,12" /><polyline points="11,4 14,8 11,12" /><line x1="9" y1="3" x2="7" y2="13" />
  </svg>
);

const AlertIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="8,2 14,13 2,13" /><line x1="8" y1="6" x2="8" y2="9" /><circle cx="8" cy="11" r="0.5" fill={color} />
  </svg>
);

const ResourceIcon: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const s = 14;
  switch (type) {
    case "server":
      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5}><rect x="2" y="2" width="12" height="5" rx="1" /><rect x="2" y="9" width="12" height="5" rx="1" /><circle cx="5" cy="4.5" r="0.7" fill={color} /><circle cx="5" cy="11.5" r="0.7" fill={color} /></svg>;
    case "apm":
      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><polyline points="5,4 2,8 5,12" /><polyline points="11,4 14,8 11,12" /></svg>;
    case "database":
      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5}><ellipse cx="8" cy="4" rx="5" ry="2" /><path d="M3,4 L3,12 C3,13.1 5.2,14 8,14 C10.8,14 13,13.1 13,12 L13,4" /><path d="M3,8 C3,9.1 5.2,10 8,10 C10.8,10 13,9.1 13,8" /></svg>;
    case "web":
      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5}><circle cx="8" cy="8" r="5.5" /><path d="M2.5,8 H13.5 M8,2.5 C9.5,4 10,6 10,8 C10,10 9.5,12 8,13.5 M8,2.5 C6.5,4 6,6 6,8 C6,10 6.5,12 8,13.5" /></svg>;
    case "task":
      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><circle cx="4" cy="4" r="2" /><circle cx="12" cy="8" r="2" /><circle cx="4" cy="12" r="2" /><line x1="6" y1="4" x2="10" y2="8" /><line x1="6" y1="12" x2="10" y2="8" /></svg>;
    case "rum":
      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5}><rect x="3" y="2" width="10" height="9" rx="1" /><line x1="5" y1="14" x2="11" y2="14" /><line x1="8" y1="11" x2="8" y2="14" /></svg>;
    case "monitor":
      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"><polyline points="2,8 5,4 8,10 11,6 14,8" /></svg>;
    case "firebase":
      return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4,13 L8,2 L10,7 L14,13 Z" /><line x1="4" y1="13" x2="14" y2="13" /></svg>;
    default:
      return null;
  }
};

function countUp(target: string, progress: number): string {
  const p = Math.min(Math.max(progress, 0), 1);
  if (p >= 1) return target;
  const match = target.match(/^([+-]?)([\d,]+\.?\d*)(.*)/);
  if (!match) return target;
  const numStr = match[2].replace(/,/g, "");
  const suffix = match[3];
  const num = parseFloat(numStr);
  if (isNaN(num)) return target;
  if (p <= 0) return "0" + suffix;
  const current = num * p;
  const dotIdx = numStr.indexOf(".");
  const decimals = dotIdx >= 0 ? numStr.length - dotIdx - 1 : 0;
  let formatted: string;
  if (decimals > 0) {
    formatted = current.toFixed(decimals);
  } else {
    formatted = Math.round(current).toString();
  }
  if (match[2].includes(",") && parseFloat(formatted) >= 1000) {
    const parts = formatted.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    formatted = parts.join(".");
  }
  return match[1] + formatted + suffix;
}

function smoothPath(data: Array<{ x: number; y: number }>): string {
  if (data.length < 2) return "";
  let path = `M ${data[0].x.toFixed(2)} ${data[0].y.toFixed(2)}`;
  if (data.length === 2) {
    path += ` L ${data[1].x.toFixed(2)} ${data[1].y.toFixed(2)}`;
    return path;
  }
  for (let i = 0; i < data.length - 1; i++) {
    const p0 = data[Math.max(0, i - 1)];
    const p1 = data[i];
    const p2 = data[i + 1];
    const p3 = data[Math.min(data.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
