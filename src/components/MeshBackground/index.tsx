import React, { useRef, useEffect } from "react";

export const MeshBackground = ({
  className = "",
}: {
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let isVisible = true;

    // --- Enterprise Optimization: Retina Display Sharpness ---
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // --- Configuration ---
    const lines = 18; // Number of horizontal data streams
    const segments = 80; // Resolution of the curves (lower = higher performance)

    // Brand Colors: Teal & Blue glowing streams
    const colorStart = "rgba(20, 184, 166, 0.15)"; // Teal
    const colorEnd = "rgba(59, 130, 246, 0.15)"; // Blue
    const packetColor = "rgba(255, 255, 255, 0.8)"; // Moving data packets

    const render = () => {
      if (!isVisible) return; // Pause calculation when off-screen

      const width = container.clientWidth;
      const height = container.clientHeight;

      ctx.clearRect(0, 0, width, height);

      // Create a horizontal gradient for the lines
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(1, colorEnd);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = gradient;

      // Global composite for a subtle glowing "Shader" effect
      ctx.globalCompositeOperation = "screen";

      const segmentWidth = width / segments;

      // Draw the Liquid Data Mesh
      for (let i = 0; i < lines; i++) {
        ctx.beginPath();

        // Vertical spacing
        const yBase = (height / lines) * i;

        for (let j = 0; j <= segments; j++) {
          const x = j * segmentWidth;

          // Mathematical fluid interference (Shader imitation)
          // Combines multiple frequencies and phases to create organic, liquid movement
          const wave1 = Math.sin(x * 0.003 + time * 0.8 + i * 0.1) * 30;
          const wave2 = Math.cos(x * 0.005 - time * 0.5 + i * 0.2) * 20;
          const wave3 = Math.sin(x * 0.001 + time * 0.3) * 15;

          // Parallax effect: lines lower down move slightly differently
          const depthPerspective = (i / lines) * 10;

          const y = yBase + wave1 + wave2 + wave3 + depthPerspective;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          // Render subtle "Data Packets" moving along the streams
          // Calculate a traveling dot for every 3rd line
          if (i % 3 === 0) {
            const packetPos = (time * 50 + i * 100) % width;
            if (Math.abs(x - packetPos) < segmentWidth) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(x, y, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = packetColor;
              ctx.shadowBlur = 8;
              ctx.shadowColor = "rgba(20, 184, 166, 0.8)";
              ctx.fill();
              ctx.restore();
            }
          }
        }
        ctx.stroke();
      }

      time += 0.015; // Animation speed
      animationFrameId = requestAnimationFrame(render);
    };

    // --- Enterprise Optimization: Intersection Observer ---
    // Strictly pauses the Web API Event Loop when the hero is out of view
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          render();
        } else {
          cancelAnimationFrame(animationFrameId);
        }
      },
      { threshold: 0 },
    );

    observer.observe(container);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
