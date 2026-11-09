/** Explicit physical-pickup simulation for isolated legacy regression fixtures. */
export async function verifiedPickup(
  call: (role: string, action: string, input?: any) => Promise<any>,
  orderId: string,
) {
  const order = (await call("driver", "orders")).find(
    (o: any) => o.id === orderId,
  );
  if (!order) throw new Error("Fixture driver must be assigned first.");
  return call("driver", "delivery.pickup", {
    orderId,
    version: order.tracking_version,
    reason:
      "Synthetic fixture physically checked quantities and cylinder serials",
    manifest: order.manifest,
  });
}
