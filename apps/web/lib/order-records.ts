import { type SQL } from "./db";
import { type Actor, digest } from "./auth";
import { canonicalRequest } from "./business-operation";
import { customerRiderLocation } from "./customer-rider-location";
import { unavailableRiderLocation } from "../../../packages/business-rules/src/rider-location";

/** Hydrate only the already-authorised order IDs, with a bounded number of round trips. */
export async function hydrateOrderRecords(
  tx: SQL,
  user: Actor,
  orders: any[],
  staff: boolean,
) {
  if (!orders.length) return orders;
  const ids = orders.map((o) => o.id);
  const dailyRows = staff
    ? (
        await tx.query(
          "SELECT a.order_id,a.state allocation_state,a.grams,a.supplied_grams,r.id run_id,r.state,r.trip_id,f.recorded_at supplied_at,EXISTS(SELECT 1 FROM delivery_photos p WHERE p.order_id=a.order_id AND p.attempt_id=f.attempt_id AND p.actor_id=r.driver_id AND p.consent AND p.retain_until>now() AND octet_length(p.data)>0 AND p.captured_at>=f.recorded_at AND p.created_at>=f.recorded_at) photo_ready FROM daily_delivery_allocations a JOIN daily_delivery_runs r ON r.id=a.run_id LEFT JOIN daily_delivery_refills f ON f.allocation_id=a.id WHERE a.order_id=ANY($1::text[]) AND a.state<>'released'",
          [ids],
        )
      ).rows
    : [];
  const legacyRows = staff
    ? (
        await tx.query(
          "SELECT order_id FROM bulk_lpg_allocations WHERE order_id=ANY($1::text[]) AND state IN ('allocated','dispensed')",
          [ids],
        )
      ).rows
    : [];
  const visitLinks = (
    await tx.query(
      "SELECT l.order_id,l.parent_order_id,p.reference AS parent_reference,c.reference,c.status FROM order_visit_links l JOIN orders p ON p.id=l.parent_order_id JOIN orders c ON c.id=l.order_id WHERE l.order_id=ANY($1::text[]) OR l.parent_order_id=ANY($1::text[])",
      [ids],
    )
  ).rows;
  for (const o of orders) {
    o.visit_link = visitLinks.find((l) => l.order_id === o.id) ?? null;
    o.extra_orders = visitLinks
      .filter((l) => l.parent_order_id === o.id)
      .map((l) => ({
        id: l.order_id,
        reference: l.reference,
        status: l.status,
      }));
  }
  const gas = (
    await tx.query(
      "SELECT * FROM order_gas_lines WHERE order_id=ANY($1::text[])",
      [ids],
    )
  ).rows;
  const items = (
    await tx.query("SELECT * FROM order_items WHERE order_id=ANY($1::text[])", [
      ids,
    ])
  ).rows;
  const events = (
    await tx.query(
      "SELECT order_id,status,note,created_at,version,previous_status FROM order_events WHERE order_id=ANY($1::text[]) ORDER BY created_at",
      [ids],
    )
  ).rows;
  const attempts = (
    await tx.query(
      "SELECT DISTINCT ON(order_id) order_id,id,state,driver_id,assignment_version,picked_up_at,arrived_at,completed_at FROM delivery_attempts WHERE order_id=ANY($1::text[]) ORDER BY order_id,assignment_version DESC",
      [ids],
    )
  ).rows;
  const updates = (
    await tx.query(
      "SELECT order_id,max(created_at) at FROM order_events WHERE order_id=ANY($1::text[]) GROUP BY order_id",
      [ids],
    )
  ).rows;
  const driverIds = [
    ...new Set(orders.map((o) => o.driver_id).filter(Boolean)),
  ];
  const drivers = driverIds.length
    ? (
        await tx.query("SELECT id,name FROM users WHERE id=ANY($1::text[])", [
          driverIds,
        ])
      ).rows
    : [];
  const manifestItems = staff
    ? (
        await tx.query(
          "SELECT order_id,product_id,quantity FROM order_items WHERE order_id=ANY($1::text[]) ORDER BY order_id,product_id",
          [ids],
        )
      ).rows
    : [];
  const serials = staff
    ? (
        await tx.query(
          `SELECT DISTINCT x.order_id,c.serial FROM (
    SELECT order_id,cylinder_id FROM cylinder_allocations WHERE order_id=ANY($1::text[]) AND state='reserved'
    UNION SELECT order_id,cylinder_id FROM order_gas_lines WHERE order_id=ANY($1::text[])
  ) x JOIN cylinders c ON c.id=x.cylinder_id ORDER BY c.serial`,
          [ids],
        )
      ).rows
    : [];
  const attemptIds = attempts.map((a) => a.id);
  const evidence =
    staff && attemptIds.length
      ? (
          await tx.query(
            "SELECT attempt_id,kind,detail,created_at FROM delivery_evidence WHERE attempt_id=ANY($1::text[]) ORDER BY created_at",
            [attemptIds],
          )
        ).rows
      : [];
  const codeIds = !staff
    ? orders
        .filter(
          (o) =>
            !["delivered", "cancelled"].includes(o.status) &&
            o.delivery_code_expires_at &&
            new Date(o.delivery_code_expires_at).getTime() > Date.now(),
        )
        .map((o) => o.id)
    : [];
  const codes = codeIds.length
    ? (
        await tx.query(
          "SELECT DISTINCT ON(related_id) related_id,body FROM notifications WHERE related_id=ANY($1::text[]) AND user_id=$2 AND title='Delivery confirmation code' ORDER BY related_id,created_at DESC",
          [codeIds, user.id],
        )
      ).rows
    : [];
  const activeIds =
    user.role === "driver"
      ? orders
          .filter((o) => ["assigned", "out_for_delivery"].includes(o.status))
          .map((o) => o.id)
      : [];
  const destinations = activeIds.length
    ? (
        await tx.query(
          "SELECT d.order_id,d.branch_id,d.address_hash,d.latitude,d.longitude FROM dispatch_destinations d WHERE d.order_id=ANY($1::text[]) AND d.revision=(SELECT max(revision) FROM dispatch_destinations WHERE order_id=d.order_id)",
          [activeIds],
        )
      ).rows
    : [];
  const group = (rows: any[], key: string) => {
    const map = new Map<string, any[]>();
    for (const row of rows) {
      const list = map.get(row[key]) ?? [];
      list.push(row);
      map.set(row[key], list);
    }
    return map;
  };
  const byGas = group(gas, "order_id"),
    byItems = group(items, "order_id"),
    byManifestItems = group(manifestItems, "order_id"),
    byEvents = group(events, "order_id"),
    bySerials = group(serials, "order_id"),
    byEvidence = group(evidence, "attempt_id");
  const byAttempt = new Map(
    attempts.map(({ order_id, ...a }) => [order_id, a]),
  );
  const byUpdate = new Map(updates.map((u) => [u.order_id, u.at]));
  const byDriver = new Map(drivers.map((d) => [d.id, { name: d.name }]));
  const byCode = new Map(codes.map((c) => [c.related_id, c.body]));
  for (const o of orders) {
    if (codeIds.includes(o.id))
      o.confirmation_code = byCode.get(o.id)?.match(/\b\d{6}\b/)?.[0];
    if (staff) {
      o.daily_run = dailyRows.find((r) => r.order_id === o.id) ?? null;
      o.legacy_lpg = legacyRows.some((r) => r.order_id === o.id);
    }
    o.gas_lines = byGas.get(o.id) ?? [];
    o.attempt = byAttempt.get(o.id);
    o.driver = o.driver_id ? byDriver.get(o.driver_id) : null;
    o.last_update = byUpdate.get(o.id) ?? o.created_at;
    // Keep current per-customer GPS authority/freshness checks; never reuse another customer's fix.
    o.gps =
      !staff && o.status === "out_for_delivery"
        ? await customerRiderLocation(tx, user.id, o.id)
        : unavailableRiderLocation;
    if (
      user.role === "driver" &&
      ["assigned", "out_for_delivery"].includes(o.status)
    ) {
      o.assignment_response_open =
        o.attempt?.state === "assigned" &&
        Boolean(
          o.delivery_code_expires_at &&
            new Date(o.delivery_code_expires_at).getTime() > Date.now(),
        );
      const d = destinations.find(
        (d) =>
          d.order_id === o.id &&
          d.branch_id === o.branch_id &&
          d.address_hash === digest(canonicalRequest(o.address)),
      );
      o.destination = d
        ? { latitude: d.latitude, longitude: d.longitude }
        : undefined;
    }
    const productRows = byItems.get(o.id) ?? [];
    if (staff) {
      o.manifest = {
        items: (byManifestItems.get(o.id) ?? []).map(
          ({ product_id, quantity }) => ({ product_id, quantity }),
        ),
        serials: (bySerials.get(o.id) ?? []).map((s) => s.serial),
        gas: o.gas_lines
          .map(({ id, grams, capacity_grams }: any) => ({
            id,
            grams,
            capacity_grams,
          }))
          .sort((a: any, b: any) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      };
      o.delivery_evidence = (byEvidence.get(o.attempt?.id) ?? []).map(
        ({ attempt_id, ...e }) => e,
      );
    }
    delete o.delivery_code_hash;
    delete o.delivery_code_expires_at;
    o.items = productRows;
    o.events = (byEvents.get(o.id) ?? []).map(({ order_id, ...e }) => e);
  }
  return orders;
}
