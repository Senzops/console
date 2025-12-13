import React, { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useTheme } from "../../lib/theme";
import { Spinner } from "../Core";
// Detailed TopoJSON with ISO_A2 codes

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const CACHE_KEY = "senzor_geo_data";
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 Days

interface MapProps {
  data: { _id: string; count: number }[];
}

const formatVal = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const normalizeName = (name: string) => {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n.includes("united states") || n.includes("usa")) return "united states";
  if (n.includes("united kingdom") || n.includes("uk")) return "united kingdom";
  if (n.includes("russian")) return "russia";
  return n;
};

const getCountryName = (code: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch { return code; }
};

export const WorldMap = ({ data }: MapProps) => {
  const { isMono, theme } = useTheme();
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number; visible: boolean }>({
    content: "",
    x: 0,
    y: 0,
    visible: false,
  });
  const [geoData, setGeoData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false); // For Animation Trigger

  useEffect(() => {
    const loadMapData = async () => {
      try {
        // 1. Check Cache
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { timestamp, data } = JSON.parse(cached);
            const age = Date.now() - timestamp;

            // If cache is valid (less than 7 days old), use it
            if (age < CACHE_EXPIRY && data) {
              setGeoData(data);
              setIsLoading(false);
              setTimeout(() => setIsReady(true), 100);
              return;
            }
          } catch (e) {
            console.warn("Invalid geo cache, refetching...");
            localStorage.removeItem(CACHE_KEY);
          }
        }

        // 2. Fetch Fresh Data if no cache or expired
        const res = await fetch(GEO_URL);
        if (!res.ok) throw new Error("Failed to load map data");
        const data = await res.json();

        // 3. Update State & Cache
        setGeoData(data);
        setIsLoading(false);
        setTimeout(() => setIsReady(true), 100);

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data
          }));
        } catch (e) {
          console.warn("Failed to cache geo data (likely storage quota exceeded)", e);
        }

      } catch (err) {
        console.error("Map loading error:", err);
        setIsLoading(false);
      }
    };

    loadMapData();
  }, []);

  // 1. Data Mapping & Max Calculation
  const { countryDataMap, countToRank, maxRank } = useMemo(() => {
    const map = new Map<string, number>();
    const uniqueCounts = new Set<number>();

    // Pass 1: Map Data
    data.forEach((d) => {
      const name = getCountryName(d._id);
      map.set(normalizeName(name), d.count);
      if (d.count > 0) uniqueCounts.add(d.count);
    });

    // Pass 2: Calculate Ranks
    // Sort counts descending: [1000, 500, 100...]
    const sortedCounts = Array.from(uniqueCounts).sort((a, b) => b - a);
    const rankMap = new Map<number, number>();

    sortedCounts.forEach((val, index) => {
      rankMap.set(val, index); // Highest count = Rank 0
    });

    return {
      countryDataMap: map,
      countToRank: rankMap,
      maxRank: Math.max(1, sortedCounts.length - 1)
    };
  }, [data]);
  // 2. Dynamic Color Scale based on Theme
  const targetVar = isMono ? "--chart-mono" : "--foreground";

  // 3. Handlers
  const handleMouseEnter = (name: string, current: number) => {
    setTooltip(prev => ({
      ...prev,
      visible: true,
      content: `${name}: ${current ? formatVal(current) : 0} visits`
    }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="w-full h-full bg-card rounded-lg overflow-hidden relative cursor-move">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-20 backdrop-blur-sm">
          <Spinner className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {/* Floating Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-[9999] pointer-events-none bg-popover border border-border text-popover-foreground text-xs px-2 py-1 rounded shadow-xl font-medium animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
        >
          {tooltip.content}
        </div>
      )}

      {geoData && <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120 }} // Base scale
        className="w-full h-full outline-none"
      >
        {/* ZoomableGroup:
           - center: [0, 20] aligns roughly to visual center excluding Antarctica
           - zoom: 1.2 provides the requested "1.3x" feel relative to container
        */}
        <ZoomableGroup center={[0, 20]} zoom={1.2} minZoom={1} maxZoom={4}>
          <Geographies geography={geoData}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoName = geo.properties.name || "";
                const normalizedGeoName = normalizeName(geoName);
                const count = countryDataMap.get(normalizedGeoName) || 0;

                // Rank Logic
                // Rank 0 (Top) -> Intensity 1.0
                // Rank Max (Bottom) -> Intensity 0.2
                // No Visits -> Intensity 0 (Muted)
                let intensity = 0;

                if (count > 0 && countToRank.has(count)) {
                  const rank = countToRank.get(count)!;
                  // Normalize rank between 0 and 1 (0 is best)
                  const normalizedRank = rank / maxRank;
                  // Invert so 0 rank = 1 intensity
                  intensity = 0.2 + (0.8 * (1 - normalizedRank));
                }

                const defaultFill = `hsl(var(--muted) / 0.2)`;
                const activeFill = `hsl(var(${targetVar}) / ${intensity})`;

                // Use 'isReady' to trigger the transition from default -> active
                const currentFill = (isReady && count > 0) ? activeFill : defaultFill;

                const strokeColor = "hsl(var(--ring) / 0.6)";
                const hoverStroke = isMono ? "hsl(var(--foreground))" : "hsl(var(--primary))";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}

                    onMouseEnter={() => handleMouseEnter(geoName, count)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}

                    style={{
                      default: {
                        fill: currentFill,
                        stroke: strokeColor,
                        strokeWidth: 0.5,
                        outline: "none",
                        // 1500ms animation for fill, fast for stroke
                        transition: "fill 1.5s ease-out, stroke 0.2s ease"
                      },
                      hover: {
                        fill: currentFill,
                        stroke: hoverStroke,
                        strokeWidth: 1.5,
                        outline: "none",
                        cursor: "pointer",
                        zIndex: 10
                      },
                      pressed: {
                        fill: currentFill,
                        stroke: hoverStroke,
                        strokeWidth: 1.5,
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
      }

      {/* Zoom Hints (Optional UI Polish) */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 opacity-50 hover:opacity-100 transition-opacity">
        <div className="bg-background/80 backdrop-blur p-1 rounded border border-border text-[10px] text-muted-foreground text-center">
          Scroll to Zoom
        </div>
      </div>
    </div>
  );
};