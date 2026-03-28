"use client"

import { cn } from "@/lib/utils"

interface DiagonalStripesProps {
  className?: string
  /**
   * Position of the stripes - corner positions or full coverage
   */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "full"
  /**
   * Size of the stripe area
   */
  size?: "sm" | "md" | "lg"
  /**
   * Stripe color scheme
   */
  variant?: "black" | "white" | "red"
  /**
   * Opacity of the stripes
   */
  opacity?: number
}

/**
 * Off-White / Virgil Abloh inspired diagonal hazard stripes
 * Creates the iconic industrial aesthetic
 */
export function DiagonalStripes({
  className,
  position = "top-left",
  size = "md",
  variant = "black",
  opacity = 1,
}: DiagonalStripesProps) {
  const sizeMap = {
    sm: { width: 60, height: 60 },
    md: { width: 100, height: 100 },
    lg: { width: 150, height: 150 },
  }

  const positionMap = {
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
    "full": "inset-0",
  }

  const colorMap = {
    black: { stripe: "#2d2d2d", bg: "#ffffff" },
    white: { stripe: "#ffffff", bg: "#2d2d2d" },
    red: { stripe: "#BD0A0A", bg: "#ffffff" },
  }

  const { width, height } = sizeMap[size]
  const { stripe, bg } = colorMap[variant]
  const stripeWidth = size === "sm" ? 8 : size === "md" ? 12 : 16

  return (
    <div
      className={cn(
        "absolute pointer-events-none overflow-hidden",
        positionMap[position],
        position !== "full" && `w-[${width}px] h-[${height}px]`,
        className
      )}
      style={{
        width: position !== "full" ? width : "100%",
        height: position !== "full" ? height : "100%",
        opacity,
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0"
      >
        <defs>
          <pattern
            id={`diagonal-stripes-${variant}-${position}`}
            patternUnits="userSpaceOnUse"
            width={stripeWidth * 2}
            height={stripeWidth * 2}
            patternTransform="rotate(45)"
          >
            <rect width={stripeWidth} height={stripeWidth * 2} fill={stripe} />
            <rect x={stripeWidth} width={stripeWidth} height={stripeWidth * 2} fill={bg} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#diagonal-stripes-${variant}-${position})`} />
      </svg>
    </div>
  )
}

/**
 * Industrial tape strip - horizontal or vertical
 */
export function HazardTape({
  className,
  direction = "horizontal",
  variant = "black",
}: {
  className?: string
  direction?: "horizontal" | "vertical"
  variant?: "black" | "white" | "red"
}) {
  const colorMap = {
    black: { stripe: "#2d2d2d", bg: "#ffffff" },
    white: { stripe: "#ffffff", bg: "#2d2d2d" },
    red: { stripe: "#BD0A0A", bg: "#ffffff" },
  }

  const { stripe, bg } = colorMap[variant]
  const stripeWidth = 10

  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden",
        direction === "horizontal" ? "w-full h-4" : "h-full w-4",
        className
      )}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`hazard-tape-${variant}-${direction}`}
            patternUnits="userSpaceOnUse"
            width={stripeWidth * 2}
            height={stripeWidth * 2}
            patternTransform="rotate(45)"
          >
            <rect width={stripeWidth} height={stripeWidth * 2} fill={stripe} />
            <rect x={stripeWidth} width={stripeWidth} height={stripeWidth * 2} fill={bg} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#hazard-tape-${variant}-${direction})`} />
      </svg>
    </div>
  )
}

/**
 * Corner bracket with stripes - mimics Off-White quotation brackets
 */
export function StripedCorner({
  className,
  position = "top-left",
  size = 40,
}: {
  className?: string
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  size?: number
}) {
  const positionMap = {
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0 -scale-x-100",
    "bottom-left": "bottom-0 left-0 -scale-y-100",
    "bottom-right": "bottom-0 right-0 -scale-x-100 -scale-y-100",
  }

  return (
    <div
      className={cn(
        "absolute pointer-events-none",
        positionMap[position],
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Diagonal stripes in corner */}
        <defs>
          <pattern
            id={`corner-stripes-${position}`}
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="8" fill="#2d2d2d" />
            <rect x="4" width="4" height="8" fill="#ffffff" />
          </pattern>
          <clipPath id={`corner-clip-${position}`}>
            <polygon points="0,0 40,0 40,8 8,8 8,40 0,40" />
          </clipPath>
        </defs>
        <rect
          width="40"
          height="40"
          fill={`url(#corner-stripes-${position})`}
          clipPath={`url(#corner-clip-${position})`}
        />
      </svg>
    </div>
  )
}
