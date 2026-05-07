import Image from "next/image"

const SIZE_MAP: Record<string, number> = {
  sm: 80,
  md: 120,
  lg: 160,
  xl: 220,
}

export function HireWireLogo({
  className,
  variant = "dark",
  size = "md",
}: {
  className?: string
  variant?: "dark" | "light"
  size?: "sm" | "md" | "lg" | "xl"
}) {
  const width = SIZE_MAP[size] ?? 120
  const height = Math.round(width * 0.45)

  return (
    <Image
      src="/images/hirewire-logo.png"
      alt="HireWire"
      width={width}
      height={height}
      className={className}
      style={variant === "light" ? { filter: "brightness(0) invert(1)" } : undefined}
      priority
    />
  )
}
