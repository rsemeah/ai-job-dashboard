"use client"

import { cn } from "@/lib/utils"

interface BarbedWireLineProps {
  className?: string
  variant?: "horizontal" | "vertical"
  intensity?: "light" | "medium" | "strong"
}

export function BarbedWireLine({ 
  className, 
  variant = "horizontal",
  intensity = "light" 
}: BarbedWireLineProps) {
  const opacityMap = {
    light: "opacity-[0.18]",
    medium: "opacity-[0.30]",
    strong: "opacity-[0.45]"
  }

  if (variant === "vertical") {
    return (
      <div className={cn("absolute right-0 top-0 bottom-0 w-[4px] pointer-events-none", className)}>
        <svg
          className={cn("h-full w-full", opacityMap[intensity])}
          viewBox="0 0 4 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <linearGradient id="wireGradientV" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d90009" stopOpacity="0" />
              <stop offset="15%" stopColor="#d90009" stopOpacity="1" />
              <stop offset="85%" stopColor="#d90009" stopOpacity="1" />
              <stop offset="100%" stopColor="#d90009" stopOpacity="0" />
            </linearGradient>
            {/* Chrome highlight */}
            <linearGradient id="chromeV" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#1a1714" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Main wire - slightly thicker */}
          <line x1="2" y1="0" x2="2" y2="100" stroke="url(#wireGradientV)" strokeWidth="0.8" />
          {/* Chrome highlight line */}
          <line x1="1.5" y1="0" x2="1.5" y2="100" stroke="url(#chromeV)" strokeWidth="0.3" />
          {/* Barbs - sharper, tighter */}
          {[8, 18, 28, 38, 48, 58, 68, 78, 88].map((y) => (
            <g key={y}>
              <line x1="0" y1={y} x2="4" y2={y - 3} stroke="#d90009" strokeWidth="0.4" />
              <line x1="0" y1={y} x2="4" y2={y + 3} stroke="#d90009" strokeWidth="0.4" />
              <circle cx="2" cy={y} r="0.6" fill="#d90009" />
            </g>
          ))}
        </svg>
      </div>
    )
  }

  return (
    <div className={cn("relative w-full h-[4px]", className)}>
      <svg
        className={cn("w-full h-full", opacityMap[intensity])}
        viewBox="0 0 100 4"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="wireGradientH" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d90009" stopOpacity="0" />
            <stop offset="10%" stopColor="#d90009" stopOpacity="1" />
            <stop offset="90%" stopColor="#d90009" stopOpacity="1" />
            <stop offset="100%" stopColor="#d90009" stopOpacity="0" />
          </linearGradient>
          {/* Chrome highlight */}
          <linearGradient id="chromeH" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#1a1714" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {/* Main wire */}
        <line x1="0" y1="2" x2="100" y2="2" stroke="url(#wireGradientH)" strokeWidth="0.8" />
        {/* Chrome highlight */}
        <line x1="0" y1="1.5" x2="100" y2="1.5" stroke="url(#chromeH)" strokeWidth="0.3" />
        {/* Barbs - sharper */}
        {[6, 14, 22, 30, 38, 46, 54, 62, 70, 78, 86, 94].map((x) => (
          <g key={x}>
            <line x1={x} y1="0" x2={x - 2} y2="4" stroke="#d90009" strokeWidth="0.4" />
            <line x1={x} y1="0" x2={x + 2} y2="4" stroke="#d90009" strokeWidth="0.4" />
            <circle cx={x} cy="2" r="0.5" fill="#d90009" />
          </g>
        ))}
      </svg>
    </div>
  )
}

// Card accent - top right corner with subtle shadow
export function CardWireAccent({ className }: { className?: string }) {
  return (
    <div className={cn("absolute top-0 right-6 w-20 h-[3px] opacity-25", className)}>
      <svg
        className="w-full h-full"
        viewBox="0 0 80 3"
        fill="none"
      >
        <defs>
          <linearGradient id="cardAccentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d90009" stopOpacity="0" />
            <stop offset="30%" stopColor="#d90009" stopOpacity="1" />
            <stop offset="100%" stopColor="#d90009" stopOpacity="0.8" />
          </linearGradient>
          {/* Glow effect */}
          <filter id="cardGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line x1="0" y1="1.5" x2="80" y2="1.5" stroke="url(#cardAccentGrad)" strokeWidth="0.6" filter="url(#cardGlow)" />
        {[16, 32, 48, 64].map((x) => (
          <g key={x}>
            <circle cx={x} cy="1.5" r="0.8" fill="#d90009" />
            <line x1={x - 2} y1="0" x2={x + 2} y2="3" stroke="#d90009" strokeWidth="0.3" />
          </g>
        ))}
      </svg>
    </div>
  )
}

// CTA button underline with shimmer animation
export function CTAWireUnderline({ className }: { className?: string }) {
  return (
    <div className={cn("absolute -bottom-1.5 left-2 right-2 h-[3px] opacity-40 group-hover:opacity-60 transition-opacity duration-300", className)}>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 3"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient id="ctaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d90009" stopOpacity="0" />
            <stop offset="20%" stopColor="#d90009" stopOpacity="1" />
            <stop offset="80%" stopColor="#d90009" stopOpacity="1" />
            <stop offset="100%" stopColor="#d90009" stopOpacity="0" />
          </linearGradient>
          {/* Shimmer gradient for hover */}
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="1.5" x2="100" y2="1.5" stroke="url(#ctaGradient)" strokeWidth="1.2" />
        {/* Barb points */}
        {[15, 35, 55, 75].map((x) => (
          <g key={x}>
            <line x1={x - 2} y1="0" x2={x + 2} y2="3" stroke="#d90009" strokeWidth="0.4" />
            <circle cx={x} cy="1.5" r="0.6" fill="#d90009" />
          </g>
        ))}
      </svg>
    </div>
  )
}

// Empty state wire accent
export function EmptyStateWire({ className }: { className?: string }) {
  return (
    <div className={cn("w-24 h-[2px] mx-auto mb-4 opacity-20", className)}>
      <svg
        className="w-full h-full"
        viewBox="0 0 96 2"
        fill="none"
      >
        <defs>
          <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d90009" stopOpacity="0" />
            <stop offset="50%" stopColor="#d90009" stopOpacity="1" />
            <stop offset="100%" stopColor="#d90009" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="1" x2="96" y2="1" stroke="url(#emptyGrad)" strokeWidth="0.5" />
        {[24, 48, 72].map((x) => (
          <circle key={x} cx={x} cy="1" r="0.8" fill="#d90009" />
        ))}
      </svg>
    </div>
  )
}

// Header background texture
export function HeaderTexture({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]", className)}>
      <svg
        className="w-full h-full"
        viewBox="0 0 200 100"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* Diagonal wire pattern */}
        {[0, 40, 80, 120, 160, 200].map((x) => (
          <g key={x}>
            <line x1={x} y1="0" x2={x + 50} y2="100" stroke="#d90009" strokeWidth="0.5" />
            <line x1={x + 20} y1="0" x2={x + 70} y2="100" stroke="#d90009" strokeWidth="0.3" />
          </g>
        ))}
      </svg>
    </div>
  )
}
