"use client";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";
import * as React from "react";

type EmberGlowProps = {
  children: React.ReactNode;
  className?: string;
  rounded?: string;
};

export function EmberGlow({
  children,
  className,
  rounded = "rounded-xl",
}: EmberGlowProps) {
  // Orange/Gold gradient
  const gradient = `
    radial-gradient(circle at 35% 40%, #ff6a00 6%, #ff6a0000 18%),
    radial-gradient(circle at 70% 60%, #ffd34d 8%, #ffd34d00 22%),
    radial-gradient(circle at 50% 50%, #ff9a1f 10%, #ff9a1f00 26%),
    repeating-conic-gradient(
      from 236.84deg at 50% 50%,
      #ff6a00 0%,
      #ffd34d 25%,
      #ff9a1f 50%,
      #ff6a00 75%,
      #ffd34d 100%
    )
  `;

  return (
    <div className={cn("relative", rounded, className)}>
      <GlowingEffect
        glow
        disabled={false}
        blur={14}
        proximity={64}
        spread={28}
        borderWidth={1}
        className=""
        gradient={gradient}
      />
      <div className={cn("relative", rounded)}>{children}</div>
    </div>
  );
}


