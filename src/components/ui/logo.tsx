import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <div className={className}>
      <svg viewBox="30 10 140 180" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Define gradients for depth and shine */}
        <defs>
          {/* Main gradient for the hexagon faces */}
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#4C1D95', stopOpacity: 1 }} />
          </linearGradient>
          
          {/* Darker gradient for depth */}
          <linearGradient id="darkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#4C1D95', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#1E1B4B', stopOpacity: 1 }} />
          </linearGradient>
          
          {/* Light gradient for highlights */}
          <linearGradient id="lightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#A78BFA', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
          </linearGradient>
          
          {/* Bright gradient for hover effect */}
          <linearGradient id="hoverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#C4B5FD', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#A78BFA', stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Outer hexagon shape */}
        <polygon 
          points="100,20 170,60 170,140 100,180 30,140 30,60" 
          fill="url(#purpleGradient)" 
          stroke="#1E1B4B" 
          strokeWidth="2"
        />
        
        {/* Top-left face */}
        <polygon 
          points="100,20 30,60 100,100" 
          fill="url(#lightGradient)" 
          opacity="0.9"
        />
        
        {/* Top-right face */}
        <polygon 
          points="100,20 170,60 100,100" 
          fill="url(#purpleGradient)" 
          opacity="0.8"
        />
        
        {/* Right face */}
        <polygon 
          points="170,60 170,140 100,100" 
          fill="url(#darkGradient)" 
          opacity="0.7"
        />
        
        {/* Bottom-right face */}
        <polygon 
          points="170,140 100,180 100,100" 
          fill="url(#darkGradient)" 
          opacity="0.9"
        />
        
        {/* Bottom-left face */}
        <polygon 
          points="100,180 30,140 100,100" 
          fill="url(#purpleGradient)" 
          opacity="0.7"
        />
        
        {/* Left face */}
        <polygon 
          points="30,140 30,60 100,100" 
          fill="url(#lightGradient)" 
          opacity="0.6"
        />
      </svg>
    </div>
  );
}