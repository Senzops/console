import { useEffect, useState, useRef } from 'react';

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

const GRID_SIZE = 64; // Matches the 4rem bg-grid size
const WORKER_COUNT = 2; // Only 2 concurrent workers
const TRAVEL_DURATION = 2000; // 2 seconds to travel

export const NetworkBackground = () => {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  // --- Helpers ---
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
    return {
      x: Math.floor(Math.random() * cols) * GRID_SIZE,
      y: Math.floor(Math.random() * rows) * GRID_SIZE
    };
  };

  // --- Worker Logic ---
  const runWorker = async (workerId: number, startPos: { x: number, y: number }) => {
    if (!isMounted.current) return;

    // 1. Pick Destination
    let endPos = getRandomPoint();
    // Ensure significant travel distance
    while (Math.abs(endPos.x - startPos.x) < GRID_SIZE * 2 && Math.abs(endPos.y - startPos.y) < GRID_SIZE * 2) {
      endPos = getRandomPoint();
    }

    // 2. Generate Manhattan Path (L-Shape)
    const goXFirst = Math.random() > 0.5;
    let pathString = `M ${startPos.x} ${startPos.y} `;
    if (goXFirst) {
      pathString += `L ${endPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`;
    } else {
      pathString += `L ${startPos.x} ${endPos.y} L ${endPos.x} ${endPos.y}`;
    }

    const traceId = `trace-${workerId}-${Date.now()}`;
    const nodeId = `node-${workerId}-${Date.now()}`;

    // 3. START TRAVEL
    setTraces(prev => [...prev, { id: traceId, path: pathString }]);

    // Wait for travel animation
    await new Promise(r => setTimeout(r, TRAVEL_DURATION));
    if (!isMounted.current) return;

    // 4. ARRIVAL (Remove Trace, Show Pending Ping)
    setTraces(prev => prev.filter(t => t.id !== traceId));
    setNodes(prev => [...prev, { id: nodeId, x: endPos.x, y: endPos.y, status: 'pending' }]);

    // 5. VERIFYING (Random 1-2s delay)
    const verificationTime = 1000 + Math.random() * 1000;
    await new Promise(r => setTimeout(r, verificationTime));
    if (!isMounted.current) return;

    // 6. SHOW STATUS (Up/Down)
    const status = Math.random() > 0.5 ? 'down' : 'up';
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status } : n));

    // 7. LINGER (Show result for a moment)
    await new Promise(r => setTimeout(r, 1500));
    if (!isMounted.current) return;

    // 8. CLEANUP & MOVE NEXT
    setNodes(prev => prev.filter(n => n.id !== nodeId));

    // Recursive call with new start position
    runWorker(workerId, endPos);
  };

  // --- Lifecycle ---
  useEffect(() => {
    isMounted.current = true;

    // Initialize Workers
    if (containerRef.current) {
      for (let i = 0; i < WORKER_COUNT; i++) {
        setTimeout(() => runWorker(i + 1, getRandomPoint()), 1200 * i);
      }
    }

    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-background">

      <style>{`
        @keyframes draw-line {
          0% { stroke-dasharray: 0, 2000; stroke-dashoffset: 0; opacity: 0; }
          10% { opacity: 1; }
          100% { stroke-dasharray: 2000, 0; stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes ping-radar {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes status-pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .anim-draw {
          animation: draw-line ${TRAVEL_DURATION}ms ease-in forwards;
        }
        .anim-radar {
          animation: ping-radar 1.5s infinite ease-out;
        }
        .anim-pop {
          animation: status-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* 1. Static Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--ring)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--ring)) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* 2. SVG Layer for Lines and Nodes */}
      <svg className="absolute inset-0 w-full h-full">
        {/* Active Traces */}
        {traces.map(trace => (
          <path
            key={trace.id}
            d={trace.path}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            className="anim-draw"
            style={{ filter: 'drop-shadow(0 0 2px hsl(var(--primary) / 0.5))' }}
          />
        ))}

        {/* Nodes (Destinations) */}
        {nodes.map(node => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            {/* Pending State: Radar Ping */}
            {node.status === 'pending' && (
              <>
                <circle r="5" fill="hsl(var(--primary))" />
                <circle r="5" stroke="hsl(var(--primary))" strokeWidth="1" fill="none" className="anim-radar" />
              </>
            )}

            {/* Result State: Up (Green) or Down (Red) */}
            {node.status !== 'pending' && (
              <g className="anim-pop">
                {/* Outer Glow */}
                <circle
                  r="10"
                  fill="none"
                  stroke={node.status === 'up' ? '#10b981' : '#ef4444'}
                  strokeWidth="1"
                  opacity="0.5"
                />
                {/* Inner Dot */}
                <circle
                  r="5"
                  fill={node.status === 'up' ? '#10b981' : '#ef4444'}
                />
              </g>
            )}
          </g>
        ))}
      </svg>

      {/* 3. Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background opacity-80" />
    </div>
  );
};