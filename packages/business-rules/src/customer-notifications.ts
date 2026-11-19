export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  href?: string | null;
};
export type NotificationPage = {
  items: NotificationItem[];
  total: number;
  unread: number;
  filteredTotal: number;
  page: number;
  pageSize: number;
  generatedAt: string;
};
export function notificationKind(
  item: Pick<NotificationItem, "title" | "body">,
) {
  const title = item.title.toLocaleLowerCase();
  if (
    /(?:confirmation|verification|security|delivery|login|reset|access) code|one[ -]time (?:password|code)|\botp\b/.test(
      title + " " + item.body.toLocaleLowerCase(),
    )
  )
    return "code";
  if (/payment|wallet|refund|credit|invoice|receipt/.test(title))
    return "payment";
  if (/support|reply|ticket/.test(title)) return "support";
  if (/remind|refill/.test(title)) return "reminder";
  if (/order|delivery|dispatch|driver/.test(title)) return "order";
  return "account";
}
export function notificationPreview(
  item: Pick<NotificationItem, "title" | "body">,
) {
  return notificationKind(item) === "code"
    ? "Open this message to view your code and instructions."
    : item.body.replace(/\s+/g, " ").trim();
}
export function notificationTime(value: string, now = Date.now()) {
  const stamp = Date.parse(value);
  if (!Number.isFinite(stamp)) return "Date unavailable";
  const minutes = Math.floor(Math.max(0, now - stamp) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(stamp).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year:
      new Date(stamp).getUTCFullYear() !== new Date(now).getUTCFullYear()
        ? "numeric"
        : undefined,
    timeZone: "Africa/Lagos",
  });
}
export function notificationDestination(href?: string | null) {
  return href &&
    /^\/(?:orders|admin\/orders)\?orderId=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      href,
    )
    ? href
    : null;
}
