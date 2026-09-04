import React from 'react';

export const LogoIcon = ({
  size = 28,
  style = {},
  className = "",
}: {
  size?: number | string;
  style?: React.CSSProperties;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: "inline-block", verticalAlign: "middle", ...style }}
  >
    <defs>
      <linearGradient id="grad-front" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <linearGradient id="grad-back" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="grad-glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
      </linearGradient>
      <filter id="blur-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>
    
    {/* Subtle Glow */}
    <path d="M20 6 L34 20 L20 34 L6 20 Z" fill="url(#grad-glow)" filter="url(#blur-glow)" />

    {/* Back diamond (Emerald to Blue) */}
    <path d="M20 12 L34 26 L20 40 L6 26 Z" fill="url(#grad-back)" opacity="0.9" />
    
    {/* Front diamond (Cyan to Indigo) */}
    <path d="M20 0 L34 14 L20 28 L6 14 Z" fill="url(#grad-front)" opacity="0.95" />
    
    {/* Top highlight / glass effect */}
    <path d="M20 0 L34 14 L20 16 L6 14 Z" fill="white" opacity="0.15" />
  </svg>
);

export const LogoText = ({ style, fontSize = "1.125rem" }: { style?: React.CSSProperties, fontSize?: string }) => (
  <span style={{ 
    fontSize, 
    fontWeight: 800, 
    letterSpacing: "-0.04em", 
    color: "var(--text-primary)",
    display: "inline-flex",
    alignItems: "center",
    ...style 
  }}>
    Revive<span style={{ 
      color: "transparent", 
      backgroundClip: "text", 
      WebkitBackgroundClip: "text", 
      backgroundImage: "linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)",
      marginLeft: "1px"
    }}>OS</span>
  </span>
);
