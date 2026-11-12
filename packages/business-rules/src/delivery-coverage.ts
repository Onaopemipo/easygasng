export const deliveryCoveragePending =
  "Delivery coverage is awaiting confirmation for this area. Choose a confirmed area that matches your address, or contact EasyGas for help.";

export function hasConfirmedDeliveryCoverage(coverage: unknown): boolean {
  return typeof coverage === "string" && coverage.trim().length >= 10;
}
