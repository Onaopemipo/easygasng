export const orderPaymentMethods = [
  { value: "card", label: "Card" },
  { value: "cash_on_delivery", label: "Cash on delivery" },
  { value: "wallet", label: "Wallet" },
] as const;
export type OrderPaymentOptions = {
  branchId: string;
  methods: string[];
  balanceKobo: number;
  environment: "test" | "live";
};
export function walletPaymentHint(balance: number, total?: number) {
  if (total !== undefined && total > balance)
    return `Your wallet needs ₦${((total - balance) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more for this total. Top up or choose another available payment method.`;
  return "The full order total is paid from your wallet when you confirm. Your balance is checked again before payment.";
}
