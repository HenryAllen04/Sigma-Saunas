"use client";
import { cn } from "@/lib/utils";
import * as React from "react";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean;
};

export function GlassCard({
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Glassmorphism surface
        "rounded-xl border border-white/10 bg-white/[0.08] backdrop-blur-md",
        // Subtle inner shadow and outer glow to sit on dark ember bg
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_40px_-15px_rgba(255,160,60,0.25)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}


