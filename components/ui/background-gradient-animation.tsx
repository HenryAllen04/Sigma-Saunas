"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export const BackgroundGradientAnimation = ({
  gradientBackgroundStart = "rgb(108, 0, 162)",
  gradientBackgroundEnd = "rgb(0, 17, 82)",
  firstColor = "18, 113, 255",
  secondColor = "221, 74, 255",
  thirdColor = "100, 220, 255",
  fourthColor = "200, 50, 50",
  fifthColor = "180, 180, 50",
  pointerColor = "140, 100, 255",
  size = "80%",
  blendingValue = "hard-light",
  children,
  className,
  interactive = true,
  containerClassName,
  colors,
  blur,
  opacity,
  speed,
  backgroundColor,
  extraBlobs = 8,
  blobScale = 1.25,
  vignetteOpacity = 0.35,
  grainOpacity = 0.08,
}: {
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string | number;
  blendingValue?: string;
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  containerClassName?: string;
  colors?: string[];
  blur?: number;
  opacity?: number;
  speed?: number;
  backgroundColor?: string;
  extraBlobs?: number;
  blobScale?: number;
  vignetteOpacity?: number;
  grainOpacity?: number;
}) => {
  const interactiveRef = useRef<HTMLDivElement>(null);

  const [curX, setCurX] = useState(0);
  const [curY, setCurY] = useState(0);
  const [tgX, setTgX] = useState(0);
  const [tgY, setTgY] = useState(0);
  function hexToRgbList(hex: string): string | null {
    const normalized = hex.trim().replace("#", "");
    if (normalized.length !== 6) return null;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return `${r}, ${g}, ${b}`;
  }

  // Derive overrides from high-level props if provided
  const resolvedBackgroundStart =
    backgroundColor ?? gradientBackgroundStart;
  const resolvedBackgroundEnd =
    backgroundColor ?? gradientBackgroundEnd;

  const resolvedSize =
    typeof size === "number" ? `${size}px` : size;

  // Map colors[] (hex) -> individual RGB variable strings
  const [c1, c2, c3, c4] = Array.isArray(colors) ? colors : [];
  const overrideFirst = c1 ? hexToRgbList(c1) ?? firstColor : firstColor;
  const overrideSecond = c2 ? hexToRgbList(c2) ?? secondColor : secondColor;
  const overrideThird = c3 ? hexToRgbList(c3) ?? thirdColor : thirdColor;
  const overrideFourth = c4 ? hexToRgbList(c4) ?? fourthColor : fourthColor;
  // If a 5th color is provided use it; otherwise reuse second to keep warmth
  const overrideFifth = Array.isArray(colors) && colors[4]
    ? hexToRgbList(colors[4]) ?? fifthColor
    : fifthColor;

  // Build a reusable RGB palette for generating more blobs
  const paletteRgb: string[] = (colors ?? [])
    .map((h) => hexToRgbList(h))
    .filter((v): v is string => Boolean(v));
  if (paletteRgb.length === 0) {
    paletteRgb.push(
      overrideFirst,
      overrideSecond,
      overrideThird,
      overrideFourth,
      overrideFifth
    );
  }

  // Deterministic pseudo-random [0,1) based on integer seed
  function seededRandom(seed: number) {
    const x = Math.sin(seed * 999.733) * 10000;
    return x - Math.floor(x);
  }

  useEffect(() => {
    document.body.style.setProperty(
      "--gradient-background-start",
      resolvedBackgroundStart
    );
    document.body.style.setProperty(
      "--gradient-background-end",
      resolvedBackgroundEnd
    );
    document.body.style.setProperty("--first-color", overrideFirst);
    document.body.style.setProperty("--second-color", overrideSecond);
    document.body.style.setProperty("--third-color", overrideThird);
    document.body.style.setProperty("--fourth-color", overrideFourth);
    document.body.style.setProperty("--fifth-color", overrideFifth);
    document.body.style.setProperty("--pointer-color", pointerColor);
    document.body.style.setProperty("--size", resolvedSize);
    document.body.style.setProperty("--blending-value", blendingValue);
  }, [
    resolvedBackgroundStart,
    resolvedBackgroundEnd,
    overrideFirst,
    overrideSecond,
    overrideThird,
    overrideFourth,
    overrideFifth,
    pointerColor,
    resolvedSize,
    blendingValue,
  ]);

  useEffect(() => {
    function move() {
      if (!interactiveRef.current) {
        return;
      }
      setCurX(curX + (tgX - curX) / 20);
      setCurY(curY + (tgY - curY) / 20);
      interactiveRef.current.style.transform = `translate(${Math.round(
        curX
      )}px, ${Math.round(curY)}px)`;
    }

    move();
  }, [tgX, tgY]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (interactiveRef.current) {
      const rect = interactiveRef.current.getBoundingClientRect();
      setTgX(event.clientX - rect.left);
      setTgY(event.clientY - rect.top);
    }
  };

  const [isSafari, setIsSafari] = useState(false);
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));
  }, []);

  // Ensure CSS variables are present at first paint (SSR-safe) by inlining them
  const cssVarStyle: React.CSSProperties = {
    ["--gradient-background-start" as any]: resolvedBackgroundStart,
    ["--gradient-background-end" as any]: resolvedBackgroundEnd,
    ["--first-color" as any]: overrideFirst,
    ["--second-color" as any]: overrideSecond,
    ["--third-color" as any]: overrideThird,
    ["--fourth-color" as any]: overrideFourth,
    ["--fifth-color" as any]: overrideFifth,
    ["--pointer-color" as any]: pointerColor,
    ["--size" as any]: resolvedSize,
    ["--blending-value" as any]: blendingValue,
  };

  return (
    <div
      className={cn(
        "h-screen w-screen relative overflow-hidden top-0 left-0 bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
        containerClassName
      )}
      style={cssVarStyle}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={cn("", className)}>{children}</div>
      <div
        className={cn(
          "gradients-container h-full w-full blur-lg",
          isSafari ? "blur-2xl" : "[filter:url(#blurMe)_blur(40px)]"
        )}
        style={{
          // Inline filter overrides tailwind filter to allow custom blur
          filter: blur ? `url(#blurMe) blur(${blur}px)` : undefined,
          opacity: typeof opacity === "number" ? opacity : undefined,
        }}
      >
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--first-color),_0.8)_0,_rgba(var(--first-color),_0)_60%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:center_center]`,
            `animate-first`,
            `opacity-100`
          )}
          style={{
            animationDuration: speed ? `${30 / speed}s` : undefined,
          }}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--second-color),_0.8)_0,_rgba(var(--second-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-400px)]`,
            `animate-second`,
            `opacity-100`
          )}
          style={{
            animationDuration: speed ? `${20 / speed}s` : undefined,
          }}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--third-color),_0.8)_0,_rgba(var(--third-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%+400px)]`,
            `animate-third`,
            `opacity-100`
          )}
          style={{
            animationDuration: speed ? `${40 / speed}s` : undefined,
          }}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fourth-color),_0.8)_0,_rgba(var(--fourth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-200px)]`,
            `animate-fourth`,
            `opacity-70`
          )}
          style={{
            animationDuration: speed ? `${40 / speed}s` : undefined,
          }}
        ></div>
        <div
          className={cn(
            `absolute [background:radial-gradient(circle_at_center,_rgba(var(--fifth-color),_0.8)_0,_rgba(var(--fifth-color),_0)_50%)_no-repeat]`,
            `[mix-blend-mode:var(--blending-value)] w-[var(--size)] h-[var(--size)] top-[calc(50%-var(--size)/2)] left-[calc(50%-var(--size)/2)]`,
            `[transform-origin:calc(50%-800px)_calc(50%+800px)]`,
            `animate-fifth`,
            `opacity-100`
          )}
          style={{
            animationDuration: speed ? `${20 / speed}s` : undefined,
          }}
        ></div>
        {/* Extra floating blobs for more dynamic background */}
        {Array.from({ length: Math.max(0, extraBlobs) }).map((_, i) => {
          const rgb = paletteRgb[i % paletteRgb.length] ?? paletteRgb[0];
          const anim =
            i % 5 === 0
              ? "animate-first"
              : i % 5 === 1
              ? "animate-second"
              : i % 5 === 2
              ? "animate-third"
              : i % 5 === 3
              ? "animate-fourth"
              : "animate-fifth";
          const baseDur = i % 5 === 0 ? 30 : i % 5 === 1 ? 20 : i % 5 === 2 ? 40 : i % 5 === 3 ? 40 : 20;
          // Scatter around the viewport (10% to 90%) deterministically
          const topPct = 10 + seededRandom(i + 1) * 80;
          const leftPct = 10 + seededRandom(i + 2) * 80;
          // Vary size and feather radius
          const localSizeScale = (0.8 + seededRandom(i + 3) * 1.0) * blobScale;
          const gradientStop = 40 + Math.round(seededRandom(i + 4) * 20);
          return (
            <div
              key={`extra-blob-${i}`}
              className={cn(
                "absolute",
                `[mix-blend-mode:var(--blending-value)]`,
                anim
              )}
              style={{
                background: `radial-gradient(circle at center, rgba(${rgb}, 0.7) 0%, rgba(${rgb}, 0) ${gradientStop}%) no-repeat`,
                width: `calc(var(--size) * ${localSizeScale})`,
                height: `calc(var(--size) * ${localSizeScale})`,
                top: `${topPct}%`,
                left: `${leftPct}%`,
                transform: "translate(-50%, -50%)",
                opacity: 0.85,
                animationDuration: speed ? `${baseDur / speed}s` : undefined,
              }}
            ></div>
          );
        })}

        {interactive && (
          <div
            ref={interactiveRef}
            onMouseMove={handleMouseMove}
            className={cn(
              `absolute [background:radial-gradient(circle_at_center,_rgba(var(--pointer-color),_0.8)_0,_rgba(var(--pointer-color),_0)_50%)_no-repeat]`,
              `[mix-blend-mode:var(--blending-value)] w-full h-full -top-1/2 -left-1/2`,
              `opacity-70`
            )}
          ></div>
        )}
      </div>
      {/* Vignette overlay for subtle dark edges */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
          mixBlendMode: "multiply",
        }}
      />
      {/* Grain overlay using SVG turbulence */}
      <svg
        className="pointer-events-none absolute inset-0"
        width="100%"
        height="100%"
        aria-hidden="true"
        style={{ opacity: grainOpacity, mixBlendMode: "overlay" }}
      >
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
  );
};
