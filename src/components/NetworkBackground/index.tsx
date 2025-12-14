import { useEffect, useState, useRef, useCallback } from 'react';

interface Trace {
  id: string;
  path: string;
}

interface Node {
  id: string;
  x: number;
  y: number;
  status: 'pending' | 'up' | 'down';
}

const GRID_SIZE = 64;
const CORNER_RADIUS = 16; // Radius for rounded turns
const WORKER_COUNT = 2; // Concurrent Worker
const TRAVEL_DURATION = 2000;

export const NetworkBackground = () => {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  // Use a ref to track active timeouts for cleanup
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  // Helper to safely set timeout and track it
  const safeTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      // Remove from tracking when done
      timeouts.current = timeouts.current.filter(t => t !== id);
      fn();
    }, delay);
    timeouts.current.push(id);
    return id;
  };

  const getGridDimensions = () => {
    if (!containerRef.current) return { cols: 10, rows: 10 };
    const { clientWidth, clientHeight } = containerRef.current;
    return {
      cols: Math.ceil(clientWidth / GRID_SIZE),
      rows: Math.ceil(clientHeight / GRID_SIZE)
    };
  };

  const getRandomPoint = () => {
    const { cols, rows } = getGridDimensions();
    // Padding to avoid edges
    return {
      x: Math.floor(Math.random() * (cols - 2) + 1) * GRID_SIZE,
      y: Math.floor(Math.random() * (rows - 2) + 1) * GRID_SIZE
    };
  };

  // --- Path Generation ---
  const generatePath = (start: { x: number, y: number }, end: { x: number, y: number }) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const stepsX = Math.floor(absDx / GRID_SIZE);
    const stepsY = Math.floor(absDy / GRID_SIZE);

    // Base Case: Straight line if aligned
    if (stepsX === 0 || stepsY === 0) {
      return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    // Constraint: "number of turns should be less the min of horizontal and vertical steps"
    // Range: [1, maxTurns). We force at least 1 turn for diagonal movement.
    const maxTurns = Math.min(stepsX, stepsY);
    const possibleTurns = Math.max(1, maxTurns - 1);
    const numTurns = Math.floor(Math.random() * possibleTurns) + 1;

    const segments = numTurns + 1;

    // Partition function: distributes 'total' units into 'parts' buckets (each >= 1)
    const partition = (total: number, parts: number) => {
      if (parts <= 0) return [];
      if (parts === 1) return [total];

      // Start with 1 in each bucket
      const buckets = new Array(parts).fill(1);
      let remaining = total - parts;

      // Randomly distribute remaining units
      while (remaining > 0) {
        const idx = Math.floor(Math.random() * parts);
        buckets[idx]++;
        remaining--;
      }
      return buckets;
    };

    // Determine axes for segments (Random start axis)
    const startAxisX = Math.random() > 0.5;

    let countX = 0;
    let countY = 0;

    // Calculate how many segments belong to each axis
    for (let i = 0; i < segments; i++) {
      // If starting X: Even i is X, Odd i is Y
      if (startAxisX) {
        if (i % 2 === 0) countX++; else countY++;
      } else {
        if (i % 2 === 0) countY++; else countX++;
      }
    }

    const xSegs = partition(stepsX, countX);
    const ySegs = partition(stepsY, countY);

    const points = [{ x: start.x, y: start.y }];
    let curX = start.x;
    let curY = start.y;

    let xUsed = 0;
    let yUsed = 0;

    const dirX = dx > 0 ? 1 : -1;
    const dirY = dy > 0 ? 1 : -1;

    // Generate Waypoints
    for (let i = 0; i < segments; i++) {
      const isX = startAxisX ? (i % 2 === 0) : (i % 2 !== 0);

      if (isX) {
        if (xUsed < xSegs.length) {
          const dist = xSegs[xUsed++] * GRID_SIZE;
          curX += dist * dirX;
        }
      } else {
        if (yUsed < ySegs.length) {
          const dist = ySegs[yUsed++] * GRID_SIZE;
          curY += dist * dirY;
        }
      }
      points.push({ x: curX, y: curY });
    }

    // Filter duplicates just in case
    const uniquePoints = points.filter((p, i) => i === 0 || (p.x !== points[i - 1].x || p.y !== points[i - 1].y));

    if (uniquePoints.length < 2) return "";

    // Construct SVG Path with rounded corners
    let d = `M ${uniquePoints[0].x} ${uniquePoints[0].y}`;

    for (let i = 1; i < uniquePoints.length; i++) {
      const pPrev = uniquePoints[i - 1];
      const pCurr = uniquePoints[i];
      const pNext = uniquePoints[i + 1];

      if (pNext) {
        // Draw line to "near" the corner
        const dx = pCurr.x - pPrev.x;
        const dy = pCurr.y - pPrev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CORNER_RADIUS * 2) {
          d += ` L ${pCurr.x} ${pCurr.y}`;
        } else {
          const ux = dx / dist;
          const uy = dy / dist;
          const targetX = pCurr.x - (ux * CORNER_RADIUS);
          const targetY = pCurr.y - (uy * CORNER_RADIUS);
          d += ` L ${targetX} ${targetY}`;

          // Quadratic curve to start of next segment
          const ndx = pNext.x - pCurr.x;
          const ndy = pNext.y - pCurr.y;
          const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
          const nux = ndx / ndist;
          const nuy = ndy / ndist;
          const curveEndX = pCurr.x + (nux * CORNER_RADIUS);
          const curveEndY = pCurr.y + (nuy * CORNER_RADIUS);

          d += ` Q ${pCurr.x} ${pCurr.y} ${curveEndX} ${curveEndY}`;
        }
      } else {
        // Last segment
        d += ` L ${pCurr.x} ${pCurr.y}`;
      }
    }

    return d;
  };

  const runWorker = useCallback(async (workerId: number, startPos?: { x: number, y: number }) => {
    // 1. Determine Start & End
    const currentStart = startPos || getRandomPoint();
    let endPos = getRandomPoint();

    // Ensure min distance
    let attempts = 0;
    while (
      (Math.abs(endPos.x - currentStart.x) + Math.abs(endPos.y - currentStart.y) < GRID_SIZE * 4)
      && attempts < 10
    ) {
      endPos = getRandomPoint();
      attempts++;
    }

    const pathString = generatePath(currentStart, endPos);
    const traceId = `trace-${workerId}-${Date.now()}`;
    const nodeId = `node-${workerId}-${Date.now()}`;

    // 2. Travel
    setTraces(prev => [...prev, { id: traceId, path: pathString }]);

    // Wait for CSS animation
    await new Promise<void>(resolve => safeTimeout(resolve, TRAVEL_DURATION));

    // 3. Arrival & Ping
    setNodes(prev => [...prev, { id: nodeId, x: endPos.x, y: endPos.y, status: 'pending' }]);

    // Remove trace slightly after arrival to smooth visual
    safeTimeout(() => {
      setTraces(prev => prev.filter(t => t.id !== traceId));
    }, 200);

    // 4. Processing Delay (Random)
    const delay = 1000 + Math.random() * 1500;
    await new Promise<void>(resolve => safeTimeout(resolve, delay));

    // 5. Result
    const status = Math.random() > 0.9 ? 'down' : 'up';
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status } : n));

    // 6. Move Next
    await new Promise<void>(resolve => safeTimeout(resolve, 2000)); // Show result for 2s

    // Cleanup Node
    setNodes(prev => prev.filter(n => n.id !== nodeId));

    // Loop
    runWorker(workerId, endPos);
  }, []);

  useEffect(() => {
    // Clear any existing timeouts on mount/unmount to prevent ghosts
    const currentContainer = containerRef.current;

    if (currentContainer) {
      // Start Workers staggered based on count
      for (let i = 0; i < WORKER_COUNT; i++) {
        safeTimeout(() => runWorker(i + 1), i * 1500);
      }
    }

    return () => {
      // Cleanup all pending timers
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, [runWorker]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-background">
      {/* Styles */}
      <style>{`
        @keyframes draw-path {
          0% { stroke-dasharray: 0, 3000; stroke-dashoffset: 0; opacity: 0; }
          10% { opacity: 1; }
          100% { stroke-dasharray: 3000, 0; stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes radar-ping {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes result-pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .anim-draw { animation: draw-path ${TRAVEL_DURATION}ms linear forwards; }
        .anim-radar { animation: radar-ping 1.5s infinite ease-out; }
        .anim-pop { animation: result-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--ring)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--ring)) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, black 40%, transparent 100%)'
        }}
      />

      <svg className="absolute inset-0 w-full h-full">
        {traces.map(trace => (
          <path
            key={trace.id}
            d={trace.path}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="anim-draw"
            style={{ filter: 'drop-shadow(0 0 3px hsl(var(--primary) / 0.4))' }}
          />
        ))}

        {nodes.map(node => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            {node.status === 'pending' && (
              <>
                <circle r="4" fill="hsl(var(--primary))" />
                <circle r="4" stroke="hsl(var(--primary))" strokeWidth="1" fill="none" className="anim-radar" />
              </>
            )}
            {node.status !== 'pending' && (
              <g className="anim-pop">
                <circle r="8" fill="none" stroke={node.status === 'up' ? '#10b981' : '#ef4444'} strokeWidth="1.5" opacity="0.6" />
                <circle r="4" fill={node.status === 'up' ? '#10b981' : '#ef4444'} />
              </g>
            )}
          </g>
        ))}
      </svg>

      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background opacity-80" />
    </div>
  );
};