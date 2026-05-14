import React, { useRef, useEffect } from "react";
import { useTheme } from "../../lib/theme";

export const MeshBackground = ({
  className = "",
}: {
  className?: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hook into the global theme state so the animation can re-render if the user switches palettes
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let isVisible = true;

    // --- Static Theme Mapping ---
    // getComputedStyle creates a race condition with React's DOM rendering cycle,
    // causing the canvas to grab the default dark theme variables before the HTML
    // tag receives the data-theme attribute. Hardcoding the system variables here
    // guarantees zero-latency, 100% accurate color resolution.
    // We use standard comma-separated HSL values for maximum Canvas API compatibility.
    const getThemeColors = (currentTheme: string) => {
      switch (currentTheme) {
        case "light":
          return { primary: "240, 5.9%, 10%", muted: "240, 3.8%, 46.1%" };
        case "nord":
          return { primary: "193, 43%, 67%", muted: "218, 27%, 92%" };
        case "latte":
          return { primary: "24, 25%, 45%", muted: "24, 5%, 50%" };
        case "dark":
        default:
          return { primary: "0, 0%, 98%", muted: "240, 5%, 64.9%" };
      }
    };

    const { primary, muted } = getThemeColors(theme);

    // --- Optimization: Retina Display Sharpness ---
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
    const lines = 15; // Elegant, not overly cluttered
    const segments = 100; // High resolution for smooth bezier-like curves

    const render = () => {
      if (!isVisible) return; // Pause calculation when off-screen

      const width = container.clientWidth;
      const height = container.clientHeight;

      ctx.clearRect(0, 0, width, height);

      // Create a fading horizontal gradient to blend seamlessly into the background edges
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `hsla(${primary}, 0)`);
      gradient.addColorStop(0.15, `hsla(${primary}, 0.15)`);
      gradient.addColorStop(0.5, `hsla(${primary}, 0.25)`);
      gradient.addColorStop(0.85, `hsla(${muted}, 0.15)`);
      gradient.addColorStop(1, `hsla(${muted}, 0)`);

      ctx.lineWidth = 1;
      ctx.strokeStyle = gradient;

      // Standard alpha blending ensures it looks beautiful in both Light and Dark modes
      ctx.globalCompositeOperation = "source-over";

      const segmentWidth = width / segments;

      // Draw the Liquid Data Mesh
      for (let i = 0; i < lines; i++) {
        ctx.beginPath();

        // Vertical centering with dynamic spread
        const yBase = height / 2 + (i - lines / 2) * (height / lines);

        for (let j = 0; j <= segments; j++) {
          const x = j * segmentWidth;

          // Organic liquid math: slower, sweeping sine waves
          // We use the line index (i) to offset phases and create geometric depth
          const wave1 = Math.sin(x * 0.0015 + time * 0.4 + i * 0.15) * 45;
          const wave2 = Math.cos(x * 0.0025 - time * 0.2 + i * 0.08) * 25;
          const wave3 = Math.sin(x * 0.0008 + time * 0.5) * 15;

          // Math "Pinch": Forces the waves to taper to 0 amplitude at the far left/right edges,
          // creating an elegant, centralized "beam" effect rather than messy edge intersections.
          const pinch = Math.sin((j / segments) * Math.PI);

          const y = yBase + (wave1 + wave2 + wave3) * pinch;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          // Render "Data Packets" (Moving glowing dots) along the streams
          if (i % 4 === 0) {
            const packetPos = (time * 60 + i * 200) % width;
            if (Math.abs(x - packetPos) < segmentWidth) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(x, y, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = `hsla(${primary}, 0.8)`;

              // Only apply glow effects on dark themes. Shadows in light mode often look like dirt.
              if (theme === "dark" || theme === "nord") {
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsla(${primary}, 0.8)`;
              } else {
                ctx.shadowBlur = 0; // Explicitly disable shadow to prevent artifacts
              }

              ctx.fill();
              ctx.restore();
            }
          }
        }
        ctx.stroke();
      }

      time += 0.01; // Slower, ambient animation speed
      animationFrameId = requestAnimationFrame(render);
    };

    // --- Optimization: Intersection Observer ---
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
  }, [theme]); // Re-initialize the canvas if the user hot-swaps the theme

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
