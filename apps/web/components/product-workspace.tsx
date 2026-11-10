import React from "react";

/** Presentation helpers only: records have already been scoped by the existing API. */
export function ProductHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="product-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function filterSupportTickets<
  T extends { subject?: string; customer_name?: string; status: string },
>(records: T[], search: string, status: string): T[] {
  const query = search.trim().toLocaleLowerCase();
  return records.filter(
    (ticket) =>
      (status === "all" || ticket.status === status) &&
      (!query ||
        `${ticket.subject ?? ""} ${ticket.customer_name ?? ""}`
          .toLocaleLowerCase()
          .includes(query)),
  );
}
