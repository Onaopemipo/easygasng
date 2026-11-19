/** Scroll only the menu viewport, leaving the page and keyboard focus alone. */
export function sidebarScrollTop({
  current,
  viewportTop,
  viewportHeight,
  itemTop,
  itemBottom,
  scrollHeight,
}: {
  current: number;
  viewportTop: number;
  viewportHeight: number;
  itemTop: number;
  itemBottom: number;
  scrollHeight: number;
}) {
  const gap = Math.min(
    8,
    Math.max(0, (viewportHeight - (itemBottom - itemTop)) / 2),
  );
  const top = viewportTop + gap,
    bottom = viewportTop + viewportHeight - gap;
  const delta =
    itemTop < top
      ? itemTop - top
      : itemBottom > bottom
        ? itemBottom - bottom
        : 0;
  return Math.max(0, Math.min(scrollHeight - viewportHeight, current + delta));
}

export function parseSidebarScroll(value: string | null) {
  if (!value?.trim()) return 0;
  const offset = Number(value);
  return Number.isFinite(offset) && offset >= 0 ? offset : 0;
}
