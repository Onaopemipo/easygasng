"use client";
import { useEffect, useState } from "react";
import { api, Notice } from "./ui";

export function LPGSetupAccess({ role }: { role: string }) {
  if (role === "owner") return null;
  return (
    <aside className="panel" aria-label="LPG recording permissions">
      <h3>{role === "manager" ? "Service Manager: LPG records are view only" : "LPG recording access"}</h3>
      <p>
        {role === "finance"
          ? "You can issue measured LPG loads when your loading qualification is current. Meter calibration must be renewed by a qualified Business Owner."
          : role === "driver"
            ? "Dispatch records the measured load. You confirm its actual receipt in your driver workspace."
            : "This account can view LPG records but cannot renew meter calibration or issue LPG loads. Those entry forms are unavailable for this role."}
      </p>
      {!["finance", "driver"].includes(role) && <p>
        Ask a qualified Business Owner to open the order and choose Renew meter calibration, then Issue LPG load. Qualified finance staff can also issue loads after calibration is current. Use their own authorised account; your access has not changed.
      </p>}
    </aside>
  );
}

/** Read-only navigation. All recording stays in the canonical scoped order form. */
export function TripLPGOrders({ trip, user }: { trip: any; user: any }) {
  const scope = JSON.stringify([trip.id, trip.driver_id, trip.branch_id, trip.ended_at, user.id, user.role, user.branch_id ?? user.branchId]);
  const [state, setState] = useState<any>(null), [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setState(null);
    if (trip.ended_at || !["owner", "manager", "finance"].includes(user.role)) return;
    api("bulk.summary").then(data => {
      if (live) setState({ scope, orders: (data.orders ?? []).filter((o: any) =>
        o.driver_id === trip.driver_id && o.branch_id === trip.branch_id && ["assigned", "out_for_delivery"].includes(o.status)) });
    }).catch(e => { if (live) setState({ scope, error: e.message }); });
    return () => { live = false; };
  }, [scope, retry]);
  if (trip.ended_at || !["owner", "manager", "finance"].includes(user.role)) return null;
  const current = state?.scope === scope ? state : null;
  return <section className="panel stack" style={{ padding: 24 }} aria-label="Trip LPG setup">
    <h3>Record LPG details for this trip</h3>
    <LPGSetupAccess role={user.role} />
    <p>Open an assigned gas order below. Its Vehicle gas readiness section contains the calibration and load forms for authorised accounts. Trip details shows journey information.</p>
    {!current && <p role="status">Finding this driver’s gas orders…</p>}
    {current?.error && <><Notice type="error" message={current.error} /><button className="button secondary" type="button" onClick={() => setRetry(n => n + 1)}>Retry assigned gas orders</button></>}
    {current?.orders?.length === 0 && <p>No gas orders are awaiting load allocation for this driver in this branch. Existing LPG allocations remain in LPG custody.</p>}
    {current?.orders?.map((o: any) => <a className="button secondary" key={o.id} href={"/admin/orders?orderId=" + encodeURIComponent(o.id)}>
      {user.role === "manager" ? "Open order" : "Record LPG details"} · {o.reference}
    </a>)}
  </section>;
}
