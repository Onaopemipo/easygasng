// Public coverage preference only; never a saved address or checkout authorisation.
export const deliveryAreaEvent = "easygas:delivery-area";
export function readDeliveryArea(identity: string): string {
  try {
    return sessionStorage.getItem("easygas.deliveryArea." + identity) ?? "";
  } catch {
    return "";
  }
}
export function writeDeliveryArea(identity: string, id: string) {
  try {
    sessionStorage.setItem("easygas.deliveryArea." + identity, id);
  } catch {}
  window.dispatchEvent(
    new CustomEvent(deliveryAreaEvent, { detail: { identity, id } }),
  );
}
