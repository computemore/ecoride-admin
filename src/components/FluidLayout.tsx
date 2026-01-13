import React, { ReactNode } from 'react';
import '../FluidBackground.css'; // Import the CSS file created above

interface FluidLayoutProps {
  children: ReactNode;
  className?: string; // Optional: allows you to add extra tailwind classes if needed
}

export const FluidLayout: React.FC<FluidLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`fluid-background-container ${className}`}>
      {/* This overlay adds a subtle noise texture if you want 
         extra realism (Optional) 
      */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} 
      />
      
      {/* The actual page content (Login form, etc) */}
      <div style={{ zIndex: 1, position: 'relative', width: '100%' }}>
        {children}
      </div>
    </div>
  );
};