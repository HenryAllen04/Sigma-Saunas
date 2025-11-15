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
        "surface-glass",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}


