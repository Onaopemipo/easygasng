import PaymentRequest from "../../components/payment-request";
export const metadata = {
  title: "Invoice payment request",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <PaymentRequest />;
}
