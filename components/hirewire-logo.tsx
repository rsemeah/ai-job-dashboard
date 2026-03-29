"use client"

import { cn } from "@/lib/utils"
import Image from "next/image"

interface HireWireLogoProps {
  className?: string
  variant?: "light" | "dark" | "red"
  size?: "sm" | "md" | "lg" | "xl"
}

const sizes = {
  sm: { height: 40, width: 120 },
  md: { height: 56, width: 168 },
  lg: { height: 80, width: 240 },
  xl: { height: 112, width: 336 },
}

const sizeClasses = {
  sm: "h-10",
  md: "h-14",
  lg: "h-20",
  xl: "h-28",
}

export function HireWireLogo({ 
  className, 
  variant = "red",
  size = "md" 
}: HireWireLogoProps) {
  // For light variant (on dark/red backgrounds), use CSS filter to invert to white
  // For red/dark variants, use the red logo directly
  const isLight = variant === "light"
  
  // Check if custom width is passed via className
  const hasCustomSize = className?.includes("w-[") || className?.includes("h-[")
  
  return (
    <div className={cn(
      !hasCustomSize && sizeClasses[size], 
      "relative", 
      className
    )}>
      <Image
        src="/hirewire-logo-red.png"
        alt="HireWire"
        width={800}
        height={280}
        className={cn(
          "object-contain",
          isLight && "brightness-0 invert" // Makes red logo white for dark backgrounds
        )}
        style={{ width: '100%', height: 'auto' }}
        priority
      />
    </div>
  )
}

export function HireWireIcon({ 
  className,
  variant = "red",
  size = "md"
}: HireWireLogoProps) {
  const color = variant === "light" ? "#FFFFFF" : variant === "red" ? "#BD0A0A" : "#1a1a1a"
  
  return (
    <svg 
      viewBox="0 0 64 64" 
      className={cn(sizeClasses[size], "w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barbed wire top */}
      <line x1="8" y1="12" x2="56" y2="12" stroke={color} strokeWidth="2" />
      <circle cx="32" cy="12" r="2" fill={color} />
      <line x1="28" y1="8" x2="36" y2="16" stroke={color} strokeWidth="2" />
      <line x1="28" y1="16" x2="36" y2="8" stroke={color} strokeWidth="2" />
      
      {/* HW monogram */}
      <text 
        x="8" 
        y="42" 
        fontFamily="'Impact', 'Haettenschweiler', sans-serif" 
        fontSize="28" 
        fontWeight="900"
        fontStyle="italic"
        fill={color}
      >
        HW
      </text>
      
      {/* Speed lines below */}
      <g stroke={color} strokeWidth="3" strokeLinecap="round">
        <line x1="10" y1="48" x2="18" y2="56" />
        <line x1="20" y1="48" x2="28" y2="56" />
        <line x1="30" y1="48" x2="38" y2="56" />
        <line x1="40" y1="48" x2="48" y2="56" />
        <line x1="50" y1="48" x2="58" y2="56" />
      </g>
    </svg>
  )
}
