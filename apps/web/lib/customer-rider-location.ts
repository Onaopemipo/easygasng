import { one, type SQL } from "./db";
import {
  riderObservation,
  unavailableRiderLocation,
} from "../../../packages/business-rules/src/rider-location";

export async function customerRiderLocation(
  tx: SQL,
  customerId: string,
  orderId: string,
  now = Date.now(),
) {
  if (process.env.EASYGAS_CUSTOMER_RIDER_GPS_ENABLED !== "true")
    return unavailableRiderLocation;

  const point = await one(
    tx,
    `
    SELECT e.payload, e.recorded_at, e.created_at
    FROM orders o
    JOIN branches b ON b.id=o.branch_id AND b.active
    JOIN users u ON u.id=o.driver_id AND u.branch_id=o.branch_id AND u.active AND u.role='driver'
    JOIN LATERAL (
      SELECT driver_id, state, picked_up_at FROM delivery_attempts
      WHERE order_id=o.id ORDER BY assignment_version DESC LIMIT 1
    ) a ON a.driver_id=u.id AND a.state IN ('picked_up','arrived')
    JOIN driver_trips t ON t.driver_id=u.id AND t.branch_id=o.branch_id
      AND t.ended_at IS NULL AND t.location_consent AND t.started_at<=a.picked_up_at
    JOIN LATERAL (
      SELECT payload, recorded_at, created_at FROM trip_events
      WHERE trip_id=t.id AND actor_id=u.id AND kind='gps' AND recorded_at>=a.picked_up_at
      ORDER BY recorded_at DESC, sequence DESC LIMIT 1
    ) e ON true
    WHERE o.id=$1 AND o.customer_id=$2 AND o.status='out_for_delivery'
      AND NOT EXISTS (
        SELECT 1 FROM orders other
        WHERE other.driver_id=u.id AND other.id<>o.id AND other.status='out_for_delivery'
      )
  `,
    [orderId, customerId],
  );
  if (!point) return unavailableRiderLocation;

  // Customer sharing can be shortened independently of dispatch routing.
  const seconds = Number(
    process.env.EASYGAS_CUSTOMER_RIDER_GPS_MAX_AGE_SECONDS ?? 90,
  );
  const freshnessMs =
    (Number.isInteger(seconds) && seconds >= 15 && seconds <= 120
      ? seconds
      : 90) * 1000;
  const fix = riderObservation(
    {
      lat: point.payload?.lat,
      lng: point.payload?.lng,
      accuracy: point.payload?.accuracy,
      recordedAt: new Date(point.recorded_at).toISOString(),
    },
    new Date(point.created_at).toISOString(),
    now,
    freshnessMs,
  );
  return fix
    ? { enabled: true, status: "recent_observation" as const, fix, eta: null }
    : unavailableRiderLocation;
}
