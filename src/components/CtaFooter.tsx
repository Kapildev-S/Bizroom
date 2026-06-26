"use client";

import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";

const CtaFooter = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <section className="relative pt-32 pb-16 px-6 md:px-16 lg:px-24 text-center overflow-hidden bg-background">
      {/* Background HLS Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4" type="video/mp4" />
      </video>

      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: '200px', background: 'linear-gradient(to bottom, hsl(var(--background)), transparent)' }}
      />


      {/* Content */}
      <div className="relative z-10">
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-heading italic text-white tracking-tight leading-[0.85] max-w-3xl mx-auto mb-4">
          Step into finest AI
        </h2>
        <p className="text-white/80 font-body font-light text-sm md:text-base max-w-xl mx-auto mb-8">
          Book a free strategy call. See what AI&#8209;powered design can do. No commitment, no pressure. Just possibilities.
        </p>
        <div className="flex items-center justify-center gap-6">
          <a href="tel:+919655613399" className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white flex items-center gap-2 hover:bg-white/10 transition-all font-body">
            Call Now
            <ArrowUpRight className="h-5 w-5" />
          </a>
          <a href="#pricing" className="bg-white text-black rounded-full px-6 py-3 text-sm font-medium flex items-center gap-2 hover:bg-white/90 transition-colors font-body shadow-lg">
            View Pricing
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>


      </div>
    </section>
  );
};

export default CtaFooter;
