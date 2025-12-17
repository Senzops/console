import { Server, Globe, Activity } from 'lucide-react';

export const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* 1. CSS Styles for Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.5); }
        }
        .anim-float { animation: float 10s ease-in-out infinite; }
        .anim-float-delayed { animation: float-delayed 12s ease-in-out infinite; }
        .anim-float-slow { animation: float-slow 15s ease-in-out infinite; }
        .anim-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
      `}</style>

      {/* 2. Infrastructure Grid Pattern */}
      {/* Uses theme 'muted' color for lines */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--ring)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--ring)) 1px, transparent 1px)
          `,
          backgroundSize: '4rem 4rem',
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 50%, black 40%, transparent 100%)'
        }}
      />

      {/* 3. Uptime "Status Lights" (Pulsing Dots) */}
      {/* Uses theme 'primary' color */}
      <div className="absolute top-[25%] left-[20%]">
        <div className="w-2 h-2 rounded-full bg-emerald-500/80 anim-pulse-glow" style={{ animationDelay: '0s' }} />
      </div>
      <div className="absolute top-[65%] right-[25%]">
        <div className="w-2 h-2 rounded-full bg-emerald-500/80 anim-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>
      <div className="absolute bottom-[30%] left-[10%]">
        <div className="w-2 h-2 rounded-full bg-blue-500/80 anim-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* 4. Vignette / Focus Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background opacity-80" />
    </div>
  );
};