"use client"

import { cn } from "@/lib/utils"

interface HireWireLogoProps {
  className?: string
  variant?: "light" | "dark" | "red"
  size?: "sm" | "md" | "lg" | "xl"
}

const sizes = {
  sm: "h-10",
  md: "h-14",
  lg: "h-20",
  xl: "h-28",
}

export function HireWireLogo({ 
  className, 
  variant = "dark",
  size = "md" 
}: HireWireLogoProps) {
  const color = variant === "light" ? "#FFFFFF" : variant === "red" ? "#BD0A0A" : "#1a1a1a"
  
  return (
    <svg 
      viewBox="0 0 400 120" 
      className={cn(sizes[size], "w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barbed wire ABOVE the text */}
      <g fill={color} stroke={color}>
        {/* Main horizontal wire */}
        <line x1="40" y1="25" x2="360" y2="25" strokeWidth="2" />
        
        {/* Left star/barb cluster */}
        <path d="M55,25 L50,15 L55,20 L60,12 L55,20 L65,18 L55,22 L68,25 L55,28 L65,32 L55,28 L60,38 L55,30 L50,35 L55,25" fill={color} />
        
        {/* Barb 1 */}
        <circle cx="100" r="3" cy="25" />
        <line x1="92" y1="18" x2="108" y2="32" strokeWidth="2.5" />
        <line x1="92" y1="32" x2="108" y2="18" strokeWidth="2.5" />
        
        {/* Barb 2 */}
        <circle cx="160" r="3" cy="25" />
        <line x1="152" y1="18" x2="168" y2="32" strokeWidth="2.5" />
        <line x1="152" y1="32" x2="168" y2="18" strokeWidth="2.5" />
        
        {/* Barb 3 */}
        <circle cx="240" r="3" cy="25" />
        <line x1="232" y1="18" x2="248" y2="32" strokeWidth="2.5" />
        <line x1="232" y1="32" x2="248" y2="18" strokeWidth="2.5" />
        
        {/* Barb 4 */}
        <circle cx="300" r="3" cy="25" />
        <line x1="292" y1="18" x2="308" y2="32" strokeWidth="2.5" />
        <line x1="292" y1="32" x2="308" y2="18" strokeWidth="2.5" />
        
        {/* Right star/barb cluster */}
        <path d="M345,25 L340,15 L345,20 L350,12 L345,20 L355,18 L345,22 L358,25 L345,28 L355,32 L345,28 L350,38 L345,30 L340,35 L345,25" fill={color} />
      </g>
      
      {/* HIREWIRE text - bold italic style */}
      <text 
        x="50" 
        y="72" 
        fontFamily="'Impact', 'Haettenschweiler', 'Arial Narrow Bold', sans-serif" 
        fontSize="52" 
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="2"
        fill={color}
      >
        HIREWIRE
      </text>
      
      {/* Diagonal speed lines BELOW the text */}
      <g stroke={color} strokeWidth="4" strokeLinecap="round">
        {/* Speed lines - diagonal stripes */}
        <line x1="50" y1="85" x2="70" y2="105" />
        <line x1="70" y1="85" x2="90" y2="105" />
        <line x1="90" y1="85" x2="110" y2="105" />
        <line x1="110" y1="85" x2="130" y2="105" />
        <line x1="130" y1="85" x2="150" y2="105" />
        <line x1="150" y1="85" x2="170" y2="105" />
        <line x1="170" y1="85" x2="190" y2="105" />
        <line x1="190" y1="85" x2="210" y2="105" />
        <line x1="210" y1="85" x2="230" y2="105" />
        <line x1="230" y1="85" x2="250" y2="105" />
        <line x1="250" y1="85" x2="270" y2="105" />
        <line x1="270" y1="85" x2="290" y2="105" />
        <line x1="290" y1="85" x2="310" y2="105" />
        <line x1="310" y1="85" x2="330" y2="105" />
        <line x1="330" y1="85" x2="350" y2="105" />
      </g>
      
      {/* Right side star accent */}
      <g fill={color}>
        <path d="M365,95 L360,85 L365,90 L370,82 L365,90 L375,88 L365,92 L378,95 L365,98 L375,102 L365,98 L370,108 L365,100 L360,105 L365,95" />
      </g>
    </svg>
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
      className={cn(sizes[size], "w-auto", className)}
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
