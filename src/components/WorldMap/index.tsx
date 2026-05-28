import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  ZoomableGroup,
} from "react-simple-maps";
import { useTheme } from "../../lib/theme";
import { Spinner } from "../Core";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const CACHE_KEY = "senzor_geo_data";
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

interface MapProps {
  data: { _id: string; count: number }[];
}

const BUCKET_COUNT = 5;
const OPACITY_STEPS: Record<number, number> = {
  1: 0.18,
  2: 0.32,
  3: 0.5,
  4: 0.7,
  5: 0.92,
};
const ACCENT_HUE = "217 91% 60%";

const formatCount = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
};

const normalizeName = (name: string): string => {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n.includes("united states") || n.includes("usa")) return "united states";
  if (n.includes("united kingdom") || n.includes("uk")) return "united kingdom";
  if (n.includes("russian")) return "russia";
  return n;
};

const getCountryName = (code: string): string => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};

export const WorldMap = ({ data }: MapProps) => {
  const { isMono, theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const [tooltip, setTooltip] = useState<{
    name: string;
    count: number;
    x: number;
    y: number;
    visible: boolean;
  }>({ name: "", count: 0, x: 0, y: 0, visible: false });

  const [geoData, setGeoData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < CACHE_EXPIRY && parsed.data) {
              setGeoData(parsed.data);
              setIsLoading(false);
              requestAnimationFrame(() => setIsReady(true));
              return;
            }
          } catch {
            localStorage.removeItem(CACHE_KEY);
          }
        }

        const res = await fetch(GEO_URL);
        if (!res.ok) throw new Error("Failed to load map data");
        const json = await res.json();
        setGeoData(json);
        setIsLoading(false);
        requestAnimationFrame(() => setIsReady(true));

        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), data: json }),
          );
        } catch {}
      } catch (err) {
        console.error("Map loading error:", err);
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const { countryMap, getBucket } = useMemo(() => {
    const map = new Map<string, number>();
    const counts: number[] = [];

    data.forEach((d) => {
      const name = getCountryName(d._id);
      map.set(normalizeName(name), d.count);
      if (d.count > 0) counts.push(d.count);
    });

    const sorted = [...new Set(counts)].sort((a, b) => a - b);
    const n = sorted.length;
    const valueToBucket = new Map<number, number>();

    sorted.forEach((val, i) => {
      const pct = n === 1 ? 1 : i / (n - 1);
      const bucket = Math.min(BUCKET_COUNT, Math.ceil(pct * BUCKET_COUNT)) || 1;
      valueToBucket.set(val, bucket);
    });

    return {
      countryMap: map,
      getBucket: (count: number): number =>
        count > 0 ? (valueToBucket.get(count) ?? 1) : 0,
    };
  }, [data]);

  const fillForBucket = (bucket: number): string => {
    if (bucket === 0) return "hsl(var(--background) / 0.75)";
    const alpha = OPACITY_STEPS[bucket];
    return isMono
      ? `hsl(var(--foreground) / ${alpha})`
      : `hsl(${ACCENT_HUE} / ${alpha})`;
  };

  const legendFills = useMemo(
    () => Array.from({ length: BUCKET_COUNT }, (_, i) => fillForBucket(i + 1)),
    [isMono],
  );

  const handleMouseEnter = (name: string, count: number) => {
    setTooltip((prev) => ({ ...prev, visible: true, name, count }));
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
  };
  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none rounded overflow-hidden"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-20 backdrop-blur-sm">
          <Spinner className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {tooltip.visible && (
        <div
          className="fixed z-[9999] pointer-events-none px-3 py-2 rounded-lg shadow-lg border border-border/60 bg-popover text-popover-foreground animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <div className="text-xs font-semibold">{tooltip.name}</div>
          <div className="text-[11px] text-muted-foreground tabular-nums">
            {tooltip.count > 0 ? formatCount(tooltip.count) : "No"} visits
          </div>
        </div>
      )}

      {geoData && (
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 100 }}
          width={800}
          height={400}
          className="w-full h-full"
          style={{ maxHeight: "100%" }}
        >
          <ZoomableGroup
            center={[0, 20]}
            zoom={1.5}
            minZoom={1}
            maxZoom={4}
            translateExtent={[
              [-200, -100], // top-left limit
              [1000, 500], // bottom-right limit
            ]}
          >
            <rect
              x={-200}
              y={-200}
              width="200%"
              height="200%"
              fill="hsl(var(--muted) / 0.5)"
            />
            <Geographies geography={geoData}>
              {({ geographies }) =>
                geographies
                  .filter((geo) => {
                    const name = (geo.properties.name || "").toLowerCase();
                    return name !== "antarctica";
                  })
                  .map((geo) => {
                    const geoName = geo.properties.name || "";
                    const count = countryMap.get(normalizeName(geoName)) || 0;
                    const bucket = getBucket(count);
                    const fill = isReady
                      ? fillForBucket(bucket)
                      : fillForBucket(0);

                    const hoverStroke = isMono
                      ? "hsl(var(--foreground) / 0.6)"
                      : `hsl(${ACCENT_HUE})`;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => handleMouseEnter(geoName, count)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          default: {
                            fill,
                            stroke: `hsl(var(--border))`,
                            strokeWidth: 0.4,
                            outline: "none",
                            transition: "fill 1s ease-out, stroke 0.15s ease",
                          },
                          hover: {
                            fill,
                            stroke: hoverStroke,
                            strokeWidth: 1.2,
                            outline: "none",
                            cursor: "default",
                          },
                          pressed: {
                            fill,
                            stroke: hoverStroke,
                            strokeWidth: 1.2,
                            outline: "none",
                          },
                        }}
                      />
                    );
                  })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      )}

      {!isLoading && data.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-px">
            {legendFills.map((fill, i) => (
              <div
                key={i}
                className="w-4 h-2 rounded-[2px] border border-border/20"
                style={{ backgroundColor: fill }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      )}
    </div>
  );
};
