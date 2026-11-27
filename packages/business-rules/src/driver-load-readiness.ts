/** Presentation of scoped custody reads. Server pickup checks remain authoritative. */
export function driverLoadScope(order: any, tripId: string | null) {
  return JSON.stringify([
    order.id,
    order.driver_id,
    order.branch_id,
    order.tracking_version,
    tripId,
    order.legacy_lpg === true,
    order.daily_run
      ? [
          order.daily_run.run_id,
          order.daily_run.state,
          order.daily_run.allocation_state,
          order.daily_run.grams,
          order.daily_run.supplied_grams,
        ]
      : null,
    (order.gas_lines ?? []).map((line: any) => [line.id, line.grams]),
  ]);
}
export function driverGasQuantity(order: any) {
  return (order.gas_lines ?? []).reduce(
    (sum: number, line: any) => sum + Number(line.grams),
    0,
  );
}
export function driverLoadReadiness(
  order: any,
  tripId: string | null,
  summary: any,
) {
  const grams = driverGasQuantity(order);
  if (!order.gas_lines?.length || summary?.required === false)
    return {
      state: "ready",
      message: "Vehicle gas allocation is not required for this order.",
    } as const;
  if (!Number.isSafeInteger(grams) || grams <= 0)
    return {
      state: "blocked",
      message: "Refresh the order to confirm its gas quantity.",
    } as const;
  if (!tripId)
    return {
      state: "missing",
      message:
        "Dispatch must assign a suitable vehicle and start your trip before gas can be allocated.",
    } as const;
  const load = summary?.loads?.find(
    (load: any) =>
      load.trip_id === tripId &&
      load.driver_id === order.driver_id &&
      load.branch_id === order.branch_id &&
      load.allocations?.some(
        (allocation: any) => allocation.order_id === order.id,
      ),
  );
  if (!load)
    return {
      state: "missing",
      message: `Dispatch has not recorded a vehicle gas allocation for this ${grams / 1000} kg order. Ask authorised staff to check the vehicle’s current meter calibration, record the measured load and include this order.`,
    } as const;
  const allocation = load.allocations.find((a: any) => a.order_id === order.id);
  if (allocation.state !== "allocated" || Number(allocation.grams) !== grams)
    return {
      state: "blocked",
      message:
        "The vehicle allocation does not match this order. Ask Dispatch to review it before delivery.",
    } as const;
  if (load.state === "issued")
    return {
      state: "confirm",
      message:
        "Dispatch recorded your vehicle load. Open vehicle gas load, check the actual loaded mass and starting meter reading, then confirm receipt.",
    } as const;
  if (load.state === "active" && load.acknowledged_by === order.driver_id)
    return {
      state: "ready",
      message:
        "Vehicle gas is allocated to this order and your load receipt is confirmed. Check the load below before starting delivery.",
    } as const;
  return {
    state: "blocked",
    message:
      "Vehicle gas custody needs Dispatch review. Held, returning or unconfirmed loads cannot start this delivery.",
  } as const;
}
