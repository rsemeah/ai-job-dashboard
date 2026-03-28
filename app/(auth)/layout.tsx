import Image from "next/image"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#CC2229] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#CC2229] to-[#991b1f]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <Image
              src="/images/hirewire-logo.png"
              alt="HireWire"
              width={180}
              height={64}
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-serif font-medium leading-tight">
              Know Before You Apply
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              Stop guessing. HireWire scores opportunities, generates tailored materials, 
              and tracks your pipeline — so you only invest time in roles worth pursuing.
            </p>
            <div className="flex gap-8 text-sm text-white/60">
              <div>
                <div className="text-2xl font-semibold text-white">85%</div>
                <div>Match accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">10x</div>
                <div>Faster prep</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-white">100%</div>
                <div>Evidence-backed</div>
              </div>
            </div>
          </div>
          <div className="text-sm text-white/50">
            Trusted by professionals who value their time.
          </div>
        </div>
      </div>

      {/* Right side - Auth content */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/images/hirewire-logo.png"
              alt="HireWire"
              width={150}
              height={53}
              className="object-contain mx-auto"
              priority
              loading="eager"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
