// Presentation only. No request, payment, queue or business-state ownership.
export const loaderSizes = { xs: 20, sm: 32, md: 48, lg: 80, xl: 120 } as const;
export type LoaderSize = keyof typeof loaderSizes;
export type LoaderMode = "indeterminate" | "determinate";
export type LoaderVariant = "inline" | "section" | "overlay" | "fullscreen";
export const loaderDesign = {
  duration: 1500,
  radius: 43,
  stroke: 4,
  flame:
    "M50 30 C46 39 35 45 35 55 C35 64 41 69 47 71 C42 64 44 59 50 53 C56 59 58 64 53 71 C59 69 65 64 65 55 C65 45 54 38 50 30 Z",
  light: {
    track: "#d9f9cc",
    active: "#16c600",
    end: "#b6ff00",
    disc: "#ffffff",
    halo: "#99ef68",
    orange: "#ff7900",
  },
  dark: {
    track: "#345b40",
    active: "#65ef83",
    end: "#b6ff00",
    disc: "#102b22",
    halo: "#65ef83",
    orange: "#ff7900",
  },
} as const;
export function loaderDimension(size: LoaderSize | number = "md") {
  return typeof size === "number" && Number.isFinite(size)
    ? Math.min(120, Math.max(16, size))
    : (loaderSizes[size as LoaderSize] ?? loaderSizes.md);
}
export function loaderProgress(value: number | undefined, previous = 0) {
  // Missing/non-finite values cannot manufacture completion. Callers remount or
  // change operationId for a new operation; progress never advances on a timer.
  const valid =
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(1, Math.max(0, value))
      : 0;
  return Math.max(Math.min(1, Math.max(0, Number.isFinite(previous) ? previous : 0)), valid);
}
export function loaderGeometry(progress: number) {
  const circumference = 2 * Math.PI * loaderDesign.radius;
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  return {
    circumference,
    dash: circumference * progress,
    x: 50 + loaderDesign.radius * Math.cos(angle),
    y: 50 + loaderDesign.radius * Math.sin(angle),
  };
}
