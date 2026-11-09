"use client";
import { LoaderCircle } from "lucide-react";
import React, { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import {
  loaderDesign,
  loaderDimension,
  loaderGeometry,
  loaderProgress,
  type LoaderSize,
  type LoaderMode,
  type LoaderVariant,
} from "../../../packages/business-rules/src/loader-design";
export type EasyGasLoaderProps = {
  size?: LoaderSize | number;
  mode?: LoaderMode;
  progress?: number;
  variant?: LoaderVariant;
  label?: string;
  testID?: string;
  animationDisabled?: boolean;
  operationId?: string;
};
export function EasyGasLoader({
  size = "md",
  mode: requestedMode = "indeterminate",
  progress,
  variant = "inline",
  label = "Loading",
  testID,
  animationDisabled = false,
  operationId = "current",
}: EasyGasLoaderProps) {
  const mode = requestedMode === "determinate" && typeof progress === "number" && Number.isFinite(progress) ? "determinate" : "indeterminate";
  const id = "eg-loader-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const root = useRef<HTMLSpanElement>(null);
  const [paused, setPaused] = useState(false);
  const current = useRef({ operationId, progress: 0 });
  if (current.current.operationId !== operationId)
    current.current = { operationId, progress: 0 };
  const value =
    mode === "determinate"
      ? loaderProgress(progress, current.current.progress)
      : 0.2;
  if (mode === "determinate") current.current.progress = value;
  const geometry = loaderGeometry(value);
  useEffect(() => {
    let inView = true;
    const update = () => setPaused(document.hidden || !inView);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            update();
          });
    if (root.current) observer?.observe(root.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  if (process.env.NEXT_PUBLIC_EASYGAS_BRANDED_LOADER === "false")
    return (
      <span role="status" aria-label={label} className={variant === "inline" ? "eg-loader" : "loading"}
        style={variant === "inline" ? { width: loaderDimension(size), height: loaderDimension(size) } : undefined}>
        <LoaderCircle className="spin" aria-hidden="true" />
      </span>
    );
  return (
    <span
      ref={root}
      className={`eg-loader eg-loader--${variant}`}
      role={mode === "determinate" ? "progressbar" : "status"}
      aria-label={label}
      aria-busy="true"
      aria-valuemin={mode === "determinate" ? 0 : undefined}
      aria-valuemax={mode === "determinate" ? 100 : undefined}
      aria-valuenow={
        mode === "determinate" ? Math.round(value * 100) : undefined
      }
      data-testid={testID}
      data-paused={paused || animationDisabled}
      style={{ "--loader-size": `${loaderDimension(size)}px` } as CSSProperties}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={id + "arc"}>
            <stop stopColor="var(--loader-active)" />
            <stop offset="1" stopColor="var(--loader-end)" />
          </linearGradient>
          <radialGradient id={id + "halo"}>
            <stop stopColor="var(--loader-halo)" stopOpacity=".4" />
            <stop offset="1" stopColor="var(--loader-halo)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id + "flame"} x2="0" y2="1">
            <stop stopColor="var(--loader-orange)" />
            <stop offset="1" stopColor="#ff9600" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill={`url(#${id}halo)`} />
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke="var(--loader-track)"
          strokeWidth="4"
        />
        <circle
          cx="50"
          cy="51"
          r="27"
          fill="var(--loader-halo)"
          opacity=".18"
        />
        <circle cx="50" cy="50" r="26" fill="var(--loader-disc)" />
        <path d={loaderDesign.flame} fill={`url(#${id}flame)`} />
        <g
          className={mode === "indeterminate" ? "eg-loader__orbit" : undefined}
        >
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke={`url(#${id}arc)`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${geometry.dash} ${geometry.circumference}`}
            transform="rotate(-90 50 50)"
            opacity={value === 0 ? 0 : 1}
          />
          {value > 0 && (
            <>
              <circle
                cx={geometry.x}
                cy={geometry.y}
                r="7"
                fill={`url(#${id}halo)`}
              />
              <circle
                cx={geometry.x}
                cy={geometry.y}
                r="3.5"
                fill="var(--loader-disc)"
                stroke="var(--loader-end)"
                strokeWidth=".7"
              />
            </>
          )}
        </g>
      </svg>
    </span>
  );
}
export const PageLoadingFallback = () => (
  <EasyGasLoader size="lg" variant="section" label="Loading page" />
);
export const SectionLoadingFallback = () => (
  <EasyGasLoader variant="section" label="Loading information" />
);
export const ActionLoadingIndicator = ({
  label = "Processing request",
}: {
  label?: string;
}) => <EasyGasLoader size="xs" label={label} />;
export const OverlayLoadingIndicator = () => (
  <EasyGasLoader size="lg" variant="overlay" label="Processing request" />
);
