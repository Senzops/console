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
    const points = [start];

    // Simple random walker that biases towards target
    // We want 1 or 2 intermediate turns usually
    // Axis aligned moves only

    const midX = Math.floor((Math.random() * (Math.abs(end.x - start.x) / GRID_SIZE))) * GRID_SIZE;
    const midY = Math.floor((Math.random() * (Math.abs(end.y - start.y) / GRID_SIZE))) * GRID_SIZE;

    // Determine complexity (1 turn or 2 turns)
    const complexity = Math.random();

    if (complexity > 0.5) {
      // 2 Turns (Z-shape)
      if (Math.random() > 0.5) {
        // Horizontal first
        const p1 = { x: start.x < end.x ? start.x + midX : start.x - midX, y: start.y };
        if (p1.x !== start.x) points.push(p1);

        const p2 = { x: p1.x, y: end.y };
        points.push(p2);
      } else {
        // Vertical first
        const p1 = { x: start.x, y: start.y < end.y ? start.y + midY : start.y - midY };
        if (p1.y !== start.y) points.push(p1);

        const p2 = { x: end.x, y: p1.y };
        points.push(p2);
      }
    } else {
      // 1 Turn (L-shape)
      if (Math.random() > 0.5) {
        points.push({ x: end.x, y: start.y });
      } else {
        points.push({ x: start.x, y: end.y });
      }
    }

    points.push(end);

    // Remove duplicates
    const uniquePoints = points.filter((p, i) => i === 0 || (p.x !== points[i - 1].x || p.y !== points[i - 1].y));

    // Construct SVG Path with rounded corners
    if (uniquePoints.length < 2) return "";

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

        // If segment is too short for radius, just line to it (no curve)
        if (dist < CORNER_RADIUS * 2) {
          d += ` L ${pCurr.x} ${pCurr.y}`;
        } else {
          // Line to start of curve
          const ux = dx / dist;
          const uy = dy / dist;
          const targetX = pCurr.x - (ux * CORNER_RADIUS);
          const targetY = pCurr.y - (uy * CORNER_RADIUS);
          d += ` L ${targetX} ${targetY}`;

          // Quadratic curve to end of curve (start of next segment)
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
        // Last point, just line to it
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