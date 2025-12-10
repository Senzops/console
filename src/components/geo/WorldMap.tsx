import React, { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useTheme } from "../../lib/theme";
import { Spinner } from "../ui/core";
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
  const { maxVal, countryDataMap } = useMemo(() => {
    let max = 0;
    const map = new Map<string, number>();

    data.forEach((d) => {
      // Backend returns ISO Alpha-2 (e.g., "US", "IN")
      // We store it mapped to the Normalized Name for matching against GeoJSON
      const name = getCountryName(d._id);
      map.set(normalizeName(name), d.count);
      if (d.count > max) max = d.count;
    });

    return { maxVal: max, countryDataMap: map };
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
                // Match Logic: Compare Normalized GeoJSON Name vs Normalized Backend Name
                const geoName = geo.properties.name || "";
                const normalizedGeoName = normalizeName(geoName);
                const count = countryDataMap.get(normalizedGeoName) || 0;

                // Calculate Intensity (0.1 to 1.0)
                // We assume 0 visits = very faint/muted
                const percentage = maxVal > 0 ? (count / maxVal) : 0;

                // Fill Color: Theme-based variable with opacity
                // If count > 0: use foreground/mono with intensity
                // If count == 0: use muted with low opacity
                const fillStyle = count > 0
                  ? `hsl(var(${targetVar}) / ${Math.max(0.15, percentage)})`
                  : `hsl(var(--muted) / 0.2)`;

                // Stroke (Border) Color
                const strokeColor = "hsl(var(--border) / 0.5)";
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
                        fill: fillStyle,
                        stroke: strokeColor,
                        strokeWidth: 0.5,
                        outline: "none",
                        transition: "fill 0.3s ease, stroke 0.2s ease"
                      },
                      hover: {
                        fill: fillStyle, // Don't change fill on hover (Rule 6)
                        stroke: hoverStroke, // Highlight border (Rule 6)
                        strokeWidth: 1.5,
                        outline: "none",
                        cursor: "pointer",
                        zIndex: 10
                      },
                      pressed: {
                        fill: fillStyle,
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