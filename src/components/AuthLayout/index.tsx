import React from 'react';
import { AnimatedBackground } from '../AnimatedBackground';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-background transition-colors duration-300">

      {/* Background Component */}
      <div className='fixed top-0 left-0 h-screen w-screen'>
        <AnimatedBackground />
      </div>

      {/* Content Layer */}
      {/* z-10 ensures content sits above the background */}
      <div className="relative z-10 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-500">
        {children}
      </div>

      {/* Footer Branding */}
      <div className="fixed bottom-6 text-xs text-muted-foreground z-1">
        &copy; {new Date().getFullYear()} Senzor Platforms
      </div>
    </div>
  );
};